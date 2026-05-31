import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getInvoices } from '../lib/db'
import { fmtDate } from '../lib/dates'
import { colors, radius, spacing, fonts, typography } from '../theme'
import HamburgerButton from '../components/HamburgerButton'

const STATUS_STYLE = {
  paid:      { hue: colors.success, label: 'Payée' },
  pending:   { hue: colors.signalSoft, label: 'En attente' },
  cancelled: { hue: colors.danger,  label: 'Annulée' },
}
const FILTERS = [
  { key: 'all',       label: 'Toutes' },
  { key: 'pending',   label: 'En attente' },
  { key: 'paid',      label: 'Payées' },
  { key: 'cancelled', label: 'Annulées' },
]

export default function InvoicesScreen({ navigation }) {
  const [invoices, setInvoices] = useState([])
  const [filter, setFilter]     = useState('all')
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const data = await getInvoices()
    setInvoices(data || [])
  }, [])

  useEffect(() => { load().finally(() => setLoading(false)) }, [load])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const filtered = useMemo(() => {
    if (filter === 'all') return invoices
    return invoices.filter(i => i.status === filter)
  }, [invoices, filter])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  return (
    <View style={s.container}>
      <HamburgerButton />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
      >
        <Text style={s.title}>Factures</Text>
        <Text style={s.subtitle}>{filtered.length} / {invoices.length} facture{invoices.length !== 1 ? 's' : ''}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsRow} contentContainerStyle={s.chipsContent}>
          {FILTERS.map(f => {
            const active = filter === f.key
            return (
              <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[s.chip, active && s.chipActive]} activeOpacity={0.7}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {loading ? (
          <View style={s.loading}><ActivityIndicator color={colors.ink} /></View>
        ) : filtered.length === 0 ? (
          <Text style={s.empty}>Aucune facture.</Text>
        ) : filtered.map(inv => {
          const style = STATUS_STYLE[inv.status] || { hue: colors.slate, label: inv.status }
          return (
            <TouchableOpacity
              key={inv.id}
              style={s.card}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: inv.id })}
            >
              <View style={s.row}>
                <Text style={s.num}>{inv.invoice_number || '—'}</Text>
                <View style={[s.badge, { backgroundColor: style.hue + '1A' }]}>
                  <Text style={[s.badgeText, { color: style.hue }]}>{style.label}</Text>
                </View>
              </View>
              <Text style={s.client}>{inv.client_name || '—'}</Text>
              {inv.vehicle_name ? <Text style={s.sub}>{inv.vehicle_name}</Text> : null}
              <Text style={s.dates}>{fmtDate(inv.start_date)} → {fmtDate(inv.end_date)}</Text>
              <View style={s.bottomRow}>
                <Text style={s.amount}>{Number(inv.total_ttc || 0).toLocaleString()} MAD</Text>
                <Text style={s.hint}>Voir →</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  title:     { ...typography.screenTitle, paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: 4 },
  subtitle:  { ...typography.cardSub, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  chipsRow:     { marginBottom: spacing.sm },
  chipsContent: { paddingHorizontal: spacing.md, gap: 8 },
  chip:        { backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive:  { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText:    { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  chipTextActive: { color: colors.canvas, fontFamily: fonts.medium },
  card:    { backgroundColor: colors.white, marginHorizontal: spacing.md, marginBottom: 10, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  num:     { ...typography.cardTitle, flexShrink: 1 },
  client:  { ...typography.cardSub, marginTop: 4 },
  sub:     { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  dates:   { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginTop: 6 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  amount:  { color: colors.ink, fontFamily: fonts.medium, fontSize: 16 },
  hint:    { color: colors.slate, fontSize: 11, fontFamily: fonts.regular },
  badge:     { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11 },
  loading: { paddingVertical: 40, alignItems: 'center' },
  empty:   { color: colors.slate, textAlign: 'center', padding: 40, fontFamily: fonts.regular },
})
