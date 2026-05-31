import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Alert,
} from 'react-native'
import { getFleet, deleteVehicle } from '../lib/db'
import { displayPlate, parsePlate } from '../lib/plate'
import { colors, radius, spacing, typography } from '../theme'
import HamburgerButton from '../components/HamburgerButton'

const STATUS_COLOR = {
  available:   colors.statusAvailable,
  rented:      colors.statusRented,
  maintenance: colors.statusMaintenance,
  retired:     colors.textMuted,
}
const STATUS_LABEL = {
  available:   'Disponible',
  rented:      'En location',
  maintenance: 'Maintenance',
  retired:     'Retiré',
}
const FILTERS = [
  { key: 'all',         label: 'Tous' },
  { key: 'available',   label: 'Disponible' },
  { key: 'rented',      label: 'En location' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'retired',     label: 'Retiré' },
]

export default function FleetScreen({ navigation }) {
  const [fleet, setFleet]           = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')

  const load = async () => { setFleet((await getFleet()) || []) }
  useEffect(() => { load() }, [])
  // Reload after returning from FleetForm modal
  useEffect(() => navigation.addListener('focus', load), [navigation])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return fleet.filter(v => {
      if (filter !== 'all' && v.status !== filter) return false
      if (!q) return true
      // Plates are stored as `serial|letter|region` — search the serial too.
      const serial = parsePlate(v.plate_number).serial
      return [v.plate_number, serial, v.brand, v.model]
        .filter(Boolean)
        .some(s => String(s).toLowerCase().includes(q))
    })
  }, [fleet, search, filter])

  const confirmDelete = (v) => {
    Alert.alert(
      'Supprimer le véhicule ?',
      `${v.brand || ''} ${v.model || ''} · ${v.plate_number || ''}`.trim() + '\n\nCette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try { await deleteVehicle(v.id); await load() }
            catch (e) { Alert.alert('Erreur', e.message || 'Suppression impossible') }
          },
        },
      ],
    )
  }

  return (
    <View style={s.container}>
      <HamburgerButton />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        <Text style={s.title}>Parc automobile</Text>
        <Text style={s.subtitle}>{filtered.length} / {fleet.length} véhicule{fleet.length !== 1 ? 's' : ''}</Text>

        <View style={s.searchWrap}>
          <TextInput
            style={s.search}
            placeholder="Rechercher (plaque, marque, modèle)…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsRow} contentContainerStyle={s.chipsContent}>
          {FILTERS.map(f => {
            const active = filter === f.key
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[s.chip, active && s.chipActive]}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {filtered.map(v => (
          <TouchableOpacity
            key={v.id}
            style={s.card}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('FleetDetail', { vehicleId: v.id })}
            onLongPress={() => confirmDelete(v)}
            delayLongPress={400}
          >
            <View style={s.cardHeader}>
              <Text style={s.vehicleName} numberOfLines={1}>
                {[v.brand, v.model, v.year].filter(Boolean).join(' ')}
              </Text>
              <View style={[s.badge, { backgroundColor: (STATUS_COLOR[v.status] || colors.textMuted) + '22' }]}>
                <Text style={[s.badgeText, { color: STATUS_COLOR[v.status] || colors.textMuted }]}>
                  {STATUS_LABEL[v.status] || v.status}
                </Text>
              </View>
            </View>
            <Text style={s.plate}>{v.plate_number ? displayPlate(v.plate_number) : '— pas de plaque —'}</Text>
            <View style={s.row}>
              <Text style={s.detail}>{Number(v.mileage || 0).toLocaleString()} km</Text>
              <Text style={s.rate}>{Number(v.daily_rate || 0).toLocaleString()} MAD/j</Text>
            </View>
          </TouchableOpacity>
        ))}

        {filtered.length === 0 && (
          <Text style={s.empty}>
            {fleet.length === 0 ? 'Aucun véhicule. Appuyez sur + pour en ajouter un.' : 'Aucun résultat.'}
          </Text>
        )}
      </ScrollView>

      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('FleetForm', { vehicle: null })}
        activeOpacity={0.85}
      >
        <Text style={s.fabPlus}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  title:       { ...typography.screenTitle, padding: spacing.lg, paddingTop: 56, paddingBottom: 4 },
  subtitle:    { ...typography.caption, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },

  searchWrap:  { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  search: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },

  chipsRow:     { marginBottom: spacing.sm },
  chipsContent: { paddingHorizontal: spacing.md, gap: 8 },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive:     { backgroundColor: colors.goldMuted, borderColor: colors.gold },
  chipText:       { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: colors.gold, fontWeight: '700' },

  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  vehicleName: { ...typography.cardTitle, flex: 1 },
  plate:       { ...typography.cardSub, marginTop: 4 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  detail:      { color: colors.textSecondary, fontSize: 13 },
  rate:        { color: colors.gold, fontWeight: '700', fontSize: 14 },

  badge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  empty:     { color: colors.textMuted, textAlign: 'center', padding: 40 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPlus: { color: colors.bg, fontSize: 32, fontWeight: '300', lineHeight: 34, marginTop: -2 },
})
