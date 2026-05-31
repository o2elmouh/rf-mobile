import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native'
import { getActiveContracts } from '../../lib/db'
import { fmtDate } from '../../lib/dates'
import { colors, radius, spacing, fonts, typography } from '../../theme'

export default function RestitutionPickerScreen({ navigation }) {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    const data = await getActiveContracts()
    setContracts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handlePick = (contract) => {
    navigation.navigate('RestitutionWizard', { contract })
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    )
  }

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={s.title}>Restitution</Text>
        <Text style={s.subtitle}>Sélectionnez le contrat à clôturer</Text>
      </View>

      {contracts.length === 0 ? (
        <View style={s.emptyContainer}>
          <Text style={s.emptyIcon}>🚗</Text>
          <Text style={s.emptyText}>Aucun contrat actif</Text>
          <Text style={s.emptyHint}>Tous les véhicules sont disponibles</Text>
        </View>
      ) : (
        contracts.map(c => (
          <TouchableOpacity key={c.id} style={s.card} onPress={() => handlePick(c)} activeOpacity={0.75}>
            <View style={s.cardTop}>
              <Text style={s.contractNum}>{c.contract_number || '—'}</Text>
              <View style={s.badge}><Text style={s.badgeText}>Actif</Text></View>
            </View>
            <Text style={s.clientName}>{c.client_name || '—'}</Text>
            <Text style={s.vehicleName}>{c.vehicle_name || c.vehicle_brand || '—'}</Text>
            <View style={s.dateRow}>
              <Text style={s.dateLabel}>Départ</Text>
              <Text style={s.dateValue}>{fmtDate(c.pickup_date)}</Text>
              <Text style={s.dateSep}>→</Text>
              <Text style={s.dateLabel}>Retour prévu</Text>
              <Text style={s.dateValue}>{fmtDate(c.return_date)}</Text>
            </View>
            <View style={s.cardFooter}>
              <Text style={s.amount}>{Number(c.total_amount || 0).toLocaleString()} MAD</Text>
              <Text style={s.cta}>Restituer →</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.canvas },
  center:         { flex: 1, backgroundColor: colors.canvas, justifyContent: 'center', alignItems: 'center' },
  header:         { padding: spacing.lg, paddingTop: 56 },
  backBtn:        { marginBottom: 12 },
  backText:       { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  title:          { ...typography.screenTitle },
  subtitle:       { ...typography.cardSub, marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyIcon:      { fontSize: 48, marginBottom: 16 },
  emptyText:      { color: colors.ink, fontFamily: fonts.medium, fontSize: 17 },
  emptyHint:      { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, marginTop: 6 },
  card:           { backgroundColor: colors.white, marginHorizontal: spacing.md, marginBottom: 12, borderRadius: radius.card, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  contractNum:    { ...typography.cardTitle },
  badge:          { backgroundColor: 'rgba(30,127,58,0.10)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText:      { color: colors.success, fontFamily: fonts.bold, fontSize: 11 },
  clientName:     { color: colors.ink, fontFamily: fonts.medium, fontSize: 14, marginBottom: 2 },
  vehicleName:    { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, marginBottom: 10 },
  dateRow:        { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  dateLabel:      { color: colors.slate, fontFamily: fonts.regular, fontSize: 11 },
  dateValue:      { color: colors.ink, fontFamily: fonts.medium, fontSize: 12 },
  dateSep:        { color: colors.slate, fontSize: 12 },
  cardFooter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount:         { color: colors.ink, fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.3 },
  cta:            { color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },
})
