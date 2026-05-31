import { useState } from 'react'
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { colors, radius, spacing, fonts, typography, input, btnPrimary, btnPrimaryText } from '../../theme'

const FUEL_OPTIONS = ['Vide', '1/4', '1/2', '3/4', 'Plein']

function today() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function currentTime() {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export default function ReturnStep({ contract, onNext }) {
  const [returnDate,      setReturnDate]      = useState(today())
  const [returnTime,      setReturnTime]      = useState(currentTime())
  const [returnMileage,   setReturnMileage]   = useState('')
  const [returnFuelLevel, setReturnFuelLevel] = useState('Plein')

  const mileageStart = contract?.mileage_start ?? contract?.km_depart ?? 0
  const kmLimit      = contract?.km_limit ?? contract?.km_included ?? null

  const extraKm = (() => {
    const end = parseFloat(returnMileage)
    if (!end || !mileageStart) return null
    const driven = end - Number(mileageStart)
    if (!kmLimit || driven <= kmLimit) return null
    return driven - kmLimit
  })()

  const handleNext = () => {
    onNext({ returnDate, returnTime, returnMileage: parseFloat(returnMileage) || 0, returnFuelLevel, extraKm })
  }

  const canContinue = returnDate.trim() && returnTime.trim() && returnMileage.trim()

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={s.stepTitle}>Détails du retour</Text>

      {/* Read-only departure mileage */}
      <View style={s.infoBlock}>
        <Text style={s.infoLabel}>Kilométrage au départ</Text>
        <Text style={s.infoValue}>{Number(mileageStart).toLocaleString()} km</Text>
      </View>

      {kmLimit ? (
        <View style={s.infoBlock}>
          <Text style={s.infoLabel}>Kilométrage inclus</Text>
          <Text style={s.infoValue}>{Number(kmLimit).toLocaleString()} km</Text>
        </View>
      ) : null}

      {/* Return date */}
      <Text style={s.label}>Date de retour</Text>
      <TextInput
        style={s.input}
        value={returnDate}
        onChangeText={setReturnDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.dustTaupe}
      />

      {/* Return time */}
      <Text style={s.label}>Heure de retour</Text>
      <TextInput
        style={s.input}
        value={returnTime}
        onChangeText={setReturnTime}
        placeholder="HH:MM"
        placeholderTextColor={colors.dustTaupe}
      />

      {/* Return mileage */}
      <Text style={s.label}>Kilométrage au retour</Text>
      <TextInput
        style={s.input}
        value={returnMileage}
        onChangeText={setReturnMileage}
        placeholder="Ex: 45230"
        placeholderTextColor={colors.dustTaupe}
        keyboardType="numeric"
      />

      {/* Extra km alert */}
      {extraKm !== null && (
        <View style={s.alertBlock}>
          <Text style={s.alertText}>⚠️  {extraKm.toLocaleString()} km supplémentaires dépassés</Text>
        </View>
      )}

      {/* Fuel level picker */}
      <Text style={s.label}>Niveau de carburant au retour</Text>
      <View style={s.fuelRow}>
        {FUEL_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[s.fuelChip, returnFuelLevel === opt && s.fuelChipActive]}
            onPress={() => setReturnFuelLevel(opt)}
          >
            <Text style={[s.fuelChipText, returnFuelLevel === opt && s.fuelChipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[s.btn, !canContinue && s.btnDisabled]}
        onPress={handleNext}
        disabled={!canContinue}
      >
        <Text style={s.btnText}>Suivant →</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.canvas },
  scrollContent:{ padding: spacing.lg, paddingBottom: spacing.xl + 16 },
  stepTitle:    { ...typography.cardTitle, marginBottom: spacing.lg },
  infoBlock:    { backgroundColor: colors.softBone, borderRadius: radius.card, padding: 14, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel:    { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  infoValue:    { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  label:        { ...typography.eyebrow, marginBottom: 6, marginTop: spacing.md },
  input:        { ...input, marginBottom: 0 },
  alertBlock:   { backgroundColor: 'rgba(207,69,0,0.08)', borderRadius: radius.card, padding: 14, marginTop: 12, borderLeftWidth: 3, borderLeftColor: colors.signal },
  alertText:    { color: colors.signal, fontFamily: fonts.medium, fontSize: 13 },
  fuelRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  fuelChip:     { backgroundColor: colors.white, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.borderStrong },
  fuelChipActive:{ backgroundColor: colors.ink, borderColor: colors.ink },
  fuelChipText: { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  fuelChipTextActive:{ color: colors.canvas, fontFamily: fonts.medium },
  btn:          { ...btnPrimary, marginTop: spacing.xl, marginBottom: 40 },
  btnDisabled:  { opacity: 0.4 },
  btnText:      { ...btnPrimaryText },
})
