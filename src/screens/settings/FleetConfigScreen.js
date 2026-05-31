import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getFleetConfig } from '../../lib/db'
import { colors, radius, spacing, fonts, typography } from '../../theme'

function Row({ label, value }) {
  if (value == null || value === '') return null
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{String(value)}</Text>
    </View>
  )
}

export default function FleetConfigScreen({ navigation }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFleetConfig().then(setRows).finally(() => setLoading(false))
  }, [])

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Parc & maintenance</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
        <View style={s.noteCard}>
          <Text style={s.note}>Lecture seule. Modifiez ces réglages sur l'application web.</Text>
        </View>

        {loading ? (
          <View style={s.center}><ActivityIndicator color={colors.ink} /></View>
        ) : rows.length === 0 ? (
          <Text style={s.empty}>Aucune configuration enregistrée.</Text>
        ) : rows.map(r => (
          <View key={r.id} style={s.card}>
            <Text style={s.make}>{r.make || '—'}</Text>
            <Row label="Garantie générale" value={r.warranty_general} />
            <Row label="Années garantie"    value={r.warranty_years} />
            <Row label="Garantie batterie"  value={r.warranty_battery} />
            <Row label="Visite technique (ans)" value={r.control_tech_years} />
            <Row label="Vidange (km)"        value={r.vidange_km} />
            <Row label="Courroie (km)"       value={r.courroie_km} />
            <Row label="Extension"           value={r.extension} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  center: { paddingVertical: 40, alignItems: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.ink, fontSize: 22, width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  noteCard: { backgroundColor: '#FFF6E6', borderColor: '#F59E0B55', borderWidth: 1, borderRadius: radius.card, padding: 12, marginBottom: 12 },
  note: { color: '#92400E', fontFamily: fonts.medium, fontSize: 13 },
  card: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: 10 },
  make: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  rowValue: { color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },
  empty: { color: colors.slate, fontFamily: fonts.regular, textAlign: 'center', padding: 40 },
})
