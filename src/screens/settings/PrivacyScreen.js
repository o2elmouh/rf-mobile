import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRole } from '../../lib/useRole'
import { colors, radius, spacing, fonts, typography } from '../../theme'

export default function PrivacyScreen({ navigation }) {
  const { isAdmin } = useRole()

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Confidentialité</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
        <View style={s.card}>
          <Text style={s.title}>Anonymisation client (loi 09-08)</Text>
          <Text style={s.body}>
            Pour anonymiser un client conformément à la loi 09-08 (droit à l'oubli), ouvrez la fiche client, puis utilisez l'action « Anonymiser ».
          </Text>
          {!isAdmin ? (
            <Text style={s.muted}>Réservé aux administrateurs.</Text>
          ) : null}
        </View>

        <View style={s.card}>
          <Text style={s.title}>Conservation des données</Text>
          <Text style={s.body}>
            La durée de conservation des données est définie par votre agence (réglage « Conservation » dans Agence). Au-delà, les enregistrements sont anonymisés automatiquement.
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.title}>Cryptage des PII</Text>
          <Text style={s.body}>
            Les identifiants (CIN, passeport, permis) sont chiffrés AES-256-GCM côté serveur dès leur enregistrement.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.ink, fontSize: 22, width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  card: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: 10 },
  title: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginBottom: 8 },
  body: { fontFamily: fonts.regular, fontSize: 13, color: colors.slate, lineHeight: 19 },
  muted: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginTop: 8, fontStyle: 'italic' },
})
