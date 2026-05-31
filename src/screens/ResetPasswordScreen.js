import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import { supabase } from '../lib/supabase'
import {
  colors, radius, spacing, fonts, typography,
  input, btnPrimary, btnPrimaryText,
} from '../theme'

export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [success,  setSuccess]  = useState(false)

  const handleReset = async () => {
    if (!password) { setError('Mot de passe requis'); return }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    setError(null); setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <KeyboardAvoidingView style={s.container}>
        <View style={s.scroll}>
          <View style={s.logo}><Text style={s.logoText}>RF</Text></View>
          <View style={s.card}>
            <Text style={s.successIcon}>✅</Text>
            <Text style={s.title}>Mot de passe mis à jour</Text>
            <Text style={s.subtitle}>Votre mot de passe a été modifié avec succès.</Text>
            <TouchableOpacity style={btnPrimary} onPress={onDone} activeOpacity={0.85}>
              <Text style={btnPrimaryText}>Continuer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    )
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.logo}><Text style={s.logoText}>RF</Text></View>
        <View style={s.card}>
          <Text style={s.title}>Nouveau mot de passe</Text>
          <Text style={s.subtitle}>Choisissez un nouveau mot de passe pour votre compte</Text>

          {error && <Text style={s.error}>{error}</Text>}

          <TextInput style={s.input} placeholder="Nouveau mot de passe" placeholderTextColor={colors.dustTaupe}
            value={password} onChangeText={t => { setPassword(t); setError(null) }}
            secureTextEntry autoFocus />
          <TextInput style={s.input} placeholder="Confirmer le mot de passe" placeholderTextColor={colors.dustTaupe}
            value={confirm} onChangeText={t => { setConfirm(t); setError(null) }}
            secureTextEntry />

          <TouchableOpacity style={[btnPrimary, loading && { opacity: 0.5 }]} onPress={handleReset} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={colors.canvas} /> : <Text style={btnPrimaryText}>Enregistrer</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.canvas },
  scroll:      { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  logo:        { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.ink, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing.lg },
  logoText:    { color: colors.canvas, fontFamily: fonts.medium, fontSize: 26, letterSpacing: -1 },
  card:        { backgroundColor: colors.lifted, borderRadius: radius.hero, padding: spacing.lg + 4, borderWidth: 1, borderColor: colors.border },
  title:       { fontFamily: fonts.medium, fontSize: 24, lineHeight: 28, letterSpacing: -0.5, color: colors.ink, textAlign: 'center', marginBottom: 4 },
  subtitle:    { ...typography.cardSub, textAlign: 'center', marginBottom: spacing.lg },
  successIcon: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  error:       { backgroundColor: 'rgba(178,56,36,0.08)', borderRadius: radius.button, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: colors.danger, color: colors.danger, fontFamily: fonts.regular, fontSize: 13 },
  input:       { ...input },
})
