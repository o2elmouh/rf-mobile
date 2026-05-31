import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform, Modal, Alert,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { getFleet, getActiveContracts, getBorrowedFleet } from '../../lib/db'
import { colors, radius, spacing, fonts, typography, input, btnPrimary, btnPrimaryText, btnSecondary, btnSecondaryText } from '../../theme'

const FUEL_LEVELS     = ['Vide', '1/4', '1/2', '3/4', 'Plein']
const PAYMENT_METHODS = ['Espèces', 'Carte bancaire', 'Virement', 'Chèque']

function fmt(date) {
  return date.toISOString().slice(0, 10)
}

function display(isoStr) {
  if (!isoStr) return '—'
  const [y, m, d] = isoStr.split('-')
  return `${d}/${m}/${y}`
}

function computeDays(start, end) {
  const s = new Date(start), e = new Date(end)
  if (isNaN(s) || isNaN(e) || e <= s) return 0
  return Math.ceil((e - s) / (1000 * 60 * 60 * 24))
}

/**
 * Returns availability status for a vehicle against chosen dates.
 *
 * 'available'   — no conflict
 * 'warning'     — same-day turnover (new start == existing return)
 * 'unavailable' — date overlap with an existing contract
 *
 * Also returns latestReturn: the furthest return_date among conflicting contracts (for the badge).
 */
function getVehicleAvailability(vehicleId, startDate, endDate, contracts) {
  const relevant = contracts.filter(c => c.vehicle_id === vehicleId)
  if (!relevant.length) return { status: 'available', latestReturn: null }

  let latestReturn = null
  let hasOverlap   = false
  let hasSameDay   = false

  for (const c of relevant) {
    const contractStart = c.pickup_date?.slice(0, 10)
    const contractEnd   = c.return_date?.slice(0, 10)
    if (!contractStart || !contractEnd) continue

    // Same-day turnover: new rental starts exactly when this one ends
    if (startDate === contractEnd) {
      hasSameDay = true
      continue
    }

    // True overlap: ranges intersect
    // Overlap if: newStart < contractEnd AND newEnd > contractStart
    if (startDate < contractEnd && endDate > contractStart) {
      hasOverlap = true
      if (!latestReturn || contractEnd > latestReturn) latestReturn = contractEnd
    }
  }

  if (hasOverlap)  return { status: 'unavailable', latestReturn }
  if (hasSameDay)  return { status: 'warning',     latestReturn: null }
  return           { status: 'available',          latestReturn: null }
}

// ── Date picker (iOS modal / Android native) ───────────────────
function DatePickerModal({ visible, value, minimumDate, onConfirm, onCancel }) {
  const [temp, setTemp] = useState(value)
  useEffect(() => { setTemp(value) }, [value, visible])

  if (Platform.OS === 'android') {
    if (!visible) return null
    return (
      <DateTimePicker
        value={temp}
        mode="date"
        display="default"
        minimumDate={minimumDate}
        onChange={(e, date) => {
          if (e.type === 'dismissed') { onCancel(); return }
          if (date) onConfirm(date)
        }}
      />
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={p.backdrop}>
        <View style={p.sheet}>
          <View style={p.sheetHeader}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={p.cancel}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onConfirm(temp)}>
              <Text style={p.confirm}>Confirmer</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={temp}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            onChange={(_, date) => { if (date) setTemp(date) }}
            style={{ backgroundColor: colors.white }}
            textColor={colors.ink}
          />
        </View>
      </View>
    </Modal>
  )
}

export default function Step2DetailsScreen({ onNext, onBack }) {
  const [fleet,     setFleet]     = useState([])
  const [contracts, setContracts] = useState([])
  const [borrowed,  setBorrowed]  = useState([])
  const [loading,   setLoading]   = useState(true)

  const todayDate    = new Date()
  const tomorrowDate = new Date(Date.now() + 86400000)

  const [startDate,     setStartDate]     = useState(fmt(todayDate))
  const [endDate,       setEndDate]       = useState(fmt(tomorrowDate))
  const [vehicle,       setVehicle]       = useState(null)
  const [dailyRate,     setDailyRate]     = useState('')
  const [fuelLevel,     setFuelLevel]     = useState('Plein')
  const [mileageOut,    setMileageOut]    = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Espèces')
  const [pickerTarget,  setPickerTarget]  = useState(null)

  useEffect(() => {
    Promise.all([getFleet(), getActiveContracts()]).then(([f, c]) => {
      setFleet(f || [])
      setContracts(c || [])
      setLoading(false)
    })
  }, [])

  // Refresh borrowed fleet when the date range changes (network endpoint
  // requires both dates and overlap-filters server-side).
  useEffect(() => {
    if (!startDate || !endDate) { setBorrowed([]); return }
    let cancelled = false
    getBorrowedFleet(startDate, endDate)
      .then(r => { if (!cancelled) setBorrowed(Array.isArray(r?.vehicles) ? r.vehicles : []) })
      .catch(() => { if (!cancelled) setBorrowed([]) })
    return () => { cancelled = true }
  }, [startDate, endDate])

  // Re-check selected vehicle when dates change
  useEffect(() => {
    if (!vehicle) return
    const { status } = getVehicleAvailability(vehicle.id, startDate, endDate, contracts)
    if (status === 'unavailable') setVehicle(null)
  }, [startDate, endDate])

  const days  = computeDays(startDate, endDate)
  const total = days * (parseFloat(dailyRate) || 0)

  const handlePickerConfirm = (date) => {
    const iso = fmt(date)
    if (pickerTarget === 'start') {
      setStartDate(iso)
      if (iso >= endDate) setEndDate(fmt(new Date(date.getTime() + 86400000)))
    } else {
      setEndDate(iso)
    }
    setPickerTarget(null)
  }

  const handleSelectVehicle = (item, avStatus) => {
    if (avStatus === 'unavailable') return

    if (avStatus === 'warning') {
      const contract = contracts.find(
        c => c.vehicle_id === item.id && c.return_date?.slice(0, 10) === startDate
      )
      const returnDay = display(startDate)
      Alert.alert(
        '⚠️ Attention — Retour prévu ce jour',
        `Ce véhicule est attendu en retour le ${returnDay}${contract?.client_name ? ` (${contract.client_name})` : ''}.\n\nAssurez-vous que la restitution aura bien lieu avant de remettre le véhicule au nouveau client.`,
        [
          { text: 'Annuler',              style: 'cancel' },
          { text: 'Confirmer quand même', onPress: () => confirmSelect(item) },
        ]
      )
      return
    }

    confirmSelect(item)
  }

  const confirmSelect = (item) => {
    setVehicle(item)
    // Borrowed fleet vehicles ship a different shape (dailyRate / pre-priced
    // by network_daily_price). Honor whichever is set so the rate seeds correctly.
    setDailyRate(String(item.daily_rate || item.dailyRate || ''))
  }

  const canNext = startDate && endDate && days > 0 && vehicle && dailyRate

  const handleNext = () => {
    if (!canNext) return
    onNext({
      startDate,
      endDate,
      days,
      vehicle,
      vehicleId:    vehicle.id,
      dailyRate:    parseFloat(dailyRate),
      totalAmount:  total,
      fuelLevel,
      mileageStart: parseInt(mileageOut) || 0,
      paymentMethod,
    })
  }

  const pickerValue = pickerTarget === 'start' ? new Date(startDate) : new Date(endDate)
  const pickerMin   = pickerTarget === 'end'   ? new Date(startDate) : todayDate

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      <DatePickerModal
        visible={!!pickerTarget}
        value={pickerValue}
        minimumDate={pickerMin}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerTarget(null)}
      />

      <ScrollView style={s.container} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Date row */}
        <View style={s.dateRow}>
          <View style={s.dateBlock}>
            <Text style={s.label}>Date de début</Text>
            <TouchableOpacity style={s.datePill} onPress={() => setPickerTarget('start')}>
              <Text style={s.dateIcon}>📅</Text>
              <Text style={s.dateVal}>{display(startDate)}</Text>
            </TouchableOpacity>
          </View>
          <View style={s.dateArrow}>
            <Text style={s.dateArrowText}>→</Text>
          </View>
          <View style={s.dateBlock}>
            <Text style={s.label}>Date de fin</Text>
            <TouchableOpacity style={[s.datePill, s.datePillEnd]} onPress={() => setPickerTarget('end')}>
              <Text style={s.dateIcon}>📅</Text>
              <Text style={s.dateVal}>{display(endDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {days > 0 && (
          <View style={s.daysRow}>
            <Text style={s.daysText}>Durée : <Text style={s.daysVal}>{days} jour{days > 1 ? 's' : ''}</Text></Text>
          </View>
        )}

        {/* Vehicle picker */}
        <Text style={s.label}>Véhicule</Text>
        {loading && <ActivityIndicator color={colors.ink} />}
        {!loading && (
          <FlatList
            // Merge fleet + borrowed-fleet. Borrowed entries carry _isNetworkVehicle
            // (per server DTO) so we can render the Réseau badge.
            // Normalize fleet rows to the same `brand/model` keys the UI expects.
            data={[
              ...fleet,
              ...borrowed.map(b => ({
                ...b,
                brand: b.make,
                model: b.model,
                plate_number: b.plate,
                daily_rate: b.dailyRate,
              })),
            ]}
            keyExtractor={v => v.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const isNetwork = !!item._isNetworkVehicle
              // Borrowed vehicles don't conflict with our own contracts —
              // the server already enforces dates via cross_agency_requests.
              const { status, latestReturn } = isNetwork
                ? { status: 'available', latestReturn: null }
                : getVehicleAvailability(item.id, startDate, endDate, contracts)
              const isSelected    = vehicle?.id === item.id
              const isUnavailable = status === 'unavailable'
              const isWarning     = status === 'warning'

              return (
                <TouchableOpacity
                  style={[
                    s.vehicleRow,
                    isSelected    && s.vehicleRowSelected,
                    isUnavailable && s.vehicleRowUnavailable,
                  ]}
                  onPress={() => handleSelectVehicle(item, status)}
                  activeOpacity={isUnavailable ? 1 : 0.7}
                >
                  <View style={s.vehicleMain}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[s.vehicleName, isUnavailable && s.vehicleTextDimmed]}>
                        {item.brand} {item.model} · {item.plate_number || item.plate || ''}
                      </Text>
                      {isNetwork && (
                        <View style={{ backgroundColor: '#EEF0FF', borderColor: 'rgba(99,102,241,0.35)', borderWidth: 1, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                          <Text style={{ color: '#4F46E5', fontFamily: fonts.bold, fontSize: 9, letterSpacing: 0.5 }}>RÉSEAU</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[s.vehicleSub, isUnavailable && s.vehicleTextDimmed]}>
                      {item.daily_rate || item.dailyRate} MAD/jour
                    </Text>
                  </View>

                  {isUnavailable && (
                    <View style={s.badge}>
                      <Text style={s.badgeUnavailable}>🔴 Loué jusqu'au {display(latestReturn)}</Text>
                    </View>
                  )}
                  {isWarning && (
                    <View style={s.badge}>
                      <Text style={s.badgeWarning}>⚠️ Retour prévu le {display(startDate)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            }}
            ListEmptyComponent={<Text style={s.empty}>Aucun véhicule disponible</Text>}
          />
        )}

        {/* Daily rate */}
        <Text style={s.label}>Tarif journalier (MAD)</Text>
        <TextInput
          style={s.input}
          value={dailyRate}
          onChangeText={setDailyRate}
          keyboardType="numeric"
          placeholder="ex: 350"
          placeholderTextColor={colors.dustTaupe}
        />

        {/* Total */}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Montant total</Text>
          <Text style={s.totalVal}>{total.toLocaleString()} MAD</Text>
        </View>

        {/* Fuel level */}
        <Text style={s.label}>Niveau de carburant</Text>
        <View style={s.pillRow}>
          {FUEL_LEVELS.map(f => (
            <TouchableOpacity key={f} style={[s.pill, fuelLevel === f && s.pillActive]} onPress={() => setFuelLevel(f)}>
              <Text style={[s.pillText, fuelLevel === f && s.pillTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mileage */}
        <Text style={s.label}>Kilométrage départ</Text>
        <TextInput
          style={s.input}
          value={mileageOut}
          onChangeText={setMileageOut}
          keyboardType="numeric"
          placeholder="ex: 45000"
          placeholderTextColor={colors.dustTaupe}
        />

        {/* Payment method */}
        <Text style={s.label}>Mode de paiement</Text>
        <View style={s.pillRow}>
          {PAYMENT_METHODS.map(m => (
            <TouchableOpacity key={m} style={[s.pill, paymentMethod === m && s.pillActive]} onPress={() => setPaymentMethod(m)}>
              <Text style={[s.pillText, paymentMethod === m && s.pillTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Navigation */}
        <View style={s.navRow}>
          <TouchableOpacity style={s.backBtn} onPress={onBack}>
            <Text style={s.backBtnText}>← Retour</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.nextBtn, !canNext && s.nextBtnDisabled]} onPress={handleNext} disabled={!canNext}>
            <Text style={s.nextBtnText}>Suivant →</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.canvas },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl + 16 },
  label:         { ...typography.eyebrow, marginBottom: 6, marginTop: spacing.md },

  // Date picker pills
  dateRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6 },
  dateBlock:     { flex: 1 },
  dateArrow:     { paddingBottom: 12 },
  dateArrowText: { color: colors.slate, fontSize: 18 },
  datePill:      { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.button, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  datePillEnd:   { borderColor: colors.borderStrong },
  dateIcon:      { fontSize: 16 },
  dateVal:       { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },

  daysRow:       { backgroundColor: colors.softBone, borderRadius: radius.card, padding: 12, marginTop: 10 },
  daysText:      { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  daysVal:       { color: colors.ink, fontFamily: fonts.bold },

  // Vehicle rows
  vehicleRow:            { backgroundColor: colors.white, borderRadius: radius.card, padding: spacing.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  vehicleRowSelected:    { borderColor: colors.ink, borderWidth: 1.5 },
  vehicleRowUnavailable: { opacity: 0.45 },
  vehicleMain:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicleName:           { color: colors.ink, fontFamily: fonts.medium, fontSize: 14, flex: 1 },
  vehicleSub:            { color: colors.slate, fontFamily: fonts.regular, fontSize: 12 },
  vehicleTextDimmed:     { color: colors.dustTaupe },

  // Availability badges
  badge:           { marginTop: 8 },
  badgeUnavailable:{ color: colors.danger,     fontFamily: fonts.medium, fontSize: 12 },
  badgeWarning:    { color: colors.signalSoft, fontFamily: fonts.medium, fontSize: 12 },

  input:      { ...input, marginBottom: 0 },
  empty:      { color: colors.slate, fontFamily: fonts.regular, textAlign: 'center', padding: 20 },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.ink, borderRadius: radius.hero, padding: spacing.md, marginTop: 10 },
  totalLabel: { color: 'rgba(243,240,238,0.7)', fontFamily: fonts.regular, fontSize: 14 },
  totalVal:   { color: colors.canvas, fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.5 },

  pillRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  pill:           { backgroundColor: colors.white, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.borderStrong },
  pillActive:     { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText:       { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  pillTextActive: { color: colors.canvas, fontFamily: fonts.medium },

  navRow:          { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 30 },
  backBtn:         { ...btnSecondary, flex: 1, marginTop: 0 },
  backBtnText:     { ...btnSecondaryText },
  nextBtn:         { ...btnPrimary, flex: 2, marginTop: 0 },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText:     { ...btnPrimaryText },
})

const p = StyleSheet.create({
  backdrop:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,20,19,0.5)' },
  sheet:       { backgroundColor: colors.canvas, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  cancel:      { color: colors.slate, fontFamily: fonts.medium, fontSize: 15 },
  confirm:     { color: colors.ink, fontFamily: fonts.bold, fontSize: 15 },
})
