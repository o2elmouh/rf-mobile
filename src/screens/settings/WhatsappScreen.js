import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getWhatsappStatus, getAgencyApi } from '../../lib/db'
import { colors, radius, spacing, fonts, typography } from '../../theme'

export default function WhatsappScreen({ navigation }) {
  const [status, setStatus] = useState(null)
  const [agency, setAgency] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getWhatsappStatus().catch(() => ({ status: 'twilio', connected: false })),
      getAgencyApi().catch(() => null),
    ]).then(([st, ag]) => { setStatus(st); setAgency(ag) }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <SafeAreaView style={s.container}><View style={s.center}><ActivityIndicator color={colors.ink} /></View></SafeAreaView>
  }

  const connected = !!status?.connected
  const number = agency?.whatsapp_number || agency?.phone || null

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>WhatsApp</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <View style={[s.statusCard, connected ? s.ok : s.off]}>
          <Text style={[s.statusText, connected ? s.okText : s.offText]}>
            {connected ? '● Connecté via Twilio' : '○ Non connecté'}
          </Text>
        </View>

        {number ? (
          <View style={s.infoCard}>
            <Text style={s.label}>Numéro WhatsApp configuré</Text>
            <Text style={s.value}>{number}</Text>
          </View>
        ) : null}

        <View style={s.helpCard}>
          <Text style={s.helpTitle}>Modifier la connexion</Text>
          <Text style={s.help}>
            Les identifiants Twilio sont configurés côté serveur (variables d'environnement). Pour modifier le numéro WhatsApp ou les clés, contactez le support technique.
          </Text>
        </View>
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
  ok: { backgroundColor: '#E8F7EE', borderColor: 'rgba(30,127,58,0.25)' },
  off: { backgroundColor: colors.softBone, borderColor: colors.borderStrong },
  statusText: { fontFamily: fonts.bold, fontSize: 14 },
  okText: { color: colors.success },
  offText: { color: colors.slate },
  infoCard: { backgroundColor: colors.white, padding: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginBottom: 4 },
  value: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  helpCard: { backgroundColor: '#EEF0FF', padding: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: 'rgba(99,102,241,0.20)' },
  helpTitle: { fontFamily: fonts.bold, fontSize: 13, color: '#4F46E5', marginBottom: 6 },
  help: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink, lineHeight: 19 },
})
