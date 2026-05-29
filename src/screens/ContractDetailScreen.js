import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Linking, ActivityIndicator, Alert, Modal, Pressable, TextInput, Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import {
  getContractById, extendContract, finalizeContract, getSignedPdfUrl,
  getUnsignedPdfBase64, sendContractWhatsApp, sendContractEmail,
  updateLeadStatus,
} from '../lib/db'
import { fmtDate, normalizeDate } from '../lib/dates'
import { useRole } from '../lib/useRole'
import {
  colors, radius, spacing, fonts, typography, input,
  btnPrimary, btnPrimaryText, btnSecondary, btnSecondaryText,
} from '../theme'

const STATUS_STYLE = {
  active:    { hue: colors.success,    label: 'Actif' },
  closed:    { hue: colors.slate,      label: 'Clôturé' },
  draft:     { hue: colors.signalSoft, label: 'Brouillon' },
  cancelled: { hue: colors.danger,     label: 'Annulé' },
}

export default function ContractDetailScreen({ route, navigation }) {
  const { contractId } = route.params
  const { isAdmin }    = useRole()

  const [contract, setContract] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [extendOpen, setExtendOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const c = await getContractById(contractId)
    setContract(c)
    setLoading(false)
  }
  useEffect(() => { load() }, [contractId])

  useEffect(() => {
    if (route?.params?.openExtendWithPrefill !== undefined) {
      setExtendOpen(true)
    }
  }, [route?.params?.openExtendWithPrefill])

  const openSignedPdf = async () => {
    setBusy(true)
    try {
      const { url } = await getSignedPdfUrl(contractId)
      if (!url) throw new Error('Aucune URL signée disponible')
      // Linking opens the system browser — works without a fresh native rebuild.
      await Linking.openURL(url)
    } catch (e) {
      Alert.alert('Erreur', e?.body?.error || e?.message || "Impossible d'ouvrir le PDF.")
    } finally { setBusy(false) }
  }

  const handleFinalize = () => {
    Alert.alert(
      'Finaliser le contrat',
      'Cette action verrouille le contrat et génère la facture.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Finaliser', style: 'destructive', onPress: async () => {
            setBusy(true)
            try {
              await finalizeContract(contractId)
              await load()
              Alert.alert('Contrat finalisé')
            } catch (e) {
              Alert.alert('Erreur', e?.body?.error || e?.message || 'Échec.')
            } finally { setBusy(false) }
          },
        },
      ],
    )
  }

  const sendForSignature = async (channel) => {
    // channel: 'whatsapp' | 'email'
    const phone = contract.client?.phone
    const email = contract.client?.email
    if (channel === 'whatsapp' && !phone) {
      Alert.alert('Téléphone manquant', "Ce client n'a pas de numéro de téléphone."); return
    }
    if (channel === 'email' && !email) {
      Alert.alert('Email manquant', "Ce client n'a pas d'email."); return
    }
    setBusy(true)
    try {
      const { pdf_base64 } = await getUnsignedPdfBase64(contractId)
      if (!pdf_base64) throw new Error('PDF vide reçu du serveur.')
      if (channel === 'whatsapp') {
        await sendContractWhatsApp(contractId, pdf_base64)
        Alert.alert('Envoyé par WhatsApp', 'Le client recevra un lien sécurisé pour signer.')
      } else {
        await sendContractEmail(contractId, pdf_base64)
        Alert.alert('Envoyé par email', 'Le client recevra un lien sécurisé pour signer.')
      }
      await load()
    } catch (e) {
      Alert.alert(
        'Erreur',
        e?.body?.error || e?.message || "L'envoi a échoué.",
      )
    } finally { setBusy(false) }
  }

  const handleSendWhatsapp = () => sendForSignature('whatsapp')
  const handleSendEmail    = () => sendForSignature('email')

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator color={colors.ink} size="large" />
      </View>
    )
  }
  if (!contract) {
    return (
      <View style={s.loadingWrap}>
        <Text style={s.empty}>Contrat introuvable</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={btnSecondary}>
          <Text style={btnSecondaryText}>← Retour</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const style = STATUS_STYLE[contract.status] || { hue: colors.slate, label: contract.status }
  const phone = contract.client?.phone

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Text style={s.headerBack}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.headerTitle} numberOfLines={1}>{contract.contract_number || 'Contrat'}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: style.hue + '1A' }]}>
          <Text style={[s.badgeText, { color: style.hue }]}>{style.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Client card */}
        <View style={s.card}>
          <Text style={s.eyebrowText}>CLIENT</Text>
          <Text style={s.cardTitle}>{contract.client_name || '—'}</Text>
          {contract.client?.id_number ? <Text style={s.cardSub}>CIN/Pièce : {contract.client.id_number}</Text> : null}
          {contract.client?.email     ? <Text style={s.cardSub}>{contract.client.email}</Text> : null}
          {phone ? (
            <View style={s.rowBtns}>
              <TouchableOpacity style={s.iconBtn} onPress={() => Linking.openURL(`tel:${phone}`)}>
                <Text style={s.iconBtnText}>📞  {phone}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.iconBtn}
                onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`)}
              >
                <Text style={s.iconBtnText}>💬</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Vehicle card */}
        <View style={s.card}>
          <Text style={s.eyebrowText}>VÉHICULE</Text>
          <Text style={s.cardTitle}>{contract.vehicle_label}</Text>
          {contract.vehicle?.year ? <Text style={s.cardSub}>{contract.vehicle.year}</Text> : null}
        </View>

        {/* Period & money */}
        <View style={s.card}>
          <Text style={s.eyebrowText}>PÉRIODE</Text>
          <Row label="Départ"     value={fmtDate(contract.pickup_date)} />
          <Row label="Retour prévu" value={fmtDate(contract.return_date)} />
          {contract.actual_return_date ? <Row label="Retour effectif" value={fmtDate(contract.actual_return_date)} /> : null}
          <Row label="Durée"      value={`${contract.total_days || 0} jour${(contract.total_days || 0) > 1 ? 's' : ''}`} />
          <Row label="Tarif/jour" value={`${Number(contract.daily_rate || 0).toLocaleString()} MAD`} />
        </View>

        {/* Total stadium */}
        <View style={s.totalStadium}>
          <Text style={s.totalLabel}>MONTANT TOTAL</Text>
          <Text style={s.totalValue}>{Number(contract.total_amount || 0).toLocaleString()} MAD</Text>
        </View>

        {/* Actions */}
        <Text style={[s.eyebrowText, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>ACTIONS</Text>

        {contract.status === 'active' && (
          <TouchableOpacity
            style={btnPrimary}
            onPress={() => navigation.navigate('RestitutionWizard', { contract })}
            activeOpacity={0.85}
          >
            <Text style={btnPrimaryText}>Restituer le véhicule</Text>
          </TouchableOpacity>
        )}

        {(contract.status === 'active' || contract.status === 'draft') && (
          <TouchableOpacity style={btnSecondary} onPress={() => setExtendOpen(true)} activeOpacity={0.85}>
            <Text style={btnSecondaryText}>Étendre la durée</Text>
          </TouchableOpacity>
        )}

        {contract.signed_pdf_path && (
          <TouchableOpacity style={btnSecondary} onPress={openSignedPdf} disabled={busy} activeOpacity={0.85}>
            <Text style={btnSecondaryText}>{busy ? 'Ouverture…' : 'Voir le contrat signé (PDF)'}</Text>
          </TouchableOpacity>
        )}

        {contract.signature_status && (
          <View style={s.signatureBanner}>
            <Text style={s.signatureLabel}>SIGNATURE</Text>
            <Text style={s.signatureValue}>
              {contract.signature_status === 'signed'  ? '✓ Signé par le client'
              : contract.signature_status === 'pending' ? '⏳ En attente de signature'
              : contract.signature_status}
            </Text>
          </View>
        )}

        <TouchableOpacity style={btnSecondary} onPress={handleSendWhatsapp} disabled={busy} activeOpacity={0.85}>
          <Text style={btnSecondaryText}>
            {busy ? 'Envoi…' : contract.signature_status === 'pending' ? 'Renvoyer par WhatsApp' : 'Envoyer par WhatsApp'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={btnSecondary} onPress={handleSendEmail} disabled={busy} activeOpacity={0.85}>
          <Text style={btnSecondaryText}>
            {busy ? 'Envoi…' : contract.signature_status === 'pending' ? 'Renvoyer par email' : 'Envoyer par email'}
          </Text>
        </TouchableOpacity>

        {isAdmin && contract.status === 'closed' && !contract.finalized_at && (
          <TouchableOpacity style={btnSecondary} onPress={handleFinalize} disabled={busy} activeOpacity={0.85}>
            <Text style={btnSecondaryText}>{busy ? 'Finalisation…' : 'Finaliser le contrat'}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {extendOpen && (
        <ExtendModal
          contract={contract}
          prefilledEndDate={route?.params?.openExtendWithPrefill || ''}
          onClose={() => setExtendOpen(false)}
          onSaved={async () => {
            setExtendOpen(false)
            const ids = route?.params?.prolongationLeadIds || []
            if (ids.length) {
              await Promise.all(ids.map(id =>
                updateLeadStatus(id, 'accepted').catch(err => {
                  console.error('[ContractDetail] failed to patch prolongation lead', id, err)
                })
              ))
            }
            await load()
          }}
        />
      )}
    </View>
  )
}

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  )
}

function ExtendModal({ contract, prefilledEndDate = '', onClose, onSaved }) {
  const [newEndDate, setNewEndDate] = useState(
    prefilledEndDate || contract.return_date?.slice(0, 10) || ''
  )
  const [dailyRate,  setDailyRate]  = useState(String(contract.daily_rate || ''))
  const [picking,    setPicking]    = useState(false)
  const [saving,     setSaving]     = useState(false)

  const submit = async () => {
    const iso = normalizeDate(newEndDate)
    if (!iso) { Alert.alert('Date invalide'); return }
    if (iso <= (contract.return_date || '').slice(0, 10)) {
      Alert.alert('La nouvelle date doit être postérieure à la date de retour actuelle.')
      return
    }
    setSaving(true)
    try {
      const body = { newEndDate: iso }
      const r = parseFloat(dailyRate)
      if (Number.isFinite(r) && r > 0) body.dailyRate = r
      const res = await extendContract(contract.id, body)
      Alert.alert(
        'Contrat étendu',
        res?.extraDays ? `+${res.extraDays} jour(s) · +${Number(res.extraAmount || 0).toLocaleString()} MAD` : '',
        [{ text: 'OK', onPress: onSaved }],
      )
    } catch (e) {
      Alert.alert('Erreur', e?.body?.error || e?.message || 'Échec.')
    } finally { setSaving(false) }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={m.backdrop} onPress={onClose}>
        <Pressable style={m.sheet} onPress={e => e.stopPropagation()}>
          <View style={m.handle} />
          <Text style={m.title}>Étendre la durée</Text>

          <Text style={m.label}>Nouvelle date de retour</Text>
          <TouchableOpacity style={m.dateBtn} onPress={() => setPicking(true)} activeOpacity={0.7}>
            <Text style={{ color: newEndDate ? colors.ink : colors.dustTaupe, fontFamily: fonts.regular, fontSize: 15 }}>
              {newEndDate ? fmtDate(newEndDate) : 'Choisir une date'}
            </Text>
          </TouchableOpacity>

          <Text style={m.label}>Tarif journalier (MAD) — optionnel</Text>
          <TextInput
            style={m.input}
            value={dailyRate}
            onChangeText={t => setDailyRate(t.replace(/[^0-9.,]/g, ''))}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.dustTaupe}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <TouchableOpacity style={[btnSecondary, { flex: 1, marginTop: 0 }]} onPress={onClose} activeOpacity={0.85}>
              <Text style={btnSecondaryText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[btnPrimary, { flex: 1, marginTop: 0, opacity: saving ? 0.5 : 1 }]} onPress={submit} disabled={saving} activeOpacity={0.85}>
              <Text style={btnPrimaryText}>{saving ? '…' : 'Confirmer'}</Text>
            </TouchableOpacity>
          </View>

          {picking && (
            <DateTimePicker
              value={newEndDate ? new Date(newEndDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(event, selected) => {
                setPicking(false)
                if (event.type === 'set' && selected) setNewEndDate(selected.toISOString().slice(0, 10))
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.canvas },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas, padding: spacing.lg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.canvas,
    gap: 12,
  },
  headerBtn:   { width: 36 },
  headerBack:  { color: colors.ink, fontFamily: fonts.medium, fontSize: 22 },
  headerTitle: { ...typography.cardTitle, fontWeight: '700' },

  content: { padding: spacing.md, paddingBottom: spacing.xl },

  card: {
    backgroundColor: colors.white,
    borderRadius:    radius.card,
    padding:         spacing.md,
    marginBottom:    spacing.sm + 4,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  eyebrowText: { ...typography.eyebrow, marginBottom: 6 },
  cardTitle:   { ...typography.cardTitle, marginBottom: 4 },
  cardSub:     { ...typography.cardSub, marginTop: 2 },

  rowBtns: { flexDirection: 'row', gap: 8, marginTop: 12 },
  iconBtn: {
    flex: 1,
    backgroundColor: colors.softBone,
    borderRadius: radius.button,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  iconBtnText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },

  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 12 },
  rowLabel: { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  rowValue: { color: colors.ink, fontFamily: fonts.medium, fontSize: 14, flexShrink: 1, textAlign: 'right' },

  totalStadium: {
    backgroundColor: colors.ink,
    borderRadius:    radius.hero,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  totalLabel: { ...typography.eyebrow, color: 'rgba(243,240,238,0.7)', marginBottom: 4 },
  totalValue: { color: colors.canvas, fontFamily: fonts.medium, fontSize: 30, lineHeight: 34, letterSpacing: -0.7 },

  badge:     { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11 },

  empty: { color: colors.slate, fontFamily: fonts.regular, fontSize: 14, marginBottom: 16 },

  signatureBanner: {
    backgroundColor: colors.softBone,
    borderRadius:    radius.card,
    padding:         spacing.md,
    marginBottom:    spacing.sm + 4,
    borderWidth:     1,
    borderColor:     colors.borderStrong,
  },
  signatureLabel: { ...typography.eyebrow, marginBottom: 4 },
  signatureValue: { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
})

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,19,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.md, paddingBottom: spacing.xl,
    borderTopWidth: 1, borderColor: colors.border,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: 12 },
  title:  { ...typography.cardTitle, marginBottom: spacing.md },
  label:  { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginBottom: 6, marginTop: spacing.sm },
  dateBtn:{ ...input, marginBottom: 8, justifyContent: 'center' },
  input:  { ...input, marginBottom: 8 },
})
