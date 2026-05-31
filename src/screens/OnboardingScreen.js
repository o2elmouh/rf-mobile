import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import { supabase } from '../lib/supabase'
import {
  colors, radius, spacing, fonts, typography,
  input, btnPrimary, btnPrimaryText, btnSecondary, btnSecondaryText,
} from '../theme'

export default function OnboardingScreen({ user, onComplete }) {
  const [step,       setStep]       = useState(1)
  const [fullName,   setFullName]   = useState(user?.user_metadata?.full_name || '')
  const [phone,      setPhone]      = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [city,       setCity]       = useState('')
  const [ice,        setIce]        = useState('')
  const [rc,         setRc]         = useState('')
  const [error,      setError]      = useState(null)
  const [loading,    setLoading]    = useState(false)

  const goNext = () => {
    if (!fullName.trim()) { setError('Le nom complet est requis'); return }
    setError(null)
    setStep(2)
  }

  const handleCreate = async () => {
    setError(null)
    if (!agencyName.trim()) { setError("Le nom de l'agence est requis"); return }
    setLoading(true)
    try {
      console.log('[Onboarding] calling RPC with user_id:', user.id, 'email:', user.email)
      const start = Date.now()
      const { data, error } = await supabase.rpc('onboard_new_agency', {
        p_user_id:     user.id,
        p_agency_name: agencyName.trim(),
        p_full_name:   fullName.trim(),
        p_email:       user.email,
        p_phone:       phone.trim() || null,
        p_city:        city.trim() || null,
        p_ice:         ice.trim() || null,
        p_rc:          rc.trim() || null,
      })
      console.log('[Onboarding] RPC completed in', Date.now() - start, 'ms — data:', data, 'error:', error)
      if (error) throw error
      console.log('[Onboarding] success, agency_id:', data)
      onComplete && onComplete()
    } catch (err) {
      console.error('[Onboarding] caught error:', JSON.stringify(err))
      setError(err.message || 'Une erreur est survenue.')
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.logo}>
          <Text style={s.logoText}>RF</Text>
        </View>

        {/* Progress bar */}
        <View style={s.progress}>
          <View style={[s.progressBar, step >= 1 && s.progressActive]} />
          <View style={[s.progressBar, step >= 2 && s.progressActive]} />
        </View>

        <View style={s.card}>
          <Text style={s.title}>{step === 1 ? 'Votre profil' : 'Votre agence'}</Text>
          <Text style={s.subtitle}>
            {step === 1
              ? 'Dites-nous qui vous êtes'
              : 'Informations sur votre agence de location'}
          </Text>

          {error && <Text style={s.error}>{error}</Text>}

          {step === 1 ? (
            <>
              <TouchableOpacity style={s.backBtn} onPress={() => supabase.auth.signOut()}>
                <Text style={s.backBtnText}>← Retour</Text>
              </TouchableOpacity>

              <Text style={s.label}>Nom complet *</Text>
              <TextInput style={s.input} placeholder="Ex: Youssef El Amrani"
                placeholderTextColor={colors.dustTaupe} value={fullName}
                onChangeText={t => { setFullName(t); setError(null) }}
                autoFocus />

              <Text style={s.label}>Téléphone</Text>
              <TextInput style={s.input} placeholder="Ex: 0612345678"
                placeholderTextColor={colors.dustTaupe} value={phone}
                onChangeText={t => { setPhone(t); setError(null) }}
                keyboardType="phone-pad" />

              <TouchableOpacity style={s.btn} onPress={goNext}>
                <Text style={s.btnText}>Suivant →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.label}>Nom de l'agence *</Text>
              <TextInput style={s.input} placeholder="Ex: AutoRent Casablanca"
                placeholderTextColor={colors.dustTaupe} value={agencyName}
                onChangeText={t => { setAgencyName(t); setError(null) }}
                autoFocus />

              <Text style={s.label}>Ville</Text>
              <TextInput style={s.input} placeholder="Ex: Casablanca"
                placeholderTextColor={colors.dustTaupe} value={city}
                onChangeText={t => { setCity(t); setError(null) }} />

              <Text style={s.label}>ICE</Text>
              <TextInput style={s.input} placeholder="15 chiffres"
                placeholderTextColor={colors.dustTaupe} value={ice}
                onChangeText={t => { setIce(t); setError(null) }}
                keyboardType="numeric" maxLength={15} />

              <Text style={s.label}>RC</Text>
              <TextInput style={s.input} placeholder="Numéro RC"
                placeholderTextColor={colors.dustTaupe} value={rc}
                onChangeText={t => { setRc(t); setError(null) }} />

              <View style={s.row}>
                <TouchableOpacity style={s.btnBack} onPress={() => { setStep(1); setError(null) }}>
                  <Text style={s.btnBackText}>← Retour</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, s.btnFlex, loading && s.btnDisabled]}
                  onPress={handleCreate} disabled={loading}>
                  {loading
                    ? <ActivityIndicator color={colors.canvas} />
                    : <Text style={s.btnText}>Créer mon agence</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity style={s.signOut} onPress={() => supabase.auth.signOut()}>
          <Text style={s.signOutText}>Connecté en tant que {user?.email} · Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.canvas },
  scroll:         { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  logo:           { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.ink, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing.md },
  logoText:       { color: colors.canvas, fontFamily: fonts.medium, fontSize: 26, letterSpacing: -1 },
  progress:       { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  progressBar:    { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  progressActive: { backgroundColor: colors.ink },
  card:           { backgroundColor: colors.lifted, borderRadius: radius.hero, padding: spacing.lg + 4, borderWidth: 1, borderColor: colors.border },
  title:          { fontFamily: fonts.medium, fontSize: 24, lineHeight: 28, letterSpacing: -0.5, color: colors.ink, textAlign: 'center', marginBottom: 4 },
  subtitle:       { ...typography.cardSub, textAlign: 'center', marginBottom: spacing.lg },
  error:          { backgroundColor: 'rgba(178,56,36,0.08)', borderRadius: radius.button, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: colors.danger, color: colors.danger, fontFamily: fonts.regular, fontSize: 13 },
  label:          { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, marginBottom: 6, marginTop: 4 },
  input:          { ...input },
  btn:            { ...btnPrimary },
  btnFlex:        { flex: 1 },
  btnDisabled:    { opacity: 0.5 },
  btnText:        { ...btnPrimaryText },
  btnBack:        { ...btnSecondary, paddingHorizontal: 20 },
  btnBackText:    { ...btnSecondaryText },
  row:            { flexDirection: 'row', gap: 10 },
  backBtn:        { marginBottom: 16 },
  backBtnText:    { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  signOut:        { marginTop: spacing.lg, alignItems: 'center' },
  signOutText:    { color: colors.slate, fontFamily: fonts.regular, fontSize: 11 },
})
