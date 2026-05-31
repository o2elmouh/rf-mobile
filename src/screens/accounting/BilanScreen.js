import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { computeAgencyPayout } from '../../lib/accounting'
import { colors, radius, spacing, fonts, typography } from '../../theme'

function firstOfMonth() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10)
}
function today() { return new Date().toISOString().slice(0, 10) }

export default function BilanScreen({ navigation }) {
  const [startDate, setStartDate] = useState(firstOfMonth())
  const [endDate, setEndDate]     = useState(today())
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(true)

  async function load() {
    setLoading(true)
    try {
      const r = await computeAgencyPayout({ startDate, endDate })
      setResult(r)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [startDate, endDate])

  const fmt = (n) => `${Number(n || 0).toLocaleString('fr-FR')} MAD`

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Bilan</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
        <View style={s.row}>
          <View style={s.col}>
            <Text style={s.label}>Du</Text>
            <TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.dustTaupe} autoCapitalize="none" style={s.input} />
          </View>
          <View style={s.col}>
            <Text style={s.label}>Au</Text>
            <TextInput value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.dustTaupe} autoCapitalize="none" style={s.input} />
          </View>
        </View>

        {loading ? (
          <View style={s.center}><ActivityIndicator color={colors.ink} /></View>
        ) : !result ? (
          <Text style={s.empty}>Aucune donnée.</Text>
        ) : (
          <>
            <View style={s.card}>
              <Kpi label="Revenus"            value={fmt(result.totalRevenue)}  />
              <Kpi label="Charges"            value={fmt(result.totalExpenses)} />
              <Kpi label="Frais plateforme"   value={fmt(result.platformFees)} />
              <View style={s.divider} />
              <Kpi label="Payout net"         value={fmt(result.netPayout)} primary />
            </View>

            <Text style={s.section}>Détail des revenus</Text>
            <View style={s.card}>
              {Object.keys(result.breakdown?.byAccount || {}).length === 0 ? (
                <Text style={s.empty}>Aucun revenu sur la période.</Text>
              ) : (
                Object.entries(result.breakdown.byAccount).map(([code, info]) => (
                  <View key={code} style={s.aRow}>
                    <Text style={s.aLabel}>{info.name} <Text style={s.aCode}>· {code}</Text></Text>
                    <Text style={s.aValue}>{fmt(info.amount)}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Kpi({ label, value, primary }) {
  return (
    <View style={s.kpi}>
      <Text style={[s.kpiLabel, primary && { fontFamily: fonts.bold, color: colors.ink }]}>{label}</Text>
      <Text style={[s.kpiVal, primary && { fontSize: 20 }]}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  center: { paddingVertical: 40, alignItems: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.ink, fontSize: 22, width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  row: { flexDirection: 'row', gap: 8 },
  col: { flex: 1 },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginBottom: 6 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: fonts.regular, color: colors.ink },
  section: { ...typography.eyebrow, marginTop: spacing.lg, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.md },
  kpi: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  kpiLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.slate },
  kpiVal: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  aRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  aLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.slate, flex: 1, marginRight: 8 },
  aCode: { color: colors.dustTaupe, fontSize: 11 },
  aValue: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  empty: { color: colors.slate, textAlign: 'center', fontFamily: fonts.regular, padding: 20 },
})
