import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert,
  Modal, Pressable,
} from 'react-native'
import {
  saveClient, saveContract, saveVehicle,
  getUnsignedPdfBase64, sendContractWhatsApp, sendContractEmail,
} from '../../lib/db'
import { holdDeposit } from '../../lib/accounting'
import { generateUUID, generateContractNumber } from '../../lib/uuid'
import { fmtDate } from '../../lib/dates'
import { colors, radius, spacing, fonts, typography, btnPrimary, btnPrimaryText, btnSecondary, btnSecondaryText } from '../../theme'

function Row({ label, value, valueColor }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  )
}

const PAYMENT_METHOD_MAP = {
  'Espèces':        'cash',
  'Carte bancaire': 'card',
  'Virement':       'bank_transfer',
  'Chèque':         'cheque',
}

export default function Step4ConfirmScreen({ client, rental, photos, onBack, onDone }) {
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [signOpen, setSignOpen] = useState(false)         // sign channel sheet
  const [createdContractId, setCreatedContractId] = useState(null)
  const [sending, setSending] = useState(null)            // 'whatsapp' | 'email' | null

  const fullName = client
    ? `${client.first_name || ''} ${client.last_name || ''}`.trim()
    : '—'

  const vehicleLabel = rental?.vehicle
    ? `${rental.vehicle.brand} ${rental.vehicle.model} · ${rental.vehicle.plate_number || rental.vehicle.plate || ''}`.trim()
    : '—'

  const handleFinalize = async () => {
    setLoading(true)
    let savedClientId = null
    try {
      // 1. Save client
      const savedClient = await saveClient(client)
      if (!savedClient?.id) throw new Error('Échec de la sauvegarde du client.')
      savedClientId = savedClient.id

      // 2. Save contract
      const contractId     = generateUUID()
      const contractNumber = generateContractNumber()
      await saveContract({
        id:              contractId,
        contract_number: contractNumber,
        client_id:       savedClientId,
        vehicle_id:      rental.vehicleId,
        pickup_date:     rental.startDate,
        return_date:     rental.endDate,
        total_days:      rental.days,
        daily_rate:      rental.dailyRate,
        total_amount:    rental.totalAmount,
        status:          'active',
        fuel_level_start: rental.fuelLevel,
        mileage_start:   rental.mileageStart,
        payment_method:  PAYMENT_METHOD_MAP[rental.paymentMethod] ?? rental.paymentMethod,
      })

      // Hold security deposit (non-blocking — accounting must never block
      // the rental flow). Defaults to the vehicle's deposit_amount when
      // the wizard didn't override it. Skip when 0.
      try {
        const depositAmount = Number(
          rental?.deposit_amount ?? rental?.depositAmount ?? rental?.vehicle?.deposit_amount ?? 0
        )
        if (depositAmount > 0) {
          await holdDeposit({
            contractId:  contractId,
            clientName:  fullName,
            vehicleName: vehicleLabel,
            amount:      depositAmount,
            date:        rental.startDate || new Date().toISOString().slice(0, 10),
          })
        }
      } catch (depErr) {
        console.warn('[Step4] holdDeposit non-blocking:', depErr?.message)
      }

      // v1.14.24: vehicle.status flip to 'rented' MOVED out of this step.
      // Previously the car was flagged rented at this confirm-click, but the
      // signing sheet still needed the agent to actively pick a channel.
      // If they closed the sheet without sending OR the wizard was abandoned,
      // the car stayed locked. The flip now happens in markVehicleRented()
      // which is invoked from sendForSignature (success) AND skipSignature
      // (agent chose "send later" — they still committed to the rental).
      // Date-range double-booking protection is unaffected: the contract is
      // already status='active' from step (2), so get_available_vehicles
      // excludes the car from other agents' pickers via the overlap rule.

      // 3. Open the sign channel sheet — agent picks how to send the
      //    unsigned contract PDF for the client's e-signature.
      setCreatedContractId(contractId)
      setSignOpen(true)
    } catch (err) {
      console.error('[NewRental] finalize error', err)
      const step    = !savedClientId ? 'client' : 'contrat'
      const status  = err?.status ? ` (HTTP ${err.status})` : ''
      const details = err?.body?.error || err?.message || String(err)
      Alert.alert(`Erreur — ${step}${status}`, details)
    } finally {
      setLoading(false)
    }
  }

  // v1.14.24: deferred flip — invoked from both completion paths. Non-blocking:
  // if the vehicle update fails (network / RLS), we still return success to
  // the agent; worst case they fix the status manually from Fleet. The
  // contract row is the source of truth for "is this car currently booked".
  const markVehicleRented = async () => {
    if (!rental?.vehicle) return
    try {
      if (rental.vehicle.status !== 'rented') {
        await saveVehicle({ ...rental.vehicle, status: 'rented' })
      }
    } catch (vehErr) {
      console.warn('[Step4] vehicle flip to rented non-blocking:', vehErr?.message)
    }
  }

  const sendForSignature = async (channel) => {
    if (!createdContractId) return
    if (channel === 'whatsapp' && !client?.phone) { Alert.alert('Téléphone manquant', "Ce client n'a pas de numéro."); return }
    if (channel === 'email'    && !client?.email) { Alert.alert('Email manquant',     "Ce client n'a pas d'email.");  return }
    setSending(channel)
    try {
      const { pdf_base64 } = await getUnsignedPdfBase64(createdContractId)
      if (!pdf_base64) throw new Error('PDF vide reçu du serveur.')
      if (channel === 'whatsapp') await sendContractWhatsApp(createdContractId, pdf_base64)
      else                        await sendContractEmail(createdContractId, pdf_base64)
      // Send succeeded — agent has committed. Flip the car.
      await markVehicleRented()
      setSignOpen(false)
      setSuccess(true)
      setTimeout(() => { onDone() }, 1500)
    } catch (e) {
      Alert.alert('Erreur', e?.body?.error || e?.message || "L'envoi a échoué.")
    } finally { setSending(null) }
  }

  const skipSignature = async () => {
    // Agent chose "send later" — they still committed to the rental, so the
    // car is leaving the lot. Flip before navigating away.
    await markVehicleRented()
    setSignOpen(false)
    setSuccess(true)
    setTimeout(() => { onDone() }, 1000)
  }

  if (success) {
    return (
      <View style={s.successContainer}>
        <Text style={s.successIcon}>✅</Text>
        <Text style={s.successTitle}>Contrat créé !</Text>
        <Text style={s.successSub}>Redirection en cours...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scrollContent}>
      <Text style={s.sectionTitle}>Récapitulatif</Text>

      <View style={s.card}>
        <Text style={s.cardTitle}>Client</Text>
        <Row label="Nom complet" value={fullName} />
        <Row label="Téléphone"   value={client?.phone || '—'} />
        <Row label="CIN"         value={client?.id_number || '—'} />
        <Row label="Nationalité" value={client?.nationality || '—'} />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Location</Text>
        <Row label="Véhicule"     value={vehicleLabel} />
        <Row label="Début"        value={fmtDate(rental?.startDate)} />
        <Row label="Fin"          value={fmtDate(rental?.endDate)} />
        <Row label="Durée"        value={`${rental?.days || 0} jour${rental?.days > 1 ? 's' : ''}`} />
        <Row label="Tarif/jour"   value={`${rental?.dailyRate || 0} MAD`} />
        <Row label="Total"        value={`${(rental?.totalAmount || 0).toLocaleString()} MAD`} valueColor={colors.success} />
        <Row label="Carburant"    value={rental?.fuelLevel || '—'} />
        <Row label="Kilométrage"  value={`${rental?.mileageStart || 0} km`} />
        <Row label="Paiement"     value={rental?.paymentMethod || '—'} />
      </View>

      {photos && Object.values(photos).some(Boolean) && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Photos</Text>
          <Text style={s.photoCount}>{Object.values(photos).filter(Boolean).length} photo(s) ajoutée(s)</Text>
        </View>
      )}

      <View style={s.navRow}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} disabled={loading}>
          <Text style={s.backBtnText}>← Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.finalBtn, loading && s.finalBtnDisabled]} onPress={handleFinalize} disabled={loading}>
          {loading
            ? <ActivityIndicator color={colors.canvas} />
            : <Text style={s.finalBtnText}>Finaliser le contrat</Text>
          }
        </TouchableOpacity>
      </View>

      <Modal visible={signOpen} transparent animationType="slide" onRequestClose={skipSignature}>
        <Pressable style={s.sheetBackdrop} onPress={skipSignature}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Envoyer le contrat pour signature ?</Text>
            <Text style={s.sheetSub}>
              Le client recevra un lien sécurisé pour signer le contrat à distance.
            </Text>

            <TouchableOpacity
              style={[s.signBtn, !client?.phone && { opacity: 0.5 }, sending && { opacity: 0.5 }]}
              onPress={() => sendForSignature('whatsapp')}
              disabled={!client?.phone || !!sending}
              activeOpacity={0.85}
            >
              {sending === 'whatsapp'
                ? <ActivityIndicator color={colors.canvas} />
                : <Text style={s.signBtnText}>💬  Envoyer par WhatsApp</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.signBtn, !client?.email && { opacity: 0.5 }, sending && { opacity: 0.5 }]}
              onPress={() => sendForSignature('email')}
              disabled={!client?.email || !!sending}
              activeOpacity={0.85}
            >
              {sending === 'email'
                ? <ActivityIndicator color={colors.canvas} />
                : <Text style={s.signBtnText}>📧  Envoyer par email</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={skipSignature} disabled={!!sending} style={s.skipLink} activeOpacity={0.7}>
              <Text style={s.skipLinkText}>Plus tard — créer sans signature</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.canvas },
  scrollContent:    { padding: spacing.md, paddingBottom: spacing.xl + 16 },
  sectionTitle:     { ...typography.cardTitle, marginBottom: spacing.md },
  card:             { backgroundColor: colors.white, borderRadius: radius.card, padding: spacing.md, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardTitle:        { ...typography.eyebrow, marginBottom: 12 },
  row:              { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rowLabel:         { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  rowValue:         { color: colors.ink, fontFamily: fonts.medium, fontSize: 13, textAlign: 'right', flex: 1, marginLeft: 12 },
  photoCount:       { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  navRow:           { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 40 },
  backBtn:          { ...btnSecondary, flex: 1, marginTop: 0 },
  backBtnText:      { ...btnSecondaryText },
  finalBtn:         { ...btnPrimary, flex: 2, marginTop: 0 },
  finalBtnDisabled: { opacity: 0.5 },
  finalBtnText:     { ...btnPrimaryText },
  successContainer: { flex: 1, backgroundColor: colors.canvas, justifyContent: 'center', alignItems: 'center' },
  successIcon:      { fontSize: 64, marginBottom: 16 },

  // Sign-channel bottom sheet
  sheetBackdrop:    { flex: 1, backgroundColor: 'rgba(20,20,19,0.55)', justifyContent: 'flex-end' },
  sheet:            { backgroundColor: colors.canvas, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: spacing.xl + 8, borderTopWidth: 1, borderColor: colors.border },
  sheetHandle:      { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: spacing.md },
  sheetTitle:       { ...typography.cardTitle, marginBottom: 6 },
  sheetSub:         { ...typography.cardSub, marginBottom: spacing.md },
  signBtn:          { ...btnPrimary, marginTop: 8 },
  signBtnText:      { ...btnPrimaryText },
  skipLink:         { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
  skipLinkText:     { color: colors.slate, fontFamily: fonts.medium, fontSize: 14 },
  successTitle:     { color: colors.success, fontFamily: fonts.bold, fontSize: 24 },
  successSub:       { color: colors.slate, fontFamily: fonts.regular, fontSize: 14, marginTop: 8 },
})
