import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getAgencyApi, patchAgency } from '../../lib/db'
import { useRole } from '../../lib/useRole'
import { colors, radius, spacing, fonts, typography } from '../../theme'

// Fields whitelisted by the server's PATCH /agency handler (verified).
const FIELDS = [
  ['name',             'Nom de l\'agence'],
  ['phone',            'Téléphone'],
  ['email',            'Email'],
  ['city',             'Ville'],
  ['address',          'Adresse'],
  ['ice',              'ICE'],
  ['rc',               'RC'],
  ['if_number',        'IF'],
  ['patente',          'Patente'],
  ['insurance_policy', 'Police d\'assurance'],
  ['retention_years',  'Conservation (années, 5-30)'],
]

export default function AgencyScreen({ navigation }) {
  const { isAdmin } = useRole()
  const [agency, setAgency]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    getAgencyApi().then(setAgency).catch(() => setAgency(null)).finally(() => setLoading(false))
  }, [])

  function update(key, val) { setAgency(prev => ({ ...prev, [key]: val })) }

  async function save() {
    if (!isAdmin) return
    setSaving(true)
    try {
      const patch = {}
      for (const [k] of FIELDS) patch[k] = agency?.[k] ?? null
      if (patch.retention_years !== null && patch.retention_years !== '' && patch.retention_years !== undefined) {
        const n = Number(patch.retention_years)
        if (!Number.isInteger(n) || n < 5 || n > 30) {
          Alert.alert('Erreur', 'Conservation doit être un entier entre 5 et 30.')
          setSaving(false); return
        }
        patch.retention_years = n
      }
      await patchAgency(patch)
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1800)
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Sauvegarde impossible')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <SafeAreaView style={s.container}><View style={s.center}><ActivityIndicator color={colors.ink} /></View></SafeAreaView>
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Agence</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
        {!isAdmin && (
          <View style={s.warning}>
            <Text style={s.warningText}>Réservé aux administrateurs. Les champs sont en lecture seule.</Text>
          </View>
        )}

        {FIELDS.map(([key, label]) => (
          <View key={key} style={s.field}>
            <Text style={s.label}>{label}</Text>
            <TextInput
              value={agency?.[key] != null ? String(agency[key]) : ''}
              onChangeText={(v) => update(key, v)}
              editable={isAdmin}
              autoCapitalize={key === 'email' ? 'none' : 'sentences'}
              autoCorrect={false}
              keyboardType={key === 'retention_years' ? 'numeric' : 'default'}
              placeholderTextColor={colors.dustTaupe}
              style={[s.input, !isAdmin && s.inputDisabled]}
            />
          </View>
        ))}

        {isAdmin && (
          <TouchableOpacity onPress={save} disabled={saving} style={[s.saveBtn, saving && { opacity: 0.6 }]} activeOpacity={0.8}>
            <Text style={s.saveBtnText}>
              {saving ? 'Enregistrement…' : savedFlash ? 'Enregistré ✓' : 'Enregistrer'}
            </Text>
          </TouchableOpacity>
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
  warning: { backgroundColor: '#FFF6E6', borderColor: '#F59E0B55', borderWidth: 1, borderRadius: radius.card, padding: 12, marginBottom: 16 },
  warningText: { color: '#92400E', fontFamily: fonts.medium, fontSize: 13 },
  field: { marginBottom: 14 },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginBottom: 6 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: fonts.regular, fontSize: 14 },
  inputDisabled: { backgroundColor: colors.softBone, color: colors.slate },
  saveBtn: { marginTop: spacing.md, backgroundColor: colors.ink, paddingVertical: 13, borderRadius: radius.button, alignItems: 'center' },
  saveBtnText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 14 },
})
