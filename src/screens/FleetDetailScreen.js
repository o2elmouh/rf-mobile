import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Image,
  Alert, ActivityIndicator, Modal, Pressable, TextInput,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase, getAgencyId } from '../lib/supabase'
import { getRepairs, saveRepair, deleteVehicle, setVehicleVisibility } from '../lib/db'
import { useRole } from '../lib/useRole'
import { listVehiclePhotos, uploadVehiclePhoto, deleteVehiclePhoto } from '../lib/vehiclePhotos'
import { generateUUID } from '../lib/uuid'
import { displayPlate } from '../lib/plate'
import { fmtDate } from '../lib/dates'
import {
  colors, radius, spacing, fonts, typography, input,
  btnPrimary, btnPrimaryText, btnSecondary, btnSecondaryText,
} from '../theme'

const STATUS_STYLE = {
  available:   { hue: colors.success,    label: 'Disponible' },
  rented:      { hue: colors.signalSoft, label: 'En location' },
  maintenance: { hue: colors.info,       label: 'Maintenance' },
  retired:     { hue: colors.slate,      label: 'Retiré' },
}

const TABS = [
  { key: 'info',    label: 'Infos' },
  { key: 'photos',  label: 'Photos' },
  { key: 'repairs', label: 'Réparations' },
]

async function getVehicleById(id) {
  const agencyId = await getAgencyId()
  if (!agencyId) return null
  const { data, error } = await supabase
    .from('vehicles').select('*')
    .eq('id', id).eq('agency_id', agencyId).maybeSingle()
  if (error) throw error
  return data
}

export default function FleetDetailScreen({ route, navigation }) {
  const { vehicleId } = route.params

  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('info')

  const load = useCallback(async () => {
    const v = await getVehicleById(vehicleId)
    setVehicle(v)
    setLoading(false)
  }, [vehicleId])

  useEffect(() => { load() }, [load])
  useEffect(() => navigation.addListener('focus', load), [navigation, load])

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator color={colors.ink} size="large" />
      </View>
    )
  }
  if (!vehicle) {
    return (
      <View style={s.loadingWrap}>
        <Text style={s.empty}>Véhicule introuvable</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={btnSecondary}>
          <Text style={btnSecondaryText}>← Retour</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const st = STATUS_STYLE[vehicle.status] || { hue: colors.slate, label: vehicle.status }

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le véhicule ?',
      `${vehicle.brand || ''} ${vehicle.model || ''} · ${vehicle.plate_number || ''}`.trim() +
        '\n\nCette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await deleteVehicle(vehicleId)
              navigation.goBack()
            } catch (e) {
              Alert.alert('Erreur', e.message || 'Suppression impossible.')
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
          <Text style={s.headerTitle} numberOfLines={1}>
            {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Véhicule'}
          </Text>
        </View>
        <View style={[s.badge, { backgroundColor: st.hue + '1A' }]}>
          <Text style={[s.badgeText, { color: st.hue }]}>{st.label}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <TouchableOpacity key={t.key} style={[s.tab, active && s.tabActive]} onPress={() => setTab(t.key)}>
              <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {tab === 'info'    && <InfoTab    vehicle={vehicle} navigation={navigation} onDelete={handleDelete} />}
      {tab === 'photos'  && <PhotosTab  vehicle={vehicle} />}
      {tab === 'repairs' && <RepairsTab vehicle={vehicle} />}
    </View>
  )
}

// ── Info tab ───────────────────────────────────────────────────────

function InfoTab({ vehicle, navigation, onDelete }) {
  const { isAdmin } = useRole()
  const [networkVisible, setNetworkVisible] = useState(!!vehicle.is_network_visible)
  const [networkPrice,   setNetworkPrice]   = useState(
    vehicle.network_daily_price != null ? String(vehicle.network_daily_price) : ''
  )
  const [savingNetwork, setSavingNetwork]   = useState(false)

  async function toggleNetwork(next) {
    if (!isAdmin) return
    if (next && (!networkPrice || Number(networkPrice) <= 0)) {
      Alert.alert('Tarif requis', 'Renseignez un tarif journalier inter-agence supérieur à 0.')
      return
    }
    setSavingNetwork(true)
    try {
      await setVehicleVisibility(vehicle.id, next, next ? Number(networkPrice) : null)
      setNetworkVisible(next)
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Action impossible')
    } finally {
      setSavingNetwork(false)
    }
  }

  async function saveNetworkPrice() {
    if (!isAdmin || !networkVisible) return
    const n = Number(networkPrice)
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert('Tarif invalide'); return
    }
    setSavingNetwork(true)
    try { await setVehicleVisibility(vehicle.id, true, n) }
    catch (e) { Alert.alert('Erreur', e?.message || 'Action impossible') }
    finally { setSavingNetwork(false) }
  }

  return (
    <ScrollView contentContainerStyle={s.tabContent}>
      <View style={s.card}>
        <Text style={s.eyebrow}>IDENTIFICATION</Text>
        <Row label="Plaque"        value={vehicle.plate_number ? displayPlate(vehicle.plate_number) : '—'} />
        <Row label="Marque"        value={vehicle.brand || '—'} />
        <Row label="Modèle"        value={vehicle.model || '—'} />
        <Row label="Année"         value={vehicle.year || '—'} />
        <Row label="Couleur"       value={vehicle.color || '—'} />
        <Row label="VIN"           value={vehicle.vin || '—'} />
      </View>

      <View style={s.card}>
        <Text style={s.eyebrow}>SPÉCIFICATIONS</Text>
        <Row label="Carburant"     value={vehicle.fuel_type || '—'} />
        <Row label="Transmission"  value={vehicle.transmission || '—'} />
        <Row label="Places"        value={vehicle.seats || '—'} />
        <Row label="Portes"        value={vehicle.doors || '—'} />
        <Row label="Kilométrage"   value={`${Number(vehicle.mileage || 0).toLocaleString()} km`} />
      </View>

      <View style={s.card}>
        <Text style={s.eyebrow}>TARIFS</Text>
        <Row label="Tarif jour"    value={`${Number(vehicle.daily_rate || 0).toLocaleString()} MAD`} />
        <Row label="Caution"       value={`${Number(vehicle.deposit_amount || 0).toLocaleString()} MAD`} />
      </View>

      <View style={s.card}>
        <Text style={s.eyebrow}>RÉSEAU INTER-AGENCES</Text>
        <View style={s.row}>
          <Text style={s.rowLabel}>Visible sur le réseau</Text>
          <TouchableOpacity
            disabled={!isAdmin || savingNetwork}
            onPress={() => toggleNetwork(!networkVisible)}
            style={[
              { width: 48, height: 28, borderRadius: 14, padding: 2, justifyContent: 'center' },
              { backgroundColor: networkVisible ? colors.success : colors.borderStrong, opacity: (isAdmin && !savingNetwork) ? 1 : 0.5 },
            ]}
            activeOpacity={0.7}
          >
            <View style={{
              width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white,
              transform: [{ translateX: networkVisible ? 20 : 0 }],
            }} />
          </TouchableOpacity>
        </View>
        {networkVisible && (
          <>
            <Text style={[s.rowLabel, { marginTop: 8 }]}>Tarif journalier inter-agence (MAD)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={networkPrice}
                onChangeText={setNetworkPrice}
                editable={isAdmin}
                keyboardType="numeric"
                placeholder="ex: 400"
                placeholderTextColor={colors.dustTaupe}
                style={[input, { flex: 1, marginBottom: 0 }]}
              />
              {isAdmin && (
                <TouchableOpacity onPress={saveNetworkPrice} disabled={savingNetwork} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.ink, borderRadius: radius.pill }}>
                  <Text style={{ color: colors.canvas, fontFamily: fonts.bold, fontSize: 12 }}>Enregistrer</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
        {!isAdmin && (
          <Text style={[s.hint, { textAlign: 'left', marginTop: 6 }]}>
            Réservé aux administrateurs.
          </Text>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.eyebrow}>ÉCHÉANCES</Text>
        <Row label="Assurance"     value={fmtDate(vehicle.insurance_expiry)} />
        <Row label="Vignette"      value={fmtDate(vehicle.vignette_expiry)} />
        <Row label="Visite tech."  value={fmtDate(vehicle.control_tech_expiry)} />
      </View>

      {vehicle.notes ? (
        <View style={s.card}>
          <Text style={s.eyebrow}>NOTES</Text>
          <Text style={s.notes}>{vehicle.notes}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={btnPrimary}
        onPress={() => navigation.navigate('FleetForm', { vehicle })}
        activeOpacity={0.85}
      >
        <Text style={btnPrimaryText}>Modifier</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[btnSecondary, { borderColor: colors.danger }]}
        onPress={onDelete}
        activeOpacity={0.85}
      >
        <Text style={[btnSecondaryText, { color: colors.danger }]}>Supprimer le véhicule</Text>
      </TouchableOpacity>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  )
}

// ── Photos tab ─────────────────────────────────────────────────────

function PhotosTab({ vehicle }) {
  const [photos, setPhotos]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setPhotos(await listVehiclePhotos(vehicle.id))
    } finally { setLoading(false) }
  }, [vehicle.id])

  useEffect(() => { load() }, [load])

  const pickSource = () => {
    Alert.alert('Ajouter une photo', '', [
      { text: 'Prendre une photo',  onPress: () => addPhoto('camera') },
      { text: 'Galerie',            onPress: () => addPhoto('library') },
      { text: 'Annuler',            style: 'cancel' },
    ])
  }

  const addPhoto = async (source) => {
    const fn = source === 'camera'
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (perm.status !== 'granted') {
      Alert.alert('Permission requise')
      return
    }
    const result = await fn({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
    if (result.canceled || !result.assets?.[0]?.uri) return

    setUploading(true)
    try {
      await uploadVehiclePhoto(vehicle.id, result.assets[0].uri)
      await load()
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Téléversement impossible.')
    } finally { setUploading(false) }
  }

  const confirmDelete = (photo) => {
    Alert.alert('Supprimer la photo ?', '', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try { await deleteVehiclePhoto(photo.path); await load() }
          catch (e) { Alert.alert('Erreur', e?.message || 'Suppression impossible.') }
        },
      },
    ])
  }

  return (
    <ScrollView contentContainerStyle={s.tabContent}>
      <TouchableOpacity
        style={[btnPrimary, uploading && { opacity: 0.5 }]}
        onPress={pickSource}
        disabled={uploading}
        activeOpacity={0.85}
      >
        {uploading
          ? <ActivityIndicator color={colors.canvas} />
          : <Text style={btnPrimaryText}>+ Ajouter une photo</Text>}
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.lg }} />
      ) : photos.length === 0 ? (
        <Text style={s.emptyTab}>Aucune photo de référence. Ajoutez-en pour faciliter l'analyse de dommages.</Text>
      ) : (
        <View style={s.photoGrid}>
          {photos.map(p => (
            <TouchableOpacity
              key={p.path}
              style={s.photoTile}
              onLongPress={() => confirmDelete(p)}
              delayLongPress={400}
              activeOpacity={0.85}
            >
              {p.url
                ? <Image source={{ uri: p.url }} style={s.photoImg} />
                : <View style={[s.photoImg, { backgroundColor: colors.softBone }]} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={s.hint}>Maintenez une photo pour la supprimer.</Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  )
}

// ── Repairs tab ────────────────────────────────────────────────────

function RepairsTab({ vehicle }) {
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const all = await getRepairs(vehicle.id)
      setRepairs(all || [])
    } finally { setLoading(false) }
  }, [vehicle.id])

  useEffect(() => { load() }, [load])

  return (
    <ScrollView contentContainerStyle={s.tabContent}>
      <TouchableOpacity style={btnPrimary} onPress={() => setAdding(true)} activeOpacity={0.85}>
        <Text style={btnPrimaryText}>+ Ajouter une réparation</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.lg }} />
      ) : repairs.length === 0 ? (
        <Text style={s.emptyTab}>Aucune réparation enregistrée.</Text>
      ) : (
        repairs
          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
          .map(r => (
            <View key={r.id} style={s.card}>
              <View style={s.repairHeader}>
                <Text style={s.repairType}>{r.type || '—'}</Text>
                <Text style={s.repairCost}>{Number(r.cost || 0).toLocaleString()} MAD</Text>
              </View>
              <Text style={s.repairDate}>{fmtDate(r.date)}{r.garage ? ` · ${r.garage}` : ''}</Text>
              {r.description ? <Text style={s.repairDesc}>{r.description}</Text> : null}
              {r.is_sinistre ? (
                <View style={s.sinistreBadge}>
                  <Text style={s.sinistreBadgeText}>SINISTRE</Text>
                </View>
              ) : null}
            </View>
          ))
      )}

      {adding && (
        <RepairEditor
          vehicleId={vehicle.id}
          onCancel={() => setAdding(false)}
          onSaved={async () => { setAdding(false); await load() }}
        />
      )}
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  )
}

function RepairEditor({ vehicleId, onCancel, onSaved }) {
  const [date,        setDate]        = useState(new Date().toISOString().slice(0, 10))
  const [type,        setType]        = useState('')
  const [cost,        setCost]        = useState('')
  const [garage,      setGarage]      = useState('')
  const [description, setDescription] = useState('')
  const [saving,      setSaving]      = useState(false)

  const submit = async () => {
    if (!type.trim()) { Alert.alert('Le type de réparation est requis.'); return }
    setSaving(true)
    try {
      await saveRepair({
        id:          generateUUID(),
        vehicle_id:  vehicleId,
        date,
        type:        type.trim(),
        cost:        parseFloat(cost) || 0,
        garage:      garage.trim() || null,
        description: description.trim() || null,
      })
      await onSaved()
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Enregistrement impossible.')
      setSaving(false)
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={mod.backdrop} onPress={onCancel}>
        <Pressable style={mod.sheet} onPress={e => e.stopPropagation()}>
          <View style={mod.handle} />
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={mod.title}>Nouvelle réparation</Text>

            <Text style={mod.label}>Date</Text>
            <TextInput style={input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.dustTaupe} />

            <Text style={mod.label}>Type</Text>
            <TextInput style={input} value={type} onChangeText={setType} placeholder="ex. Vidange" placeholderTextColor={colors.dustTaupe} />

            <Text style={mod.label}>Coût (MAD)</Text>
            <TextInput style={input} value={cost} onChangeText={setCost} placeholder="0" placeholderTextColor={colors.dustTaupe} keyboardType="decimal-pad" />

            <Text style={mod.label}>Garage</Text>
            <TextInput style={input} value={garage} onChangeText={setGarage} placeholder="Optionnel" placeholderTextColor={colors.dustTaupe} />

            <Text style={mod.label}>Description</Text>
            <TextInput style={[input, { height: 80 }]} value={description} onChangeText={setDescription} placeholder="Optionnel" placeholderTextColor={colors.dustTaupe} multiline textAlignVertical="top" />

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

// ── Shared bits ────────────────────────────────────────────────────

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.canvas },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas, padding: spacing.lg, gap: 12 },
  empty:       { color: colors.slate, fontFamily: fonts.regular, fontSize: 14, marginBottom: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.canvas, gap: 12,
  },
  headerBtn:   { width: 36 },
  headerBack:  { color: colors.ink, fontFamily: fonts.medium, fontSize: 22 },
  headerTitle: { ...typography.cardTitle, fontFamily: fonts.bold },
  badge:       { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:   { fontFamily: fonts.bold, fontSize: 11 },

  tabBar:        { flexDirection: 'row', backgroundColor: colors.canvas, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab:           { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: colors.ink },
  tabText:       { color: colors.slate, fontFamily: fonts.medium, fontSize: 13 },
  tabTextActive: { color: colors.ink, fontFamily: fonts.bold },

  tabContent: { padding: spacing.md, paddingBottom: spacing.xl },

  card:    { backgroundColor: colors.white, borderRadius: radius.card, padding: spacing.md, marginBottom: spacing.sm + 4, borderWidth: 1, borderColor: colors.border },
  eyebrow: { ...typography.eyebrow, marginBottom: 8 },
  notes:   { color: colors.ink, fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },

  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: 12 },
  rowLabel: { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  rowValue: { color: colors.ink, fontFamily: fonts.medium, fontSize: 14, flexShrink: 1, textAlign: 'right' },

  photoGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  photoTile:   { width: '32%', aspectRatio: 1, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  photoImg:    { width: '100%', height: '100%' },

  hint:        { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', marginTop: spacing.md },
  emptyTab:    { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', padding: spacing.lg },

  repairHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  repairType:      { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  repairCost:      { color: colors.ink, fontFamily: fonts.bold, fontSize: 14 },
  repairDate:      { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginTop: 4 },
  repairDesc:      { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, marginTop: 6 },
  sinistreBadge:   { alignSelf: 'flex-start', marginTop: 8, backgroundColor: colors.danger + '1A', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  sinistreBadgeText:{ color: colors.danger, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5 },
})

const mod = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,19,0.55)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: colors.canvas, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1, borderColor: colors.border, maxHeight: '90%' },
  handle:   { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: 12 },
  title:    { ...typography.cardTitle, marginBottom: spacing.md },
  label:    { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginBottom: 6, marginTop: spacing.sm },
})
