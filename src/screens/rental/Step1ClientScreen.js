import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Modal,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { getClients } from '../../lib/db'
import { analyzeDocument } from '../../lib/documentScanner'
import { normalizeDate, fmtDate } from '../../lib/dates'
import { colors, radius, spacing, fonts, typography, input, btnPrimary, btnPrimaryText, btnSecondary, btnSecondaryText } from '../../theme'
import DocumentCameraScreen from './DocumentCameraScreen'

export default function Step1ClientScreen({
  onNext,
  // form visibility (controlled by parent)
  showForm, setShowForm,
  // search
  query, setQuery, selected, setSelected,
  // identity
  firstName, setFirstName,
  lastName,  setLastName,
  phone,     setPhone,
  email,     setEmail,
  idNumber,  setIdNumber,
  cinExpiry, setCinExpiry,
  birthDate, setBirthDate,
  nationality, setNationality,
  // licence
  licenceNumber, setLicenceNumber,
  licenceExpiry, setLicenceExpiry,
}) {
  const [clients,  setClients]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [scanning, setScanning] = useState(false)
  const [camera,   setCamera]   = useState(null) // 'cin' | 'permis' | null
  const [datePickerFor, setDatePickerFor] = useState(null) // 'birth' | 'cin' | 'licence' | null

  useEffect(() => {
    getClients().then(data => { setClients(data || []); setLoading(false) })
  }, [])

  const filtered = clients.filter(c => {
    const q = query.toLowerCase()
    return (
      (c.first_name || '').toLowerCase().includes(q) ||
      (c.last_name  || '').toLowerCase().includes(q) ||
      (c.phone      || '').toLowerCase().includes(q) ||
      (c.id_number  || '').toLowerCase().includes(q)
    )
  })

  const handleCapture = async (uri) => {
    const type = camera
    setCamera(null)
    setScanning(true)
    try {
      const hint = type === 'permis' ? 'license' : 'cin'
      const data = await analyzeDocument(uri, hint)
      if (!data) return
      // OCR scanner returns dates as `dd/mm/yyyy` — normalize to ISO for state
      // so DatePickerButton can display + saveClient can write without errors.
      if (type === 'permis') {
        if (data.licence_number) setLicenceNumber(data.licence_number)
        if (data.licence_expiry) setLicenceExpiry(normalizeDate(data.licence_expiry) || '')
      } else {
        if (data.first_name  && !firstName)  setFirstName(data.first_name)
        if (data.last_name   && !lastName)   setLastName(data.last_name)
        if (data.birth_date  && !birthDate)  setBirthDate(normalizeDate(data.birth_date) || '')
        if (data.nationality && !nationality && data.nationality !== 'XXX') setNationality(data.nationality)
        if (data.cin_number      && !idNumber)  setIdNumber(data.cin_number)
        if (data.cin_expiry      && !cinExpiry) setCinExpiry(normalizeDate(data.cin_expiry) || '')
        if (data.passport_number && !idNumber)  setIdNumber(data.passport_number)
        if (data.passport_expiry && !cinExpiry) setCinExpiry(normalizeDate(data.passport_expiry) || '')
      }
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Impossible de scanner le document.')
    } finally {
      setScanning(false)
    }
  }

  const handleNext = () => {
    if (showForm) {
      if (!firstName.trim() || !lastName.trim() || !phone.trim()) return
      onNext({
        id:                     'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16) }),
        first_name:             firstName.trim(),
        last_name:              lastName.trim(),
        phone:                  phone.trim(),
        email:                  email.trim() || null,
        id_number:              idNumber.trim(),
        id_expiry:              normalizeDate(cinExpiry),
        date_of_birth:          normalizeDate(birthDate),
        nationality:            nationality.trim()   || 'MA',
        driving_license_num:    licenceNumber.trim() || null,
        driving_license_expiry: normalizeDate(licenceExpiry),
      })
    } else if (selected) {
      onNext(selected)
    }
  }

  const canNext = showForm
    ? firstName.trim() && lastName.trim() && phone.trim()
    : !!selected

  const handleDatePicked = (event, selected) => {
    const target = datePickerFor
    setDatePickerFor(null)
    if (event.type !== 'set' || !selected) return
    const iso = selected.toISOString().slice(0, 10)
    if (target === 'birth')   setBirthDate(iso)
    if (target === 'cin')     setCinExpiry(iso)
    if (target === 'licence') setLicenceExpiry(iso)
  }

  const currentDateValue = (() => {
    const raw = datePickerFor === 'birth' ? birthDate
              : datePickerFor === 'cin'   ? cinExpiry
              : datePickerFor === 'licence' ? licenceExpiry
              : null
    const iso = normalizeDate(raw)
    return iso ? new Date(iso) : new Date()
  })()

  return (
    <>
      <Modal visible={!!camera} animationType="slide" onRequestClose={() => setCamera(null)}>
        <DocumentCameraScreen
          title={camera === 'permis' ? 'Scanner le permis' : 'Scanner CIN / Passeport'}
          onCapture={handleCapture}
          onCancel={() => setCamera(null)}
        />
      </Modal>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.container} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

          {!showForm && (
            <>
              <Text style={s.sectionTitle}>Rechercher un client existant</Text>
              <TextInput
                style={s.input}
                placeholder="Nom, téléphone, CIN..."
                placeholderTextColor={colors.dustTaupe}
                value={query}
                onChangeText={t => { setQuery(t); setSelected(null) }}
              />
              {loading && <ActivityIndicator color={colors.ink} style={{ marginTop: 20 }} />}
              {!loading && query.length > 0 && (
                <FlatList
                  data={filtered}
                  keyExtractor={c => c.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[s.clientRow, selected?.id === item.id && s.clientRowSelected]}
                      onPress={() => setSelected(item)}
                    >
                      <Text style={s.clientName}>{item.first_name} {item.last_name}</Text>
                      <Text style={s.clientSub}>{item.phone} · {item.cin_number}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={s.empty}>Aucun client trouvé</Text>}
                />
              )}
              {selected && (
                <View style={s.selectedBadge}>
                  <Text style={s.selectedText}>
                    Client sélectionné : {selected.first_name} {selected.last_name}
                  </Text>
                </View>
              )}
            </>
          )}

          <TouchableOpacity
            style={s.newClientBtn}
            onPress={() => { setShowForm(v => !v); setSelected(null); setQuery('') }}
          >
            <Text style={s.newClientText}>
              {showForm ? '← Retour à la recherche' : '+ Nouveau client'}
            </Text>
          </TouchableOpacity>

          {showForm && (
            <View style={s.form}>
              <View style={s.scanRow}>
                <TouchableOpacity style={[s.scanBtn, scanning && s.scanBtnDisabled]} onPress={() => setCamera('cin')} disabled={scanning}>
                  {scanning ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.scanBtnText}>📷 CIN / Passeport</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[s.scanBtn, s.scanBtnPermis, scanning && s.scanBtnDisabled]} onPress={() => setCamera('permis')} disabled={scanning}>
                  {scanning ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.scanBtnText}>📷 Permis</Text>}
                </TouchableOpacity>
              </View>

              <Text style={s.formSection}>Identité</Text>
              <TextInput style={s.input} placeholder="Prénom *"                       placeholderTextColor={colors.dustTaupe} value={firstName}     onChangeText={setFirstName} />
              <TextInput style={s.input} placeholder="Nom *"                          placeholderTextColor={colors.dustTaupe} value={lastName}      onChangeText={setLastName} />
              <TextInput style={s.input} placeholder="Téléphone *"                    placeholderTextColor={colors.dustTaupe} value={phone}         onChangeText={setPhone} keyboardType="phone-pad" />
              <TextInput style={s.input} placeholder="Email"                          placeholderTextColor={colors.dustTaupe} value={email}         onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              <TextInput style={s.input} placeholder="Nationalité"                    placeholderTextColor={colors.dustTaupe} value={nationality}   onChangeText={setNationality} />
              <DatePickerButton label="Date de naissance" value={birthDate}     onPress={() => setDatePickerFor('birth')}   onClear={() => setBirthDate('')} />

              <Text style={s.formSection}>CIN / Passeport</Text>
              <TextInput style={s.input} placeholder="Numéro document"                placeholderTextColor={colors.dustTaupe} value={idNumber}      onChangeText={setIdNumber}      autoCapitalize="characters" />
              <DatePickerButton label="Date d'expiration"   value={cinExpiry}     onPress={() => setDatePickerFor('cin')}     onClear={() => setCinExpiry('')} />

              <Text style={s.formSection}>Permis de conduire</Text>
              <TextInput style={s.input} placeholder="Numéro permis"                  placeholderTextColor={colors.dustTaupe} value={licenceNumber} onChangeText={setLicenceNumber} autoCapitalize="characters" />
              <DatePickerButton label="Date d'expiration"   value={licenceExpiry} onPress={() => setDatePickerFor('licence')} onClear={() => setLicenceExpiry('')} />
            </View>
          )}

          <TouchableOpacity
            style={[s.nextBtn, !canNext && s.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canNext}
          >
            <Text style={s.nextBtnText}>Suivant →</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {datePickerFor && (
        <DateTimePicker
          value={currentDateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDatePicked}
        />
      )}
    </>
  )
}

function DatePickerButton({ label, value, onPress, onClear }) {
  const display = value ? fmtDate(normalizeDate(value) || value) : null
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          style={{
            flex: 1,
            backgroundColor: colors.white,
            borderRadius: radius.button,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            paddingHorizontal: 16,
            paddingVertical: 12,
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: display ? colors.ink : colors.dustTaupe, fontFamily: fonts.regular, fontSize: 15 }}>
            {display || 'Choisir une date'}
          </Text>
        </TouchableOpacity>
        {value ? (
          <TouchableOpacity
            onPress={onClear}
            style={{
              width: 44, height: 44, borderRadius: radius.button,
              borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.white,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.slate, fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: colors.canvas },
  scrollContent:     { padding: spacing.md, paddingBottom: spacing.xl + 16 },
  sectionTitle:      { ...typography.cardTitle, marginBottom: spacing.sm },
  input:             { ...input },
  clientRow:         { backgroundColor: colors.white, borderRadius: radius.card, padding: spacing.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  clientRowSelected: { borderColor: colors.ink, borderWidth: 1.5 },
  clientName:        { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  clientSub:         { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginTop: 3 },
  empty:             { color: colors.slate, fontFamily: fonts.regular, textAlign: 'center', padding: spacing.lg },
  selectedBadge:     { backgroundColor: colors.softBone, borderRadius: radius.card, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.ink },
  selectedText:      { color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },
  newClientBtn:      { marginVertical: 12, alignItems: 'center' },
  newClientText:     { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  form:              { marginBottom: 8 },
  formSection:       { ...typography.eyebrow, marginTop: spacing.md, marginBottom: spacing.sm },
  scanRow:           { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
  scanBtn:           { ...btnPrimary, flex: 1, marginTop: 0, paddingVertical: 13 },
  scanBtnPermis:     { backgroundColor: colors.charcoal, borderColor: colors.charcoal },
  scanBtnDisabled:   { opacity: 0.5 },
  scanBtnText:       { ...btnPrimaryText, fontSize: 13 },
  nextBtn:           { ...btnPrimary, marginBottom: 30 },
  nextBtnDisabled:   { opacity: 0.4 },
  nextBtnText:       { ...btnPrimaryText },
})
