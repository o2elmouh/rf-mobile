import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { supabase } from '../lib/supabase'

export default function LoginScreen() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Erreur', 'Email et mot de passe requis')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Erreur de connexion', error.message)
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.card}>
        <Text style={s.logo}>RF</Text>
        <Text style={s.title}>RentaFlow</Text>
        <Text style={s.subtitle}>Connectez-vous à votre espace</Text>

        <TextInput style={s.input} placeholder="Email" placeholderTextColor="#666"
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={s.input} placeholder="Mot de passe" placeholderTextColor="#666"
          value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Connexion...' : 'Se connecter'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', justifyContent: 'center', padding: 24 },
  card:      { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 28, alignItems: 'center' },
  logo:      { width: 56, height: 56, borderRadius: 14, backgroundColor: '#e94560', textAlign: 'center', lineHeight: 56, color: '#fff', fontWeight: '800', fontSize: 22, overflow: 'hidden' },
  title:     { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 12 },
  subtitle:  { color: '#888', fontSize: 13, marginBottom: 28, marginTop: 4 },
  input:     { width: '100%', backgroundColor: '#0f0f1a', borderRadius: 10, borderWidth: 1, borderColor: '#333', color: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  btn:       { width: '100%', backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
})
