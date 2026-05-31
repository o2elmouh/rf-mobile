import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { supabase } from '../lib/supabase'
import LanguageSelector from '../components/LanguageSelector'
import { APP_VERSION } from '../lib/version'
import {
  colors, radius, spacing, fonts, typography,
  input, btnPrimary, btnPrimaryText, btnSecondary, btnSecondaryText,
} from '../theme'

// ── Views ─────────────────────────────────────────────────────
const VIEW = { LOGIN: 'login', SIGNUP: 'signup', FORGOT: 'forgot', FORGOT_SENT: 'forgot_sent' }

// ── Login ─────────────────────────────────────────────────────
function LoginView({ onSignUp, onForgot }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const handleLogin = async () => {
    if (!email || !password) { setError('Email et mot de passe requis'); return }
    setError(null); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <>
      <Text style={s.title}>Connectez-vous</Text>
      <Text style={s.subtitle}>Bienvenue dans votre espace</Text>

      {error && <View style={s.error}><Text style={s.errorText}>{error}</Text></View>}

      <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.dustTaupe}
        value={email} onChangeText={t => { setEmail(t); setError(null) }}
        keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Mot de passe" placeholderTextColor={colors.dustTaupe}
        value={password} onChangeText={t => { setPassword(t); setError(null) }}
        secureTextEntry />

      <TouchableOpacity onPress={onForgot} style={s.forgotLink}>
        <Text style={s.forgotText}>Mot de passe oublié ?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[btnPrimary, loading && { opacity: 0.5 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
        <Text style={btnPrimaryText}>{loading ? 'Connexion…' : 'Se connecter'}</Text>
      </TouchableOpacity>

      <View style={s.divider}>
        <View style={s.dividerLine} />
        <Text style={s.dividerText}>ou</Text>
        <View style={s.dividerLine} />
      </View>

      <TouchableOpacity style={btnSecondary} onPress={onSignUp} activeOpacity={0.85}>
        <Text style={btnSecondaryText}>Créer un compte</Text>
      </TouchableOpacity>
    </>
  )
}

// ── Forgot password ───────────────────────────────────────────
function ForgotView({ onBack, onSent }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const handleReset = async () => {
    if (!email.trim()) { setError('Veuillez entrer votre adresse email'); return }
    setError(null); setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(), { redirectTo: 'rentaflow://reset-password' },
    )
    setLoading(false)
    if (resetError) { setError(resetError.message); return }
    onSent(email.trim())
  }

  return (
    <>
      <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backText}>← Retour</Text></TouchableOpacity>
      <Text style={s.title}>Mot de passe oublié</Text>
      <Text style={s.subtitle}>Recevez un lien de réinitialisation par email</Text>

      {error && <View style={s.error}><Text style={s.errorText}>{error}</Text></View>}

      <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.dustTaupe}
        value={email} onChangeText={t => { setEmail(t); setError(null) }}
        keyboardType="email-address" autoCapitalize="none" autoFocus />

      <TouchableOpacity style={[btnPrimary, loading && { opacity: 0.5 }]} onPress={handleReset} disabled={loading} activeOpacity={0.85}>
        <Text style={btnPrimaryText}>{loading ? 'Envoi…' : 'Envoyer le lien'}</Text>
      </TouchableOpacity>
    </>
  )
}

// ── Forgot sent ───────────────────────────────────────────────
function ForgotSentView({ email, onBack }) {
  return (
    <>
      <Text style={s.successIcon}>📧</Text>
      <Text style={s.title}>Email envoyé</Text>
      <Text style={s.subtitle}>
        Un lien de réinitialisation a été envoyé à{'\n'}
        <Text style={{ color: colors.ink, fontFamily: fonts.bold }}>{email}</Text>
        {'\n\n'}Vérifiez votre boîte de réception.
      </Text>
      <TouchableOpacity style={btnPrimary} onPress={onBack} activeOpacity={0.85}>
        <Text style={btnPrimaryText}>Retour à la connexion</Text>
      </TouchableOpacity>
    </>
  )
}

// ── Sign up ───────────────────────────────────────────────────
function SignUpView({ onBack }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [sent,     setSent]     = useState(false)

  const handleSignUp = async () => {
    setError(null)
    if (!email.trim() || !password) { setError('Email et mot de passe requis'); return }
    if (password.length < 6)        { setError('Le mot de passe doit contenir au moins 6 caractères'); return }
    if (password !== confirm)       { setError('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
    setLoading(false)
    if (error) { setError(error.message); return }
    if (!data.session) setSent(true)
  }

  if (sent) {
    return (
      <>
        <Text style={s.successIcon}>📧</Text>
        <Text style={s.title}>Vérifiez votre email</Text>
        <Text style={s.subtitle}>
          Un lien de confirmation a été envoyé à{'\n'}
          <Text style={{ color: colors.ink, fontFamily: fonts.bold }}>{email}</Text>
          {'\n\n'}Confirmez votre email puis revenez vous connecter.
        </Text>
        <TouchableOpacity style={btnPrimary} onPress={onBack} activeOpacity={0.85}>
          <Text style={btnPrimaryText}>Retour à la connexion</Text>
        </TouchableOpacity>
      </>
    )
  }

  return (
    <>
      <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backText}>← Retour</Text></TouchableOpacity>
      <Text style={s.title}>Créer un compte</Text>
      <Text style={s.subtitle}>Créez votre espace RentaFlow</Text>

      {error && <View style={s.error}><Text style={s.errorText}>{error}</Text></View>}

      <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.dustTaupe}
        value={email} onChangeText={t => { setEmail(t); setError(null) }}
        keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Mot de passe (min. 6 caractères)" placeholderTextColor={colors.dustTaupe}
        value={password} onChangeText={t => { setPassword(t); setError(null) }}
        secureTextEntry />
      <TextInput style={s.input} placeholder="Confirmer le mot de passe" placeholderTextColor={colors.dustTaupe}
        value={confirm} onChangeText={t => { setConfirm(t); setError(null) }}
        secureTextEntry />

      <TouchableOpacity style={[btnPrimary, loading && { opacity: 0.5 }]} onPress={handleSignUp} disabled={loading} activeOpacity={0.85}>
        <Text style={btnPrimaryText}>{loading ? 'Création…' : 'Créer le compte'}</Text>
      </TouchableOpacity>
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────
export default function LoginScreen() {
  const [view,      setView]      = useState(VIEW.LOGIN)
  const [sentEmail, setSentEmail] = useState('')

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Brand mark: ink circle with cream "RF" — mirrors Mastercard's circular portraits */}
        <View style={s.logoWrap}>
          <View style={s.logo}>
            <Text style={s.logoText}>RF</Text>
          </View>
          <View style={s.eyebrowRow}>
            <View style={s.eyebrowDot} />
            <Text style={s.eyebrowText}>RENTAFLOW</Text>
          </View>
          <Text style={s.brandName}>Gestion de location</Text>
        </View>

        <View style={s.card}>
          {view === VIEW.LOGIN       && <LoginView       onSignUp={() => setView(VIEW.SIGNUP)} onForgot={() => setView(VIEW.FORGOT)} />}
          {view === VIEW.FORGOT      && <ForgotView      onBack={() => setView(VIEW.LOGIN)} onSent={(em) => { setSentEmail(em); setView(VIEW.FORGOT_SENT) }} />}
          {view === VIEW.FORGOT_SENT && <ForgotSentView  email={sentEmail} onBack={() => setView(VIEW.LOGIN)} />}
          {view === VIEW.SIGNUP      && <SignUpView      onBack={() => setView(VIEW.LOGIN)} />}
        </View>

        <View style={s.footer}>
          <LanguageSelector compact />
          <Text style={s.version}>{APP_VERSION}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  scroll:    { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },

  // Brand — ink circle, eyebrow under
  logoWrap:    { alignItems: 'center', marginBottom: spacing.lg },
  logo: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.ink,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  logoText:    { color: colors.canvas, fontFamily: fonts.medium, fontSize: 30, letterSpacing: -1 },
  eyebrowRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  eyebrowDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.signalSoft },
  eyebrowText: { ...typography.eyebrow, color: colors.ink },
  brandName:   { ...typography.cardSub, marginTop: 4 },

  // Card — lifted cream on canvas
  card: {
    backgroundColor: colors.lifted,
    borderRadius:    radius.hero,   // 40 — editorial stadium
    padding:         spacing.lg + 4,
    borderWidth:     1,
    borderColor:     colors.border,
  },

  // Typography
  title:       { fontFamily: fonts.medium, fontSize: 24, lineHeight: 28, letterSpacing: -0.5, color: colors.ink, textAlign: 'center', marginBottom: 4 },
  subtitle:    { ...typography.cardSub, textAlign: 'center', marginBottom: spacing.lg },
  successIcon: { fontSize: 48, textAlign: 'center', marginBottom: 12 },

  // Error pill
  error:     { backgroundColor: 'rgba(178,56,36,0.08)', borderRadius: radius.button, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: colors.danger },
  errorText: { color: colors.danger, fontFamily: fonts.regular, fontSize: 13 },

  // Inputs — white pill on cream
  input: { ...input },

  // Forgot link
  forgotLink: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 },
  forgotText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },

  // Divider
  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.slate, fontFamily: fonts.regular, fontSize: 12 },

  // Back link
  backBtn:  { marginBottom: 18 },
  backText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },

  // Footer
  footer:  { marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  version: { color: colors.slate, fontFamily: fonts.medium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
})
