import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getGmailStatus, saveGmailCredentials, deleteGmailCredentials, pollGmailNow } from '../../lib/db'
import { colors, radius, spacing, fonts, typography } from '../../theme'

function maskEmail(e) {
  if (!e) return ''
  const [u, d] = e.split('@')
  if (!d) return e
  return `${u.slice(0, 2)}***@${d}`
}

export default function GmailScreen({ navigation }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [address, setAddress] = useState('')
  const [appPwd, setAppPwd]   = useState('')
  const [showPwd, setShowPwd] = useState(false)

  async function load() {
    setLoading(true)
    try { setStatus(await getGmailStatus()) }
    catch (e) { Alert.alert('Erreur', e?.message || 'Chargement impossible') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!address.trim() || !appPwd.trim()) {
      Alert.alert('Champs requis', 'Adresse Gmail et mot de passe d\'application requis.'); return
    }
    setActing(true)
    try {
      await saveGmailCredentials(address.trim(), appPwd.trim())
      setAppPwd(''); setAddress('')
      await load()
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Sauvegarde impossible')
    } finally { setActing(false) }
  }

  async function disconnect() {
    Alert.alert('Déconnecter Gmail', "Confirmer la déconnexion ?", [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: async () => {
        setActing(true)
        try { await deleteGmailCredentials(); await load() }
        catch (e) { Alert.alert('Erreur', e?.message || 'Action impossible') }
        finally { setActing(false) }
      } },
    ])
  }

  async function pollNow() {
    setActing(true)
    try { await pollGmailNow(); Alert.alert('Relevé terminé'); await load() }
    catch (e) { Alert.alert('Erreur', e?.message || 'Relevé impossible') }
    finally { setActing(false) }
  }

  if (loading) {
    return <SafeAreaView style={s.container}><View style={s.center}><ActivityIndicator color={colors.ink} /></View></SafeAreaView>
  }

  const connected = !!status?.connected

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Gmail</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
        <View style={[s.statusCard, connected ? s.statusCardOk : s.statusCardOff]}>
          <Text style={[s.statusText, connected ? s.statusOk : s.statusOff]}>
            {connected ? '● Connecté' : '○ Non connecté'}
          </Text>
          {connected && status?.gmail_address ? (
            <Text style={s.statusSub}>{maskEmail(status.gmail_address)}</Text>
          ) : null}
          {connected && status?.last_polled ? (
            <Text style={s.statusSub}>Dernier relevé : {new Date(status.last_polled).toLocaleString('fr-FR')}</Text>
          ) : null}
        </View>

        {connected ? (
          <>
            <TouchableOpacity disabled={acting} onPress={pollNow} style={[s.btnSecondary, acting && { opacity: 0.6 }]} activeOpacity={0.8}>
              <Text style={s.btnSecondaryText}>{acting ? 'Patientez…' : 'Relever maintenant'}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={acting} onPress={disconnect} style={[s.btnDanger, acting && { opacity: 0.6 }]} activeOpacity={0.8}>
              <Text style={s.btnDangerText}>Déconnecter</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.help}>
              Utilisez un mot de passe d'application Google (pas votre mot de passe principal).{' '}
              <Text style={s.link} onPress={() => Linking.openURL('https://myaccount.google.com/apppasswords')}>
                Créer un mot de passe d'application →
              </Text>
            </Text>
            <Text style={s.label}>Adresse Gmail</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="agence@gmail.com"
              placeholderTextColor={colors.dustTaupe}
              style={s.input}
            />
            <Text style={s.label}>Mot de passe d'application (16 caractères)</Text>
            <View style={s.pwdWrap}>
              <TextInput
                value={appPwd}
                onChangeText={setAppPwd}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showPwd}
                placeholder="xxxx xxxx xxxx xxxx"
                placeholderTextColor={colors.dustTaupe}
                style={[s.input, { flex: 1, marginRight: 8 }]}
              />
              <TouchableOpacity onPress={() => setShowPwd(p => !p)} style={s.eyeBtn}>
                <Text style={s.eye}>{showPwd ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.hint}>Stocké chiffré AES-256 côté serveur — jamais retransmis.</Text>
            <TouchableOpacity disabled={acting} onPress={save} style={[s.btnPrimary, acting && { opacity: 0.6 }]} activeOpacity={0.8}>
              <Text style={s.btnPrimaryText}>{acting ? 'Connexion…' : 'Connecter'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.ink, fontSize: 22, width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  statusCard: { padding: spacing.md, borderRadius: radius.card, borderWidth: 1, marginBottom: spacing.md },
  statusCardOk: { backgroundColor: '#E8F7EE', borderColor: 'rgba(30,127,58,0.25)' },
  statusCardOff: { backgroundColor: colors.softBone, borderColor: colors.borderStrong },
  statusText: { fontFamily: fonts.bold, fontSize: 14 },
  statusOk: { color: colors.success },
  statusOff: { color: colors.slate },
  statusSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginTop: 4 },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: fonts.regular, fontSize: 14 },
  pwdWrap: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { padding: 8 },
  eye: { fontSize: 22 },
  hint: { color: colors.slate, fontFamily: fonts.regular, fontSize: 11, marginTop: 6 },
  help: { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, marginBottom: 8 },
  link: { color: colors.link, fontFamily: fonts.medium },
  btnPrimary: { marginTop: spacing.md, backgroundColor: colors.ink, paddingVertical: 13, borderRadius: radius.button, alignItems: 'center' },
  btnPrimaryText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 14 },
  btnSecondary: { marginTop: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, paddingVertical: 13, borderRadius: radius.button, alignItems: 'center' },
  btnSecondaryText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  btnDanger: { marginTop: 8, borderWidth: 1, borderColor: colors.danger + '66', paddingVertical: 13, borderRadius: radius.button, alignItems: 'center' },
  btnDangerText: { color: colors.danger, fontFamily: fonts.bold, fontSize: 14 },
})
