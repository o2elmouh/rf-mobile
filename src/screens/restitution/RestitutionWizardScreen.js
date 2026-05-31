import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ReturnStep       from './ReturnStep'
import ReturnPhotosStep from './ReturnPhotosStep'
import AiDamagePanel    from './AiDamagePanel'
import ClosureStep      from './ClosureStep'
import { colors, radius, spacing, fonts } from '../../theme'

const STEPS = ['Retour', 'Photos', 'Analyse', 'Clôture']

export default function RestitutionWizardScreen({ route, navigation }) {
  const { contract } = route.params

  const [step,       setStep]       = useState(0)
  const [returnData, setReturnData] = useState(null)
  const [photos,     setPhotos]     = useState({})
  const [aiResult,   setAiResult]   = useState(null) // { damages, hasDamage, ... } | null

  const handleReturnNext  = (data)      => { setReturnData(data); setStep(1) }
  const handlePhotosNext  = (photoData) => { setPhotos(photoData); setStep(2) }
  const handlePhotosSkip  = ()          => { setPhotos({});        setStep(2) }
  const handleAiNext      = (ai)        => { setAiResult(ai);      setStep(3) }
  const handleAiSkip      = ()          => { setAiResult(null);    setStep(3) }
  const handleDone        = ()          => { navigation.navigate('Main', { screen: 'Dashboard' }) }

  const goBack = () => {
    if (step === 0) navigation.goBack()
    else setStep(s => s - 1)
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          {contract.contract_number} — {contract.client_name || ''}
        </Text>
      </View>

      {/* Step bar */}
      <View style={s.stepBar}>
        {STEPS.map((label, i) => (
          <View key={label} style={s.stepItem}>
            <View style={[s.stepDot, i === step && s.stepDotActive, i < step && s.stepDotDone]}>
              <Text style={[s.stepDotText, (i === step || i < step) && s.stepDotTextActive]}>
                {i < step ? '✓' : i + 1}
              </Text>
            </View>
            <Text style={[s.stepLabel, i === step && s.stepLabelActive]}>{label}</Text>
            {i < STEPS.length - 1 && (
              <View style={[s.stepLine, i < step && s.stepLineDone]} />
            )}
          </View>
        ))}
      </View>

      {/* Step content */}
      <View style={s.content}>
        {step === 0 && (
          <ReturnStep contract={contract} onNext={handleReturnNext} />
        )}
        {step === 1 && (
          <ReturnPhotosStep onNext={handlePhotosNext} onSkip={handlePhotosSkip} />
        )}
        {step === 2 && (
          <AiDamagePanel
            contract={contract}
            afterPhotos={photos}
            onNext={handleAiNext}
            onSkip={handleAiSkip}
          />
        )}
        {step === 3 && returnData && (
          <ClosureStep
            contract={contract}
            returnData={returnData}
            photos={photos}
            aiResult={aiResult}
            onDone={handleDone}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: colors.canvas },
  header:            { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn:           { minWidth: 64 },
  backText:          { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  headerTitle:       { color: colors.ink, fontFamily: fonts.medium, fontSize: 14, flex: 1 },
  stepBar:           { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  stepItem:          { alignItems: 'center', flexDirection: 'row', gap: 6 },
  stepDot:           { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: 'center', alignItems: 'center' },
  stepDotActive:     { borderColor: colors.ink, backgroundColor: colors.ink },
  stepDotDone:       { borderColor: colors.success, backgroundColor: colors.success },
  stepDotText:       { color: colors.slate, fontFamily: fonts.bold, fontSize: 12 },
  stepDotTextActive: { color: colors.canvas },
  stepLabel:         { color: colors.slate, fontFamily: fonts.regular, fontSize: 11, marginTop: 0 },
  stepLabelActive:   { color: colors.ink, fontFamily: fonts.medium },
  stepLine:          { width: 18, height: 1, backgroundColor: colors.border, marginHorizontal: 4 },
  stepLineDone:      { backgroundColor: colors.success },
  content:           { flex: 1 },
})
