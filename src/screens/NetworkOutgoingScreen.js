import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { getNetworkOutgoing, setNetworkRequestStatus, revealNetworkRequest } from '../lib/db'
import { fmtDate } from '../lib/dates'
import { colors, radius, spacing, fonts, typography } from '../theme'
import HamburgerButton from '../components/HamburgerButton'

const STATUS_STYLE = {
  PENDING:   { hue: colors.signalSoft, label: 'En attente' },
  APPROVED:  { hue: colors.success,    label: 'Approuvée' },
  REJECTED:  { hue: colors.danger,     label: 'Refusée' },
  COMPLETED: { hue: colors.slate,      label: 'Terminée' },
  CANCELLED: { hue: colors.slate,      label: 'Annulée' },
}

export default function NetworkOutgoingScreen({ navigation }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await getNetworkOutgoing()
      setRequests(Array.isArray(r?.requests) ? r.requests : [])
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Chargement impossible')
      setRequests([])
    }
  }, [])

  useEffect(() => { load().finally(() => setLoading(false)) }, [load])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  async function cancel(id) {
    Alert.alert('Annuler la demande', 'Confirmer ?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Annuler', style: 'destructive', onPress: async () => {
        try { await setNetworkRequestStatus(id, 'CANCELLED'); await load() }
        catch (e) { Alert.alert('Erreur', e?.message || 'Action impossible') }
      } },
    ])
  }

  async function reveal(id) {
    try {
      const r = await revealNetworkRequest(id)
      const v = r?.vehicle || {}
      const lines = [
        `Agence : ${v.agency_name || '—'}`,
        v.agency_phone ? `Tél : ${v.agency_phone}` : null,
        v.agency_email ? `Email : ${v.agency_email}` : null,
        v.agency_city  ? `Ville : ${v.agency_city}` : null,
        v.agency_address ? `Adresse : ${v.agency_address}` : null,
        v.plate_number ? `Plaque : ${v.plate_number}` : null,
      ].filter(Boolean).join('\n')
      Alert.alert('Coordonnées', lines || 'Aucune information.')
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Coordonnées indisponibles')
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Mes demandes</Text>
        <HamburgerButton inline />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
      >
        {loading ? (
          <View style={s.center}><ActivityIndicator color={colors.ink} /></View>
        ) : requests.length === 0 ? (
          <Text style={s.empty}>Aucune demande sortante.</Text>
        ) : requests.map(r => {
          const style = STATUS_STYLE[r.status] || { hue: colors.slate, label: r.status }
          const v = r.vehicles || {}
          return (
            <View key={r.id} style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.brand}>{`${v.brand || ''} ${v.model || ''}`.trim() || '—'}</Text>
                <View style={[s.badge, { backgroundColor: style.hue + '1A' }]}>
                  <Text style={[s.badgeText, { color: style.hue }]}>{style.label}</Text>
                </View>
              </View>
              <Text style={s.meta}>{fmtDate(r.start_date)} → {fmtDate(r.end_date)}</Text>
              {r.agreed_price ? <Text style={s.price}>{Number(r.agreed_price).toLocaleString()} MAD</Text> : null}
              {r.owner_notes ? <Text style={s.notes}>Note propriétaire : {r.owner_notes}</Text> : null}

              <View style={s.actions}>
                {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                  <TouchableOpacity style={s.btnGhost} onPress={() => cancel(r.id)}>
                    <Text style={s.btnGhostText}>Annuler</Text>
                  </TouchableOpacity>
                )}
                {(r.status === 'APPROVED' || r.status === 'COMPLETED') && (
                  <TouchableOpacity style={s.btnPrimary} onPress={() => reveal(r.id)}>
                    <Text style={s.btnPrimaryText}>Voir les coordonnées</Text>
                  </TouchableOpacity>
                )}
              </View>
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
  empty: { color: colors.slate, textAlign: 'center', padding: 40, fontFamily: fonts.regular },
  card: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, flex: 1 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11 },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginTop: 6 },
  price: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginTop: 6 },
  notes: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginTop: 8, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnPrimary: { flex: 1, backgroundColor: colors.ink, paddingVertical: 10, borderRadius: radius.button, alignItems: 'center' },
  btnPrimaryText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 13 },
  btnGhost: { flex: 1, borderWidth: 1, borderColor: colors.danger + '66', paddingVertical: 10, borderRadius: radius.button, alignItems: 'center' },
  btnGhostText: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13 },
})
