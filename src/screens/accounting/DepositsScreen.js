import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { getDeposits, releaseDeposit, forfeitDeposit } from '../../lib/db'
import { fmtDate } from '../../lib/dates'
import { colors, radius, spacing, fonts, typography } from '../../theme'

const STATUS_STYLE = {
  held:       { hue: colors.signalSoft, label: 'Conservée' },
  released:   { hue: colors.success,    label: 'Libérée' },
  forfeited:  { hue: colors.danger,     label: 'Confisquée' },
}
const FILTERS = [
  { key: 'all',       label: 'Toutes' },
  { key: 'held',      label: 'Conservées' },
  { key: 'released',  label: 'Libérées' },
  { key: 'forfeited', label: 'Confisquées' },
]

export default function DepositsScreen({ navigation }) {
  const [filter, setFilter] = useState('all')
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [acting, setActing] = useState(null)

  const load = useCallback(async () => {
    const data = await getDeposits(filter === 'all' ? null : filter)
    setDeposits(data || [])
  }, [filter])

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)) }, [load])
  useFocusEffect(useCallback(() => { load() }, [load]))
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  function doRelease(id, label) {
    Alert.alert('Libérer la caution', `Libérer la caution ${label} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Libérer', onPress: async () => {
        setActing(id)
        try { await releaseDeposit(id); await load() }
        catch (e) { Alert.alert('Erreur', e?.message || 'Action impossible') }
        finally { setActing(null) }
      } },
    ])
  }

  function doForfeit(id, label) {
    Alert.alert('Confisquer la caution', `Confisquer ${label} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confisquer', style: 'destructive', onPress: async () => {
        setActing(id)
        try { await forfeitDeposit(id); await load() }
        catch (e) { Alert.alert('Erreur', e?.message || 'Action impossible') }
        finally { setActing(null) }
      } },
    ])
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Cautions</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md, marginBottom: spacing.sm }} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8 }}>
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
          <View style={s.center}><ActivityIndicator color={colors.ink} /></View>
        ) : deposits.length === 0 ? (
          <Text style={s.empty}>Aucune caution.</Text>
        ) : deposits.map(d => {
          const style = STATUS_STYLE[d.status] || { hue: colors.slate, label: d.status }
          const clientName = d.contracts?.client_name || d.client_name || '—'
          const vehicleName = d.contracts?.vehicle_name || d.vehicle_name || '—'
          return (
            <View key={d.id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.brand}>{clientName}</Text>
                <View style={[s.badge, { backgroundColor: style.hue + '1A' }]}>
                  <Text style={[s.badgeText, { color: style.hue }]}>{style.label}</Text>
                </View>
              </View>
              <Text style={s.meta}>{vehicleName}</Text>
              <Text style={s.meta}>{fmtDate(d.held_at || d.created_at)}{d.released_at ? ` → libérée le ${fmtDate(d.released_at)}` : ''}</Text>
              <Text style={s.amount}>{Number(d.amount || 0).toLocaleString()} MAD</Text>
              {d.notes ? <Text style={s.notes}>{d.notes}</Text> : null}

              {d.status === 'held' && (
                <View style={s.actions}>
                  <TouchableOpacity disabled={acting === d.id} onPress={() => doRelease(d.id, clientName)} style={s.btnPrimary} activeOpacity={0.8}>
                    <Text style={s.btnPrimaryText}>Libérer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={acting === d.id} onPress={() => doForfeit(d.id, clientName)} style={s.btnGhost} activeOpacity={0.8}>
                    <Text style={s.btnGhostText}>Confisquer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  center: { paddingVertical: 40, alignItems: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.ink, fontSize: 22, width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 17, color: colors.ink },

  chip: { backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.slate, fontFamily: fonts.regular, fontSize: 12 },
  chipTextActive: { color: colors.canvas, fontFamily: fonts.medium },

  empty: { color: colors.slate, textAlign: 'center', padding: 40, fontFamily: fonts.regular },
  card: { backgroundColor: colors.white, marginHorizontal: spacing.md, marginBottom: 10, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, flex: 1 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11 },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginTop: 4 },
  amount: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink, marginTop: 8 },
  notes: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginTop: 8, fontStyle: 'italic' },

  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnPrimary: { flex: 1, backgroundColor: colors.success, paddingVertical: 10, borderRadius: radius.button, alignItems: 'center' },
  btnPrimaryText: { color: colors.white, fontFamily: fonts.bold, fontSize: 13 },
  btnGhost: { flex: 1, borderWidth: 1, borderColor: colors.danger + '66', paddingVertical: 10, borderRadius: radius.button, alignItems: 'center' },
  btnGhostText: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13 },
})
