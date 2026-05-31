import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Modal, Pressable, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { getNetworkIncoming, setNetworkRequestStatus, revealNetworkRequest } from '../lib/db'
import { useRole } from '../lib/useRole'
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

export default function NetworkIncomingScreen({ navigation }) {
  const { isAdmin } = useRole()
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [approving, setApproving] = useState(null)
  const [ownerNotes, setOwnerNotes] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await getNetworkIncoming()
      setRequests(Array.isArray(r?.requests) ? r.requests : [])
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Chargement impossible')
      setRequests([])
    }
  }, [])

  useEffect(() => { load().finally(() => setLoading(false)) }, [load])
  useFocusEffect(useCallback(() => { load() }, [load]))
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  async function applyStatus(id, status, notes) {
    try {
      await setNetworkRequestStatus(id, status, notes || undefined)
      await load()
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Action impossible')
    }
  }

  function reject(id) {
    Alert.alert('Rejeter cette demande ?', '', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Rejeter', style: 'destructive', onPress: () => applyStatus(id, 'REJECTED') },
    ])
  }

  function complete(id) {
    Alert.alert('Marquer comme terminée ?', '', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', onPress: () => applyStatus(id, 'COMPLETED') },
    ])
  }

  async function reveal(id) {
    try {
      const r = await revealNetworkRequest(id)
      const v = r?.vehicle || {}
      Alert.alert('Coordonnées', [
        `Agence : ${v.agency_name || '—'}`,
        v.agency_phone ? `Tél : ${v.agency_phone}` : null,
        v.agency_email ? `Email : ${v.agency_email}` : null,
        v.plate_number ? `Plaque : ${v.plate_number}` : null,
      ].filter(Boolean).join('\n'))
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Coordonnées indisponibles')
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Demandes reçues</Text>
        <HamburgerButton inline />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
      >
        {!isAdmin && (
          <View style={s.warning}>
            <Text style={s.warningText}>Lecture seule — les approbations/refus sont réservés aux administrateurs.</Text>
          </View>
        )}
        {loading ? (
          <View style={s.center}><ActivityIndicator color={colors.ink} /></View>
        ) : requests.length === 0 ? (
          <Text style={s.empty}>Aucune demande entrante.</Text>
        ) : requests.map(r => {
          const style = STATUS_STYLE[r.status] || { hue: colors.slate, label: r.status }
          const v = r.vehicle || {}
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
              {r.requester_notes ? <Text style={s.notes}>Note : {r.requester_notes}</Text> : null}

              {isAdmin && (
                <View style={s.actions}>
                  {r.status === 'PENDING' && (
                    <>
                      <TouchableOpacity style={s.btnApprove} onPress={() => setApproving(r)}>
                        <Text style={s.btnApproveText}>Approuver</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.btnGhost} onPress={() => reject(r.id)}>
                        <Text style={s.btnGhostText}>Rejeter</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {r.status === 'APPROVED' && (
                    <>
                      <TouchableOpacity style={s.btnApprove} onPress={() => complete(r.id)}>
                        <Text style={s.btnApproveText}>Marquer terminé</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.btnSecondary} onPress={() => reveal(r.id)}>
                        <Text style={s.btnSecondaryText}>Coordonnées</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>

      <Modal visible={!!approving} transparent animationType="slide" onRequestClose={() => setApproving(null)}>
        <Pressable style={s.modalBackdrop} onPress={() => setApproving(null)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={s.modalTitle}>Approuver la demande</Text>
            <Text style={s.label}>Note (optionnel)</Text>
            <TextInput
              value={ownerNotes}
              onChangeText={setOwnerNotes}
              placeholder="Lieu de récupération, conditions…"
              placeholderTextColor={colors.dustTaupe}
              multiline
              style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
            />
            <TouchableOpacity style={s.modalApprove} onPress={async () => {
              const id = approving.id
              setApproving(null)
              await applyStatus(id, 'APPROVED', ownerNotes)
              setOwnerNotes('')
            }}>
              <Text style={s.modalApproveText}>Confirmer l'approbation</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  center: { paddingVertical: 40, alignItems: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.ink, fontSize: 22, width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  warning: { backgroundColor: '#FFF6E6', borderColor: '#F59E0B55', borderWidth: 1, borderRadius: radius.card, padding: 12, marginBottom: 12 },
  warningText: { color: '#92400E', fontFamily: fonts.medium, fontSize: 12 },
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
  btnApprove: { flex: 1, backgroundColor: colors.success, paddingVertical: 10, borderRadius: radius.button, alignItems: 'center' },
  btnApproveText: { color: colors.white, fontFamily: fonts.bold, fontSize: 13 },
  btnSecondary: { flex: 1, backgroundColor: colors.ink, paddingVertical: 10, borderRadius: radius.button, alignItems: 'center' },
  btnSecondaryText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 13 },
  btnGhost: { flex: 1, borderWidth: 1, borderColor: colors.danger + '66', paddingVertical: 10, borderRadius: radius.button, alignItems: 'center' },
  btnGhostText: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.canvas, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: spacing.lg, paddingBottom: spacing.xl },
  modalTitle: { ...typography.sectionTitle, fontSize: 18, marginBottom: spacing.md },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginBottom: 6 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: fonts.regular, color: colors.ink },
  modalApprove: { marginTop: spacing.md, backgroundColor: colors.success, paddingVertical: 13, borderRadius: radius.button, alignItems: 'center' },
  modalApproveText: { color: colors.white, fontFamily: fonts.bold, fontSize: 14 },
})
