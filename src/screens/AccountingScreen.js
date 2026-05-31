import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getInvoices, getContracts } from '../lib/db'
import { bucketAgedReceivables, computeUtilization, computeAgencyPayout } from '../lib/accounting'
import { useRole } from '../lib/useRole'
import { colors, radius, spacing, fonts, typography } from '../theme'
import HamburgerButton from '../components/HamburgerButton'

function Kpi({ label, value, hint, hue }) {
  return (
    <View style={[s.kpiCard, hue && { borderLeftColor: hue, borderLeftWidth: 3 }]}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value}</Text>
      {hint ? <Text style={s.kpiHint}>{hint}</Text> : null}
    </View>
  )
}

function Bar({ label, pct, valueLabel }) {
  return (
    <View style={s.barRow}>
      <View style={s.barLabelRow}>
        <Text style={s.barLabel} numberOfLines={1}>{label}</Text>
        <Text style={s.barValue}>{valueLabel}</Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${Math.max(2, Math.min(100, pct))}%` }]} />
      </View>
    </View>
  )
}

export default function AccountingScreen({ navigation }) {
  const { isAdmin } = useRole()
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [payout, setPayout]     = useState(null)
  const [agedRcv, setAgedRcv]   = useState(null)
  const [util, setUtil]         = useState([])

  const load = useCallback(async () => {
    const [p, invoices, contracts] = await Promise.all([
      computeAgencyPayout().catch(() => null),
      getInvoices().catch(() => []),
      getContracts().catch(() => []),
    ])
    setPayout(p)
    setAgedRcv(bucketAgedReceivables((invoices || []).filter(i => i.status === 'pending')))
    setUtil(computeUtilization(contracts || []))
  }, [])

  useEffect(() => { load().finally(() => setLoading(false)) }, [load])
  useFocusEffect(useCallback(() => { load() }, [load]))
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  if (!isAdmin) {
    return (
      <View style={s.container}>
        <Text style={s.title}>Comptabilité</Text>
        <View style={[s.warning, { marginHorizontal: spacing.md, marginTop: spacing.md }]}>
          <Text style={s.warningText}>Réservé aux administrateurs.</Text>
        </View>
      </View>
    )
  }

  const fmt = (n) => `${Number(n || 0).toLocaleString('fr-FR')} MAD`

  return (
    <View style={s.container}>
      <HamburgerButton />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
      >
        <Text style={s.title}>Comptabilité</Text>
        <Text style={s.subtitle}>Données calculées en local</Text>

        {loading ? (
          <View style={s.center}><ActivityIndicator color={colors.ink} /></View>
        ) : (
          <>
            <Text style={s.section}>Compte de résultat</Text>
            <View style={s.cardsRow}>
              <Kpi label="Revenus"  value={fmt(payout?.totalRevenue)}  hue={colors.success} />
              <Kpi label="Charges"  value={fmt(payout?.totalExpenses)} hue={colors.danger} />
              <Kpi label="Net"      value={fmt(payout?.netPayout)}      hue={colors.ink} />
            </View>

            <Text style={s.section}>Créances clients (factures en attente)</Text>
            <View style={s.agedCard}>
              <Row label="≤ 30 jours"   value={fmt(agedRcv?.current)} count={agedRcv?.count?.current} />
              <Row label="31–60 jours"  value={fmt(agedRcv?.mid)}     count={agedRcv?.count?.mid}     />
              <Row label="61–90 jours"  value={fmt(agedRcv?.late)}    count={agedRcv?.count?.late}    />
              <Row label="> 90 jours"   value={fmt(agedRcv?.overdue)} count={agedRcv?.count?.overdue} hue={colors.danger} />
            </View>

            <Text style={s.section}>Utilisation du parc (ce mois)</Text>
            <View style={s.utilCard}>
              {util.length === 0 ? (
                <Text style={s.empty}>Aucun contrat clôturé ce mois.</Text>
              ) : util.map(v => (
                <Bar key={v.vehicleId} label={v.label} pct={v.pct} valueLabel={`${v.days} j (${v.pct}%)`} />
              ))}
            </View>

            <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg, gap: 8 }}>
              <TouchableOpacity style={s.actionRow} onPress={() => navigation.navigate('Deposits')}>
                <Text style={s.actionLabel}>Cautions</Text>
                <Text style={s.actionArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionRow} onPress={() => navigation.navigate('Bilan')}>
                <Text style={s.actionLabel}>Bilan / Payout</Text>
                <Text style={s.actionArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

function Row({ label, value, count, hue }) {
  return (
    <View style={s.aRow}>
      <Text style={s.aLabel}>{label}{count ? `  (${count})` : ''}</Text>
      <Text style={[s.aValue, hue && { color: hue }]}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  center: { paddingVertical: 40, alignItems: 'center' },
  title:     { ...typography.screenTitle, paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: 4 },
  subtitle:  { ...typography.cardSub, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  section:   { ...typography.eyebrow, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: 8 },

  cardsRow:  { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md },
  kpiCard:   { flex: 1, backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 12, borderLeftColor: 'transparent', borderLeftWidth: 3 },
  kpiLabel:  { fontFamily: fonts.regular, fontSize: 11, color: colors.slate },
  kpiValue:  { fontFamily: fonts.bold, fontSize: 16, color: colors.ink, marginTop: 4 },
  kpiHint:   { fontFamily: fonts.regular, fontSize: 10, color: colors.slate, marginTop: 4 },

  agedCard:  { backgroundColor: colors.white, marginHorizontal: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  aRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  aLabel:    { fontFamily: fonts.regular, fontSize: 13, color: colors.slate },
  aValue:    { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },

  utilCard:  { backgroundColor: colors.white, marginHorizontal: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 10 },
  empty:     { color: colors.slate, textAlign: 'center', fontFamily: fonts.regular, padding: 20 },

  barRow:    { gap: 4 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel:  { fontFamily: fonts.regular, fontSize: 12, color: colors.ink, flex: 1, marginRight: 8 },
  barValue:  { fontFamily: fonts.medium, fontSize: 11, color: colors.slate },
  barTrack:  { height: 6, backgroundColor: colors.softBone, borderRadius: 3, overflow: 'hidden' },
  barFill:   { height: '100%', backgroundColor: colors.ink },

  warning: { backgroundColor: '#FFF6E6', borderColor: '#F59E0B55', borderWidth: 1, borderRadius: radius.card, padding: 12 },
  warningText: { color: '#92400E', fontFamily: fonts.medium, fontSize: 13 },

  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  actionLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  actionArrow: { color: colors.dustTaupe, fontSize: 20 },
})
