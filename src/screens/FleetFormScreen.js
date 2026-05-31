import { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { saveVehicle } from '../lib/db'
import { CAR_CATALOGUE, MAKES, YEARS, COLORS } from '../lib/carCatalogue'
import { parsePlate } from '../lib/plate'
import PlateInput from '../components/PlateInput'
import { ListPickerField } from '../components/ListPicker'
import { colors, radius, spacing, typography, input, btnPrimary, btnPrimaryText } from '../theme'

// Match the web app's enum mapping (lib/db.js: vehicleToDb / vehicleFromDb).
const FUEL_FR_TO_DB    = { 'Essence': 'gasoline', 'Diesel': 'diesel', 'Hybride': 'hybrid', 'Électrique': 'electric' }
const FUEL_DB_TO_FR    = { gasoline: 'Essence', diesel: 'Diesel', hybrid: 'Hybride', electric: 'Électrique' }
const FUEL_OPTIONS_FR  = ['Essence', 'Diesel', 'Hybride', 'Électrique']
const TRANS_FR_TO_DB   = { 'Manuelle': 'manual', 'Automatique': 'automatic' }
const TRANS_DB_TO_FR   = { manual: 'Manuelle', automatic: 'Automatique' }
const TRANS_OPTIONS_FR = ['Manuelle', 'Automatique']
const STATUS_OPTIONS   = ['available', 'rented', 'maintenance', 'retired']
const STATUS_LABEL     = { available: 'Disponible', rented: 'En location', maintenance: 'Maintenance', retired: 'Retiré' }
const STATUS_LABELS    = STATUS_OPTIONS.map(s => STATUS_LABEL[s])

const toNumOrNull = (s) => {
  if (s === '' || s === null || s === undefined) return null
  const n = Number(String(s).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR') : null

export default function FleetFormScreen({ route, navigation }) {
  const editing = route.params?.vehicle || null
  const isEdit  = !!editing?.id

  const [form, setForm] = useState({
    id:                      editing?.id ?? undefined,
    plate_number:            editing?.plate_number ?? '',
    brand:                   editing?.brand ?? '',
    model:                   editing?.model ?? '',
    year:                    editing?.year ?? new Date().getFullYear(),
    color:                   editing?.color ?? '',
    vin:                     editing?.vin ?? '',
    mileage:                 editing?.mileage != null ? String(editing.mileage) : '',
    fuel_type:               editing?.fuel_type ?? 'gasoline',
    transmission:            editing?.transmission ?? 'manual',
    seats:                   editing?.seats != null ? String(editing.seats) : '5',
    doors:                   editing?.doors != null ? String(editing.doors) : '4',
    status:                  editing?.status ?? 'available',
    daily_rate:              editing?.daily_rate != null     ? String(editing.daily_rate)     : '',
    deposit_amount:          editing?.deposit_amount != null ? String(editing.deposit_amount) : '',
    purchase_price:          editing?.purchase_price != null ? String(editing.purchase_price) : '',
    purchase_date:           editing?.purchase_date ?? null,
    residual_value:          editing?.residual_value != null ? String(editing.residual_value) : '',
    expected_lifespan_years: editing?.expected_lifespan_years ?? 5,
    insurance_expiry:        editing?.insurance_expiry ?? null,
    vignette_expiry:         editing?.vignette_expiry ?? null,
    control_tech_expiry:     editing?.control_tech_expiry ?? null,
    notes:                   editing?.notes ?? '',
  })
  const [datePickerFor, setDatePickerFor] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // When brand changes, reset model to the first catalogue entry (mirrors web's handleMakeChange).
  const onBrandChange = (brand) => {
    setForm(f => ({ ...f, brand, model: CAR_CATALOGUE[brand]?.[0] || '' }))
  }

  const validate = () => {
    if (!form.brand) return 'La marque est obligatoire.'
    if (!form.model) return 'Le modèle est obligatoire.'
    const { serial } = parsePlate(form.plate_number)
    if (!serial)     return 'La plaque d\'immatriculation est obligatoire.'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { Alert.alert('Champ manquant', err); return }
    setSaving(true)
    try {
      // Mirror web app's vehicleToDb shape. Strip undefined keys.
      const payload = {
        ...(form.id ? { id: form.id } : {}),
        brand:                   form.brand,
        model:                   form.model,
        year:                    toNumOrNull(form.year),
        color:                   form.color || null,
        plate_number:            form.plate_number,
        vin:                     form.vin.trim() || null,
        fuel_type:               form.fuel_type,
        transmission:            form.transmission,
        seats:                   toNumOrNull(form.seats) ?? 5,
        doors:                   toNumOrNull(form.doors) ?? 4,
        mileage:                 toNumOrNull(form.mileage) ?? 0,
        status:                  form.status,
        daily_rate:              toNumOrNull(form.daily_rate) ?? 0,
        deposit_amount:          toNumOrNull(form.deposit_amount) ?? 0,
        purchase_price:          toNumOrNull(form.purchase_price),
        purchase_date:           form.purchase_date,
        residual_value:          toNumOrNull(form.residual_value),
        expected_lifespan_years: toNumOrNull(form.expected_lifespan_years) ?? 5,
        insurance_expiry:        form.insurance_expiry,
        vignette_expiry:         form.vignette_expiry,
        control_tech_expiry:     form.control_tech_expiry,
        notes:                   form.notes.trim() || null,
      }
      await saveVehicle(payload)
      navigation.goBack()
    } catch (e) {
      const msg = e?.message?.includes('duplicate') || e?.code === '23505'
        ? 'Cette plaque existe déjà.'
        : (e?.message || 'Enregistrement impossible.')
      Alert.alert('Erreur', msg)
    } finally {
      setSaving(false)
    }
  }

  const modelOptions = CAR_CATALOGUE[form.brand] || []
  const fuelFr      = FUEL_DB_TO_FR[form.fuel_type] || ''
  const transFr     = TRANS_DB_TO_FR[form.transmission] || ''
  const statusFr    = STATUS_LABEL[form.status] || ''

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Text style={s.headerBtnText}>Annuler</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isEdit ? 'Modifier' : 'Nouveau véhicule'}</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView style={s.flex} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Section title="Identification">
          <ListPickerField label="Marque *"      value={form.brand} options={MAKES} onChange={onBrandChange} />
          <ListPickerField label="Modèle *"      value={form.model} options={modelOptions} onChange={v => set('model', v)} disabled={!form.brand} />
          <ListPickerField label="Année"         value={String(form.year)} options={YEARS.map(String)} onChange={v => set('year', Number(v))} searchable={false} />
          <Text style={s.fieldLabel}>Immatriculation * <Text style={s.fieldHint}>— Format marocain</Text></Text>
          <PlateInput value={form.plate_number} onChange={v => set('plate_number', v)} />
          <ListPickerField label="Couleur"       value={form.color} options={COLORS} onChange={v => set('color', v)} searchable={false} />
          <Text style={s.fieldLabel}>VIN (n° de châssis)</Text>
          <TextInput
            style={s.input}
            value={form.vin}
            onChangeText={t => set('vin', t)}
            placeholder="Optionnel"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
          />
        </Section>

        <Section title="Caractéristiques">
          <ListPickerField
            label="Carburant"
            value={fuelFr}
            options={FUEL_OPTIONS_FR}
            onChange={fr => set('fuel_type', FUEL_FR_TO_DB[fr])}
            searchable={false}
          />
          <ListPickerField
            label="Boîte de vitesse"
            value={transFr}
            options={TRANS_OPTIONS_FR}
            onChange={fr => set('transmission', TRANS_FR_TO_DB[fr])}
            searchable={false}
          />
          <Row>
            <Field flex label="Places">
              <TextInput
                style={s.input}
                value={form.seats}
                onChangeText={t => set('seats', t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
              />
            </Field>
            <Field flex label="Portes">
              <TextInput
                style={s.input}
                value={form.doors}
                onChangeText={t => set('doors', t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
              />
            </Field>
          </Row>
          <Text style={s.fieldLabel}>Kilométrage</Text>
          <TextInput
            style={s.input}
            value={form.mileage}
            onChangeText={t => set('mileage', t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
          />
        </Section>

        <Section title="Tarifs & statut">
          <Row>
            <Field flex label="Tarif journalier (MAD)">
              <TextInput
                style={s.input}
                value={form.daily_rate}
                onChangeText={t => set('daily_rate', t.replace(/[^0-9.,]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="350"
                placeholderTextColor={colors.textMuted}
              />
            </Field>
            <Field flex label="Caution (MAD)">
              <TextInput
                style={s.input}
                value={form.deposit_amount}
                onChangeText={t => set('deposit_amount', t.replace(/[^0-9.,]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="2000"
                placeholderTextColor={colors.textMuted}
              />
            </Field>
          </Row>
          <ListPickerField
            label="Statut"
            value={statusFr}
            options={STATUS_LABELS}
            onChange={(label) => set('status', STATUS_OPTIONS[STATUS_LABELS.indexOf(label)])}
            searchable={false}
          />
        </Section>

        <Section title="Investissement & amortissement">
          <Row>
            <Field flex label="Prix d'achat (MAD)">
              <TextInput
                style={s.input}
                value={form.purchase_price}
                onChangeText={t => set('purchase_price', t.replace(/[^0-9.,]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="120000"
                placeholderTextColor={colors.textMuted}
              />
            </Field>
            <Field flex label="Valeur résiduelle (MAD)">
              <TextInput
                style={s.input}
                value={form.residual_value}
                onChangeText={t => set('residual_value', t.replace(/[^0-9.,]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="20000"
                placeholderTextColor={colors.textMuted}
              />
            </Field>
          </Row>
          <Row>
            <Field flex label="Date d'achat">
              <TouchableOpacity
                onPress={() => setDatePickerFor('purchase_date')}
                style={[s.input, { justifyContent: 'center' }]}
                activeOpacity={0.7}
              >
                <Text style={{ color: form.purchase_date ? colors.textPrimary : colors.textMuted, fontSize: 15 }}>
                  {form.purchase_date ? fmtDate(form.purchase_date) : 'Choisir une date'}
                </Text>
              </TouchableOpacity>
            </Field>
            <Field flex label="Durée (ans)">
              <ListPickerField
                value={String(form.expected_lifespan_years)}
                options={['3','4','5','6','7','8','10']}
                onChange={v => set('expected_lifespan_years', Number(v))}
                searchable={false}
              />
            </Field>
          </Row>
        </Section>

        <Section title="Documents (échéances)">
          <DateField label="Assurance"           value={form.insurance_expiry}    onPress={() => setDatePickerFor('insurance_expiry')}    onClear={() => set('insurance_expiry', null)} />
          <DateField label="Vignette"            value={form.vignette_expiry}     onPress={() => setDatePickerFor('vignette_expiry')}     onClear={() => set('vignette_expiry', null)} />
          <DateField label="Contrôle technique"  value={form.control_tech_expiry} onPress={() => setDatePickerFor('control_tech_expiry')} onClear={() => set('control_tech_expiry', null)} />
        </Section>

        <Section title="Notes">
          <TextInput
            style={[s.input, s.textarea]}
            value={form.notes}
            onChangeText={t => set('notes', t)}
            placeholder="Notes internes…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Section>

        <TouchableOpacity style={[btnPrimary, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          <Text style={btnPrimaryText}>{saving ? 'Enregistrement…' : (isEdit ? 'Enregistrer' : 'Ajouter le véhicule')}</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {datePickerFor && (
        <DateTimePicker
          value={form[datePickerFor] ? new Date(form[datePickerFor]) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selected) => {
            setDatePickerFor(null)
            if (event.type === 'set' && selected) {
              set(datePickerFor, selected.toISOString().slice(0, 10))
            }
          }}
        />
      )}
    </KeyboardAvoidingView>
  )
}

// ── tiny presentational helpers ──────────────────────────────────
function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{title}</Text>
      {children}
    </View>
  )
}
function Field({ label, children, flex }) {
  return (
    <View style={[{ marginBottom: 4 }, flex && { flex: 1 }]}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}
function Row({ children }) {
  return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>
}
function DateField({ label, value, onPress, onClear }) {
  return (
    <Field label={label}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TouchableOpacity onPress={onPress} style={[s.input, { flex: 1, justifyContent: 'center', marginBottom: 0 }]} activeOpacity={0.7}>
          <Text style={{ color: value ? colors.textPrimary : colors.textMuted, fontSize: 15 }}>
            {value ? fmtDate(value) : 'Choisir une date'}
          </Text>
        </TouchableOpacity>
        {value && (
          <TouchableOpacity onPress={onClear} style={s.clearBtn} activeOpacity={0.7}>
            <Text style={{ color: colors.textSecondary, fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    </Field>
  )
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg,
  },
  headerTitle:   { ...typography.cardTitle, fontWeight: '700' },
  headerBtn:     { minWidth: 70 },
  headerBtnText: { color: colors.gold, fontSize: 15, fontWeight: '600' },

  content: { padding: spacing.md, paddingBottom: spacing.xl },

  section:      { marginBottom: spacing.lg },
  sectionLabel: { ...typography.sectionLabel, marginBottom: spacing.sm },
  fieldLabel:   { color: colors.textSecondary, fontSize: 12, marginBottom: 6, marginTop: 4 },
  fieldHint:    { color: colors.textMuted, fontWeight: '400' },

  input: { ...input, marginBottom: 8 },
  textarea: { minHeight: 90, paddingTop: 12 },

  clearBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
})
