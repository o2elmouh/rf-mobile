import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native'
import Constants from 'expo-constants'
import { SafeAreaView } from 'react-native-safe-area-context'
import { APP_VERSION } from '../../lib/version'
import { apiBaseUrl } from '../../lib/api'
import { colors, radius, spacing, fonts, typography } from '../../theme'

function maskUrl(u) {
  try {
    const url = new URL(u)
    return `${url.protocol}//${url.hostname}`
  } catch { return u }
}

export default function AboutScreen({ navigation }) {
  const buildNumber = Constants.expoConfig?.runtimeVersion
    || Constants.expoConfig?.version
    || Constants.nativeBuildVersion
    || '—'

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>À propos</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <View style={s.brandCard}>
          <Text style={s.brand}>RentaFlow</Text>
          <Text style={s.tagline}>Gestion de location de véhicules</Text>
        </View>

        <View style={s.card}>
          <Row label="Version" value={APP_VERSION} />
          <Row label="Build" value={String(buildNumber)} />
          <Row label="Backend" value={maskUrl(apiBaseUrl)} />
        </View>

        <View style={s.card}>
          <Text style={s.title}>Crédits</Text>
          <Text style={s.body}>Construit avec React Native, Expo et Supabase.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.ink, fontSize: 22, width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  brandCard: { alignItems: 'center', padding: spacing.lg, marginBottom: spacing.md },
  brand: { fontFamily: fonts.bold, fontSize: 32, color: colors.ink, letterSpacing: -1 },
  tagline: { fontFamily: fonts.regular, fontSize: 13, color: colors.slate, marginTop: 6 },
  card: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: 10 },
  title: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginBottom: 8 },
  body: { fontFamily: fonts.regular, fontSize: 13, color: colors.slate, lineHeight: 19 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  rowValue: { color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },
})
