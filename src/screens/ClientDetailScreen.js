import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Linking, Alert, ActivityIndicator, Modal, Pressable,
} from 'react-native'
import { getContracts, saveClient, deleteClient } from '../lib/db'
import { supabase } from '../lib/supabase'
import { fmtDate } from '../lib/dates'
import { FLAG_CATEGORIES, flagStyle } from '../lib/clientFlags'
import {
  colors, radius, spacing, fonts, typography, input,
  btnPrimary, btnPrimaryText, btnSecondary, btnSecondaryText,
} from '../theme'

const CONTRACT_STATUS = {
  active:    { hue: colors.success,    label: 'Actif' },
  closed:    { hue: colors.slate,      label: 'Clôturé' },
  draft:     { hue: colors.signalSoft, label: 'Brouillon' },
  cancelled: { hue: colors.danger,     label: 'Annulé' },
}

async function getClientById(id) {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export default function ClientDetailScreen({ route, navigation }) {
  const { clientId } = route.params

  const [client,    setClient]    = useState(null)
  const [contracts, setContracts] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState(false)
  const [flagOpen,  setFlagOpen]  = useState(false)

  const load = useCallback(async () => {
    const [c, allContracts] = await Promise.all([getClientById(clientId), getContracts()])
    setClient(c)
    setContracts((allContracts || []).filter(ct => ct.client_id === clientId))
    setLoading(false)
  }, [clientId])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const s = { count: contracts.length, days: 0, paid: 0 }
    for (const ct of contracts) {
      s.days += Number(ct.total_days || 0) || 0
      s.paid += Number(ct.total_amount || 0) || 0
    }
    return s
  }, [contracts])

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator color={colors.ink} size="large" />
      </View>
    )
  }

  if (!client) {
    return (
      <View style={s.loadingWrap}>
        <Text style={s.empty}>Client introuvable</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={btnSecondary}>
          <Text style={btnSecondaryText}>← Retour</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || '— sans nom —'
  const phone    = client.phone
  const flag     = client.flag_category
    ? { category: client.flag_category, note: client.flag_note }
    : null

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le client ?',
      `${fullName}\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClient(clientId)
              navigation.goBack()
            } catch (e) {
              Alert.alert('Erreur', e?.message || 'Suppression impossible.')
            }
          },
        },
      ],
    )
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Text style={s.headerBack}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.headerTitle} numberOfLines={1}>{fullName}</Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Stats stadium */}
        <View style={s.statsStadium}>
          <Stat label="LOCATIONS" value={stats.count} />
          <Stat label="JOURS"     value={stats.days} />
          <Stat label="TOTAL"     value={`${stats.paid.toLocaleString()} MAD`} accent />
        </View>

        {/* Quick actions */}
        {phone ? (
          <View style={s.actionsRow}>
            <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL(`tel:${phone}`)}>
              <Text style={s.actionBtnText}>📞 Appeler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`)}
            >
              <Text style={s.actionBtnText}>💬 WhatsApp</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Identity card */}
        <View style={s.card}>
          <Text style={s.eyebrow}>IDENTITÉ</Text>
          <Row label="CIN / Pièce"      value={client.id_number || '—'} />
          <Row label="Type"             value={client.id_type === 'passport' ? 'Passeport' : 'CIN'} />
          <Row label="Expire le"        value={fmtDate(client.id_expiry)} />
          <Row label="Date naissance"   value={fmtDate(client.date_of_birth)} />
          <Row label="Nationalité"      value={client.nationality || '—'} />
        </View>

        {/* Licence card */}
        <View style={s.card}>
          <Text style={s.eyebrow}>PERMIS DE CONDUIRE</Text>
          <Row label="Numéro"     value={client.driving_license_num || '—'} />
          <Row label="Expire le"  value={fmtDate(client.driving_license_expiry)} />
        </View>

        {/* Contact card */}
        <View style={s.card}>
          <Text style={s.eyebrow}>CONTACT</Text>
          <Row label="Téléphone" value={client.phone  || '—'} />
          {client.phone2 ? <Row label="Téléphone 2" value={client.phone2} /> : null}
          <Row label="Email"     value={client.email  || '—'} />
          <Row label="Adresse"   value={[client.address, client.city, client.country].filter(Boolean).join(', ') || '—'} />
        </View>

        {/* Notes */}
        <View style={s.card}>
          <Text style={s.eyebrow}>NOTES</Text>
          <Text style={s.notes}>{client.notes || '— aucune note —'}</Text>
        </View>

        {/* Flag */}
        <View style={s.card}>
          <Text style={s.eyebrow}>DRAPEAU</Text>
          {flag ? (
            <View style={[s.flagBox, { borderColor: flagStyle(flag.category).hue }]}>
              <Text style={[s.flagCategory, { color: flagStyle(flag.category).hue }]}>{flag.category}</Text>
              {flag.note ? <Text style={s.flagNote}>{flag.note}</Text> : null}
              <TouchableOpacity onPress={() => setFlagOpen(true)} style={{ marginTop: 8 }}>
                <Text style={s.flagEditLink}>Modifier / retirer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setFlagOpen(true)} style={s.addFlagBtn}>
              <Text style={s.addFlagText}>🚩 Ajouter un drapeau</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Rental history */}
        <Text style={[s.eyebrow, { marginTop: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: 4 }]}>
          HISTORIQUE DES LOCATIONS ({contracts.length})
        </Text>
        {contracts.length === 0 ? (
          <Text style={s.emptyHistory}>Aucune location enregistrée.</Text>
        ) : (
          [...contracts]
            .sort((a, b) => new Date(b.pickup_date || 0) - new Date(a.pickup_date || 0))
            .map(ct => {
              const st = CONTRACT_STATUS[ct.status] || { hue: colors.slate, label: ct.status }
              return (
                <TouchableOpacity
                  key={ct.id}
                  style={s.histCard}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('ContractDetail', { contractId: ct.id })}
                >
                  <View style={s.histRow}>
                    <Text style={s.histNum}>{ct.contract_number || '—'}</Text>
                    <View style={[s.badge, { backgroundColor: st.hue + '1A' }]}>
                      <Text style={[s.badgeText, { color: st.hue }]}>{st.label}</Text>
                    </View>
                  </View>
                  {ct.vehicle_label ? <Text style={s.histVehicle}>{ct.vehicle_label}</Text> : null}
                  <Text style={s.histDates}>{fmtDate(ct.pickup_date)} → {fmtDate(ct.return_date)}</Text>
                  <Text style={s.histAmount}>{Number(ct.total_amount || 0).toLocaleString()} MAD</Text>
                </TouchableOpacity>
              )
            })
        )}

        {/* Actions */}
        <View style={{ height: spacing.lg }} />
        <TouchableOpacity style={btnSecondary} onPress={() => setEditing(true)} activeOpacity={0.85}>
          <Text style={btnSecondaryText}>Modifier le client</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[btnSecondary, { borderColor: colors.danger }]}
          onPress={handleDelete}
          activeOpacity={0.85}
        >
          <Text style={[btnSecondaryText, { color: colors.danger }]}>Supprimer le client</Text>
        </TouchableOpacity>
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {editing && (
        <ClientEditor
          client={client}
          onCancel={() => setEditing(false)}
          onSaved={async () => { setEditing(false); await load() }}
        />
      )}

      {flagOpen && (
        <FlagEditor
          initial={flag}
          onCancel={() => setFlagOpen(false)}
          onSave={async (next) => {
            try {
              await saveClient({
                ...client,
                flag_category: next?.category || null,
                flag_note:     next?.note || null,
              })
              setFlagOpen(false)
              await load()
            } catch (e) {
              Alert.alert('Erreur', e?.message || 'Enregistrement impossible.')
            }
          }}
        />
      )}
    </View>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  )
}

function Stat({ label, value, accent }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[s.statValue, accent && { color: colors.canvas }]}>{value}</Text>
      <Text style={[s.statLabel, accent && { color: 'rgba(243,240,238,0.7)' }]}>{label}</Text>
    </View>
  )
}

function ClientEditor({ client, onCancel, onSaved }) {
  const [form, setForm] = useState({
    first_name:             client.first_name || '',
    last_name:              client.last_name || '',
    phone:                  client.phone || '',
    phone2:                 client.phone2 || '',
    email:                  client.email || '',
    id_number:              client.id_number || '',
    nationality:            client.nationality || '',
    address:                client.address || '',
    city:                   client.city || '',
    driving_license_num:    client.driving_license_num || '',
    notes:                  client.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const setField = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setSaving(true)
    try {
      await saveClient({ ...client, ...form })
      await onSaved()
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Enregistrement impossible.')
      setSaving(false)
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={m.backdrop} onPress={onCancel}>
        <Pressable style={m.sheet} onPress={e => e.stopPropagation()}>
          <View style={m.handle} />
          <ScrollView style={{ maxHeight: '92%' }} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <Text style={m.title}>Modifier le client</Text>

            <Field label="Prénom"             value={form.first_name}          onChangeText={setField('first_name')} />
            <Field label="Nom"                value={form.last_name}           onChangeText={setField('last_name')} />
            <Field label="Téléphone"          value={form.phone}               onChangeText={setField('phone')}     keyboardType="phone-pad" />
            <Field label="Téléphone 2"        value={form.phone2}              onChangeText={setField('phone2')}    keyboardType="phone-pad" />
            <Field label="Email"              value={form.email}               onChangeText={setField('email')}     keyboardType="email-address" autoCapitalize="none" />
            <Field label="CIN / Passeport"    value={form.id_number}           onChangeText={setField('id_number')} autoCapitalize="characters" />
            <Field label="Nationalité"        value={form.nationality}         onChangeText={setField('nationality')} />
            <Field label="Permis"             value={form.driving_license_num} onChangeText={setField('driving_license_num')} autoCapitalize="characters" />
            <Field label="Adresse"            value={form.address}             onChangeText={setField('address')} />
            <Field label="Ville"              value={form.city}                onChangeText={setField('city')} />
            <Field label="Notes"              value={form.notes}               onChangeText={setField('notes')}     multiline />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
              <TouchableOpacity style={[btnSecondary, { flex: 1, marginTop: 0 }]} onPress={onCancel} disabled={saving} activeOpacity={0.85}>
                <Text style={btnSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[btnPrimary, { flex: 1, marginTop: 0, opacity: saving ? 0.5 : 1 }]} onPress={submit} disabled={saving} activeOpacity={0.85}>
                {saving
                  ? <ActivityIndicator color={colors.canvas} />
                  : <Text style={btnPrimaryText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function Field({ label, multiline, ...rest }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={m.label}>{label}</Text>
      <TextInput
        style={[input, multiline && { height: 80, paddingTop: 12 }]}
        placeholderTextColor={colors.dustTaupe}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...rest}
      />
    </View>
  )
}

function FlagEditor({ initial, onCancel, onSave }) {
  const [category, setCategory] = useState(initial?.category || FLAG_CATEGORIES[0])
  const [note,     setNote]     = useState(initial?.note || '')

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={m.backdrop} onPress={onCancel}>
        <Pressable style={m.modal} onPress={e => e.stopPropagation()}>
          <Text style={m.title}>Drapeau</Text>
          <View style={m.chipsWrap}>
            {FLAG_CATEGORIES.map(cat => {
              const active = category === cat
              return (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[m.chip, active && { backgroundColor: flagStyle(cat).hue + '22', borderColor: flagStyle(cat).hue }]}
                >
                  <Text style={[m.chipText, active && { color: flagStyle(cat).hue, fontFamily: fonts.bold }]}>{cat}</Text>
                </Pressable>
              )
            })}
          </View>
          <Text style={m.label}>Note</Text>
          <TextInput
            style={[input, { minHeight: 80, paddingTop: 12 }]}
            value={note}
            onChangeText={setNote}
            placeholder="Optionnel"
            placeholderTextColor={colors.dustTaupe}
            multiline
            textAlignVertical="top"
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.md }}>
            <TouchableOpacity style={[btnPrimary, { flex: 1, marginTop: 0 }]} onPress={() => onSave({ category, note })} activeOpacity={0.85}>
              <Text style={btnPrimaryText}>Enregistrer</Text>
            </TouchableOpacity>
            {initial && (
              <TouchableOpacity style={[btnPrimary, { flex: 1, marginTop: 0, backgroundColor: colors.danger, borderColor: colors.danger }]} onPress={() => onSave(null)} activeOpacity={0.85}>
                <Text style={btnPrimaryText}>Retirer</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onCancel} style={{ paddingHorizontal: 12, justifyContent: 'center' }}>
              <Text style={{ color: colors.slate, fontFamily: fonts.medium }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.canvas },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas, padding: spacing.lg, gap: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.canvas, gap: 12,
  },
  headerBtn:   { width: 36 },
  headerBack:  { color: colors.ink, fontFamily: fonts.medium, fontSize: 22 },
  headerTitle: { ...typography.cardTitle, fontFamily: fonts.bold },

  content: { padding: spacing.md, paddingBottom: spacing.xl },

  statsStadium: { backgroundColor: colors.ink, borderRadius: radius.hero, padding: spacing.md, flexDirection: 'row', marginBottom: spacing.md },
  statValue:    { color: colors.canvas, fontFamily: fonts.medium, fontSize: 18, letterSpacing: -0.4 },
  statLabel:    { color: 'rgba(243,240,238,0.7)', fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, marginTop: 4 },

  actionsRow:  { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  actionBtn:   { flex: 1, backgroundColor: colors.white, borderRadius: radius.button, borderWidth: 1, borderColor: colors.borderStrong, paddingVertical: 12, alignItems: 'center' },
  actionBtnText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },

  card:    { backgroundColor: colors.white, borderRadius: radius.card, padding: spacing.md, marginBottom: spacing.sm + 4, borderWidth: 1, borderColor: colors.border },
  eyebrow: { ...typography.eyebrow, marginBottom: 8 },
  notes:   { color: colors.ink, fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },

  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 12 },
  rowLabel: { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  rowValue: { color: colors.ink, fontFamily: fonts.medium, fontSize: 14, flexShrink: 1, textAlign: 'right' },

  flagBox:      { borderWidth: 1, borderRadius: radius.card, padding: spacing.md },
  flagCategory: { fontFamily: fonts.bold, fontSize: 14 },
  flagNote:     { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, marginTop: 4 },
  flagEditLink: { color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },
  addFlagBtn:   { padding: spacing.md, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.card, alignItems: 'center', backgroundColor: colors.softBone },
  addFlagText:  { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },

  histCard:    { backgroundColor: colors.white, borderRadius: radius.card, padding: spacing.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  histRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  histNum:     { color: colors.ink, fontFamily: fonts.medium, fontSize: 14, flexShrink: 1 },
  histVehicle: { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginTop: 4 },
  histDates:   { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  histAmount:  { color: colors.ink, fontFamily: fonts.medium, fontSize: 14, marginTop: 6 },
  badge:       { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText:   { fontFamily: fonts.bold, fontSize: 11 },
  emptyHistory:{ color: colors.slate, fontFamily: fonts.regular, fontSize: 13, padding: spacing.md, textAlign: 'center' },

  empty:       { color: colors.slate, fontFamily: fonts.regular, fontSize: 14, marginBottom: 16 },
})

const m = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: 'rgba(20,20,19,0.55)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: colors.canvas, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1, borderColor: colors.border },
  modal:     { margin: spacing.md, backgroundColor: colors.canvas, borderRadius: radius.card, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignSelf: 'center', width: '92%' },
  handle:    { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: 12 },
  title:     { ...typography.cardTitle, marginBottom: spacing.md },
  label:     { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginBottom: 6, marginTop: spacing.sm },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  chip:      { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.white },
  chipText:  { color: colors.slate, fontFamily: fonts.medium, fontSize: 13 },
})
