import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radius, spacing, fonts, typography } from '../../theme'

import Step1ClientScreen  from './Step1ClientScreen'
import Step2DetailsScreen from './Step2DetailsScreen'
import Step3PhotosScreen  from './Step3PhotosScreen'
import Step4ConfirmScreen from './Step4ConfirmScreen'

const STEPS = ['Client', 'Détails', 'Photos', 'Confirmer']

function StepBar({ current }) {
  return (
    <View style={s.stepBar}>
      {STEPS.map((label, i) => {
        const done   = i < current
        const active = i === current
        return (
          <View key={i} style={s.stepItem}>
            <View style={[s.stepDot, done && s.stepDone, active && s.stepActive]}>
              <Text style={[s.stepNum, (done || active) && s.stepNumActive]}>
                {done ? '✓' : i + 1}
              </Text>
            </View>
            <Text style={[s.stepLabel, active && s.stepLabelActive]}>{label}</Text>
            {i < STEPS.length - 1 && <View style={[s.stepLine, done && s.stepLineDone]} />}
          </View>
        )
      })}
    </View>
  )
}

export default function NewRentalScreen({ navigation, route }) {
  // Optional prefill from a converted lead (Wave 2). Keys map to the field
  // setters below — fields absent in the prefill keep their defaults.
  const prefill = route?.params?.prefill || null

  const [step,   setStep]   = useState(0)
  const [client, setClient] = useState(null)
  const [rental, setRental] = useState(null)
  const [photos, setPhotos] = useState({})

  // Step 1 form state lives here so it survives remounts when navigating back
  const [showForm,      setShowForm]      = useState(!!prefill)
  const [query,         setQuery]         = useState('')
  const [selected,      setSelected]      = useState(null)
  const [firstName,     setFirstName]     = useState(prefill?.firstName || '')
  const [lastName,      setLastName]      = useState(prefill?.lastName  || '')
  const [phone,         setPhone]         = useState(prefill?.phone     || '')
  const [email,         setEmail]         = useState(prefill?.email     || '')
  const [idNumber,      setIdNumber]      = useState(prefill?.cinNumber || '')
  const [cinExpiry,     setCinExpiry]     = useState(prefill?.cinExpiry || '')
  const [birthDate,     setBirthDate]     = useState(prefill?.dateOfBirth || '')
  const [nationality,   setNationality]   = useState(prefill?.nationality || 'Marocain')
  const [licenceNumber, setLicenceNumber] = useState(prefill?.drivingLicenseNumber || '')
  const [licenceExpiry, setLicenceExpiry] = useState(prefill?.licenseExpiry || '')

  const handleStep1 = (selectedClient) => { setClient(selectedClient); setStep(1) }
  const handleStep2 = (rentalDetails)  => { setRental(rentalDetails);  setStep(2) }
  const handleStep3 = (capturedPhotos) => { setPhotos(capturedPhotos); setStep(3) }
  const handleDone  = () => navigation.goBack()

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Nouvelle location</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.cancelBtn}>
          <Text style={s.cancelText}>Annuler</Text>
        </TouchableOpacity>
      </View>

      <StepBar current={step} />

      <View style={{ flex: 1 }}>
        {step === 0 && (
          <Step1ClientScreen
            onNext={handleStep1}
            // form visibility
            showForm={showForm}        setShowForm={setShowForm}
            // search
            query={query}              setQuery={setQuery}
            selected={selected}        setSelected={setSelected}
            // identity fields
            firstName={firstName}      setFirstName={setFirstName}
            lastName={lastName}        setLastName={setLastName}
            phone={phone}              setPhone={setPhone}
            email={email}              setEmail={setEmail}
            idNumber={idNumber}        setIdNumber={setIdNumber}
            cinExpiry={cinExpiry}      setCinExpiry={setCinExpiry}
            birthDate={birthDate}      setBirthDate={setBirthDate}
            nationality={nationality}  setNationality={setNationality}
            // licence fields
            licenceNumber={licenceNumber} setLicenceNumber={setLicenceNumber}
            licenceExpiry={licenceExpiry} setLicenceExpiry={setLicenceExpiry}
          />
        )}
        {step === 1 && (
          <Step2DetailsScreen onNext={handleStep2} onBack={() => setStep(0)} />
        )}
        {step === 2 && (
          <Step3PhotosScreen onNext={handleStep3} onBack={() => setStep(1)} />
        )}
        {step === 3 && (
          <Step4ConfirmScreen
            client={client}
            rental={rental}
            photos={photos}
            onBack={() => setStep(2)}
            onDone={handleDone}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.canvas },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title:           { ...typography.cardTitle, fontFamily: fonts.medium, fontSize: 19 },
  cancelBtn:       { backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: colors.borderStrong },
  cancelText:      { color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },
  stepBar:         { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.canvas },
  stepItem:        { alignItems: 'center', flexDirection: 'row' },
  stepDot:         { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: 'center', alignItems: 'center' },
  stepDone:        { backgroundColor: colors.success, borderColor: colors.success },
  stepActive:      { backgroundColor: colors.ink, borderColor: colors.ink },
  stepNum:         { color: colors.slate, fontFamily: fonts.bold, fontSize: 12 },
  stepNumActive:   { color: colors.canvas },
  stepLabel:       { color: colors.slate, fontFamily: fonts.regular, fontSize: 10, marginHorizontal: 4 },
  stepLabelActive: { color: colors.ink, fontFamily: fonts.medium },
  stepLine:        { width: 20, height: 1, backgroundColor: colors.border, marginHorizontal: 2 },
  stepLineDone:    { backgroundColor: colors.success },
})
