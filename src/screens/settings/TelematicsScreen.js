import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radius, spacing, fonts, typography } from '../../theme'

// The web server returns 503 on every /telemetry/* route ("Telemetry disabled
// in v2"). We surface that state honestly on mobile rather than calling an
// endpoint we know will fail.
export default function TelematicsScreen({ navigation }) {
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Télématique</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <View style={s.card}>
          <Text style={s.title}>Module désactivé</Text>
          <Text style={s.body}>
            Le module télématique (boîtiers GPS) est désactivé dans cette version. Il sera réactivé dans une mise à jour ultérieure.
          </Text>
          <Text style={s.body}>
            Pour configurer un boîtier sur un véhicule, utilisez l'application web une fois la fonctionnalité réactivée.
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
  card: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink, marginBottom: 10 },
  body: { fontFamily: fonts.regular, fontSize: 14, color: colors.slate, lineHeight: 21, marginBottom: 10 },
})
