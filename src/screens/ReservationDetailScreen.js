import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getReservationById, createReservation, updateReservation } from '../lib/db'
import { fmtDate } from '../lib/dates'
import { colors, radius, spacing, fonts, typography } from '../theme'

const STATUS_STYLE = {
  PENDING:   { hue: colors.signalSoft, label: 'En attente' },
  CONFIRMED: { hue: colors.success,    label: 'Confirmée' },
  COMPLETED: { hue: colors.slate,      label: 'Terminée' },
  CANCELLED: { hue: colors.danger,     label: 'Annulée' },
}
const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']
const SOURCE_OPTIONS = ['IN_PERSON', 'WHATSAPP', 'EMAIL', 'WEBSITE', 'DIRECT']
const SOURCE_LABEL = { IN_PERSON: 'Sur place', WHATSAPP: 'WhatsApp', EMAIL: 'Email', WEBSITE: 'Site web', DIRECT: 'Direct' }

function Field({ label, value, onChange, editable = true, keyboardType, multiline }) {
  return (
    <View style={fs.field}>
      <Text style={fs.label}>{label}</Text>
      <TextInput
        value={value ?? ''}
        onChangeText={onChange}
        editable={editable}
        keyboardType={keyboardType}
        multiline={!!multiline}
        autoCorrect={false}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        placeholderTextColor={colors.dustTaupe}
        style={[fs.input, multiline && { minHeight: 70, textAlignVertical: 'top' }, !editable && fs.inputDisabled]}
      />
    </View>
  )
}

const fs = StyleSheet.create({
  field: { marginBottom: 12 },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginBottom: 6 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: fonts.regular, color: colors.ink },
  inputDisabled: { backgroundColor: colors.softBone, color: colors.slate },
})

export default function ReservationDetailScreen({ route, navigation }) {
  const { reservationId } = route.params || {}
  const isNew = reservationId === 'new'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving]   = useState(false)
  const [sourceMetadata, setSourceMetadata] = useState(null)
  const [form, setForm]       = useState({
    customer_name:    '',
    customer_contact: '',
    car_model:        '',
    start_date:       '',
    end_date:         '',
    total_price:      '',
    pickup_location:  '',
    return_location:  '',
    source_channel:   'IN_PERSON',
    status:           'PENDING',
  })

  useEffect(() => {
    if (isNew) return
    getReservationById(reservationId)
      .then(r => {
        const meta = r?.source_metadata && typeof r.source_metadata === 'object' ? r.source_metadata : null
        setSourceMetadata(meta)
        setForm(prev => ({
          ...prev,
          ...r,
          total_price:     r?.total_price != null ? String(r.total_price) : '',
          pickup_location: meta?.pickup_location || '',
          return_location: meta?.return_location || '',
        }))
      })
      .catch(e => Alert.alert('Erreur', e?.message || 'Chargement impossible'))
      .finally(() => setLoading(false))
  }, [reservationId, isNew])

  function update(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  async function save() {
    if (!form.customer_name?.trim() || !form.car_model?.trim() || !form.start_date || !form.end_date) {
      Alert.alert('Champs requis', 'Client, véhicule, date de début et date de fin sont obligatoires.')
      return
    }
    setSaving(true)
    try {
      const body = {
        customer_name:    form.customer_name.trim(),
        customer_contact: form.customer_contact?.trim() || null,
        car_model:        form.car_model.trim(),
        start_date:       form.start_date,
        end_date:         form.end_date,
        total_price:      form.total_price ? Number(form.total_price) : 0,
        source_channel:   form.source_channel,
        status:           form.status,
        source_metadata: {
          ...(sourceMetadata || {}),
          pickup_location: form.pickup_location?.trim() || null,
          return_location: form.return_location?.trim() || null,
        },
      }
      if (isNew) {
        const created = await createReservation(body)
        navigation.replace('ReservationDetail', { reservationId: created.id })
      } else {
        await updateReservation(reservationId, body)
        Alert.alert('Enregistré')
      }
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Sauvegarde impossible')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(newStatus) {
    if (isNew) { update('status', newStatus); return }
    const prev = form.status
    update('status', newStatus)
    try { await updateReservation(reservationId, { status: newStatus }) }
    catch (e) {
      update('status', prev)
      Alert.alert('Erreur', e?.message || 'Changement de statut impossible')
    }
  }

  if (loading) {
    return <SafeAreaView style={s.container}><View style={s.center}><ActivityIndicator color={colors.ink} /></View></SafeAreaView>
  }

  const style = STATUS_STYLE[form.status] || { hue: colors.slate, label: form.status }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>{isNew ? 'Nouvelle réservation' : 'Réservation'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
        {!isNew && (
          <View style={s.statusRow}>
            <View style={[s.badge, { backgroundColor: style.hue + '1A' }]}>
              <Text style={[s.badgeText, { color: style.hue }]}>{style.label}</Text>
            </View>
          </View>
        )}

        <Text style={s.section}>Statut</Text>
        <View style={s.pillRow}>
          {STATUS_OPTIONS.map(opt => {
            const active = form.status === opt
            const opStyle = STATUS_STYLE[opt]
            return (
              <TouchableOpacity key={opt} onPress={() => setStatus(opt)} style={[s.pill, active && { backgroundColor: opStyle.hue, borderColor: opStyle.hue }]}>
                <Text style={[s.pillText, active && { color: colors.white }]}>{opStyle.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={s.section}>Canal</Text>
        <View style={s.pillRow}>
          {SOURCE_OPTIONS.map(opt => {
            const active = form.source_channel === opt
            return (
              <TouchableOpacity key={opt} onPress={() => update('source_channel', opt)} style={[s.pill, active && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
                <Text style={[s.pillText, active && { color: colors.canvas }]}>{SOURCE_LABEL[opt]}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={s.section}>Client</Text>
        <Field label="Nom du client *" value={form.customer_name} onChange={(v) => update('customer_name', v)} />
        <Field label="Contact (téléphone ou email)" value={form.customer_contact} onChange={(v) => update('customer_contact', v)} />

        <Text style={s.section}>Véhicule</Text>
        <Field label="Modèle / désignation *" value={form.car_model} onChange={(v) => update('car_model', v)} />

        <Text style={s.section}>Dates</Text>
        <View style={s.row}>
          <View style={s.col}>
            <Field label="Début *" value={form.start_date} onChange={(v) => update('start_date', v)} />
          </View>
          <View style={s.col}>
            <Field label="Fin *" value={form.end_date} onChange={(v) => update('end_date', v)} />
          </View>
        </View>

        <Text style={s.section}>Tarif</Text>
        <Field label="Total (MAD)" value={form.total_price} onChange={(v) => update('total_price', v)} keyboardType="numeric" />

        <Text style={s.section}>Lieux</Text>
        <Field label="Lieu de prise en charge" value={form.pickup_location} onChange={(v) => update('pickup_location', v)} />
        <Field label="Lieu de retour" value={form.return_location} onChange={(v) => update('return_location', v)} />

        <TouchableOpacity onPress={save} disabled={saving} style={[s.saveBtn, saving && { opacity: 0.6 }]} activeOpacity={0.8}>
          <Text style={s.saveBtnText}>{saving ? 'Enregistrement…' : (isNew ? 'Créer la réservation' : 'Enregistrer')}</Text>
        </TouchableOpacity>
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
  statusRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11 },
  section: { ...typography.eyebrow, marginTop: spacing.md, marginBottom: 6 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  pill: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  pillText: { fontFamily: fonts.medium, fontSize: 12, color: colors.slate },
  row: { flexDirection: 'row', gap: 8 },
  col: { flex: 1 },
  saveBtn: { marginTop: spacing.lg, backgroundColor: colors.ink, paddingVertical: 13, borderRadius: radius.button, alignItems: 'center' },
  saveBtnText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 14 },
})
