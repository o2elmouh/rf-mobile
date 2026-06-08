import { useState } from 'react'
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native'
import { closeContractApi, saveInvoice, getDepositByContract } from '../../lib/db'
import { generateRentalInvoice, releaseDeposit } from '../../lib/accounting'
import { generateUUID } from '../../lib/uuid'
import { fmtDate } from '../../lib/dates'
import { ApiError } from '../../lib/api'
import { colors, radius, spacing, fonts, typography, input, btnPrimary, btnPrimaryText } from '../../theme'

const SEVERITY_LABEL = { minor: 'mineur', major: 'majeur', cosmetic: 'cosmétique' }

// Build a single text block to persist into contracts.notes (server schema).
// The server's POST /contracts/:id/close stores `damages` (string) into the
// `notes` column — there is no structured damages column on contracts.
function formatDamagesNote(damages) {
  if (!Array.isArray(damages) || damages.length === 0) return null
  return damages.map(d => {
    const sev = SEVERITY_LABEL[d.severity] || d.severity || '?'
    const desc = d.description ? ` — ${d.description}` : ''
    return `[${sev}] ${d.zone || '—'}${desc}`
  }).join('\n')
}

export default function ClosureStep({ contract, returnData, aiResult, onDone }) {
  const [damageFee, setDamageFee] = useState('')
  const [loading,   setLoading]   = useState(false)

  const damages = Array.isArray(aiResult?.damages) ? aiResult.damages : []
  const { returnDate, returnTime, returnMileage, returnFuelLevel, extraKm } = returnData

  const extraKmFee = (() => {
    if (!extraKm || extraKm <= 0) return 0
    const ratePerKm = contract?.extra_km_rate ?? contract?.tarif_km_sup ?? 3
    return extraKm * ratePerKm
  })()

  const parsedDamageFee = parseFloat(damageFee) || 0
  const totalExtraFees  = extraKmFee + parsedDamageFee

  const handleClose = async () => {
    setLoading(true)
    try {
      // 1. Close server-side — does contracts.status, mileage_end, fuel_level_end,
      //    notes, extra_fees, actual_return_date AND flips vehicle to 'available' in
      //    one round-trip, bypassing RLS issues we used to hit from the client.
      await closeContractApi(contract.id, {
        returnKm:         Number(returnMileage) || 0,
        returnFuelLevel,
        damages:          formatDamagesNote(damages),
        extraFees:        totalExtraFees,
      })

      // 2. Damage invoice — server does NOT create this; keep client-side.
      if (parsedDamageFee > 0) {
        await saveInvoice({
          id:              generateUUID(),
          contract_id:     contract.id,
          client_id:       contract.client_id,
          contract_number: contract.contract_number,
          client_name:     contract.client_name,
          total_ht:        parsedDamageFee,
          tva:             0,
          total_ttc:       parsedDamageFee,
          start_date:      returnDate,
          end_date:        returnDate,
          status:          'pending',
        })
      }

      // 3. Post the double-entry journal for the rental (non-blocking —
      //    accounting must never block closure).
      try {
        await generateRentalInvoice(contract.id)
      } catch (err) {
        console.warn('[Restitution] generateRentalInvoice non-blocking:', err?.message)
      }

      // 4. Release any held deposit. Deductions map restitution fees onto
      //    the chart of accounts so the journal stays consistent.
      try {
        const dep = await getDepositByContract(contract.id)
        if (dep && dep.status === 'held') {
          const deductions = [
            extraKmFee > 0       ? { reason: 'Km supplémentaires', amount: extraKmFee,       accountCode: '3030' } : null,
            parsedDamageFee > 0  ? { reason: 'Frais dommages',     amount: parsedDamageFee,  accountCode: '3020' } : null,
          ].filter(Boolean)
          await releaseDeposit({ depositId: dep.id, deductions })
        }
      } catch (err) {
        console.warn('[Restitution] releaseDeposit non-blocking:', err?.message)
      }

      setLoading(false)
      Alert.alert(
        'Contrat clôturé',
        'Le véhicule est maintenant disponible.',
        [{ text: 'OK', onPress: onDone }]
      )
    } catch (err) {
      setLoading(false)
      const msg = err instanceof ApiError
        ? (err.body?.error || err.message)
        : (err.message || 'Une erreur est survenue.')
      Alert.alert('Erreur', msg)
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.stepTitle}>Récapitulatif de clôture</Text>

      {/* Vehicle + client */}
      <View style={s.section}>
        <Row label="Véhicule"  value={contract.vehicle_name || contract.vehicle_label || '—'} />
        <Row label="Client"    value={contract.client_name || '—'} />
        <Row label="Contrat"   value={contract.contract_number || '—'} />
      </View>

      {/* Return details */}
      <View style={s.section}>
        <Row label="Date de retour"   value={`${fmtDate(returnDate)} ${returnTime}`} />
        <Row label="Kilométrage retour" value={`${Number(returnMileage).toLocaleString()} km`} />
        <Row label="Carburant"        value={returnFuelLevel} />
      </View>

      {/* Extra fees */}
      {extraKm > 0 && (
        <View style={s.feeBlock}>
          <Row label={`Km supplémentaires (${extraKm} km)`} value={`+${extraKmFee.toLocaleString()} MAD`} valueColor={colors.signalSoft} />
        </View>
      )}

      {/* AI damage summary (read-only — edited in the previous step) */}
      {damages.length > 0 && (
        <View style={s.damagesBlock}>
          <Text style={s.damagesTitle}>Dommages détectés ({damages.length})</Text>
          {damages.map((d, i) => (
            <Text key={i} style={s.damageLine}>
              • {d.zone || '—'}{d.description ? ` — ${d.description}` : ''}
              {d.severity ? ` (${SEVERITY_LABEL[d.severity] || d.severity})` : ''}
            </Text>
          ))}
          {aiResult?.recommendation ? (
            <Text style={s.damageReco}>{aiResult.recommendation}</Text>
          ) : null}
        </View>
      )}

      {/* Damage fee input */}
      <Text style={s.label}>Frais de dommages (MAD)</Text>
      <TextInput
        style={s.input}
        value={damageFee}
        onChangeText={setDamageFee}
        placeholder="0"
        placeholderTextColor={colors.dustTaupe}
        keyboardType="numeric"
      />

      {/* Total extra */}
      {totalExtraFees > 0 && (
        <View style={s.totalBlock}>
          <Text style={s.totalLabel}>Total frais supplémentaires</Text>
          <Text style={s.totalValue}>{totalExtraFees.toLocaleString()} MAD</Text>
        </View>
      )}

      <TouchableOpacity
        style={[s.closeBtn, loading && s.closeBtnDisabled]}
        onPress={handleClose}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={colors.canvas} />
          : <Text style={s.closeBtnText}>Clôturer le contrat</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}

function Row({ label, value, valueColor }) {
  return (
    <View style={r.row}>
      <Text style={r.label}>{label}</Text>
      <Text style={[r.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  )
}

const r = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  value: { color: colors.ink, fontFamily: fonts.medium, fontSize: 13, flexShrink: 1, textAlign: 'right', marginLeft: 8 },
})

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.canvas },
  content:         { padding: spacing.lg, paddingBottom: 40 },
  stepTitle:       { ...typography.cardTitle, marginBottom: spacing.lg },
  section:         { backgroundColor: colors.white, borderRadius: radius.card, padding: spacing.md, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  feeBlock:        { backgroundColor: 'rgba(243,115,56,0.08)', borderRadius: radius.card, padding: spacing.md, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: colors.signalSoft },
  damagesBlock:    { backgroundColor: colors.white, borderRadius: radius.card, padding: spacing.md, marginBottom: 12, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.danger },
  damagesTitle:    { color: colors.ink, fontFamily: fonts.medium, fontSize: 13, marginBottom: 6 },
  damageLine:      { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  damageReco:      { color: colors.ink, fontFamily: fonts.medium, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  label:           { ...typography.eyebrow, marginBottom: 6, marginTop: spacing.md },
  input:           { ...input, marginBottom: 0 },
  totalBlock:      { backgroundColor: colors.ink, borderRadius: radius.hero, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  totalLabel:      { color: 'rgba(243,240,238,0.7)', fontFamily: fonts.regular, fontSize: 14 },
  totalValue:      { color: colors.canvas, fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.5 },
  closeBtn:        { ...btnPrimary, marginTop: spacing.xl },
  closeBtnDisabled:{ opacity: 0.6 },
  closeBtnText:    { ...btnPrimaryText },
})
