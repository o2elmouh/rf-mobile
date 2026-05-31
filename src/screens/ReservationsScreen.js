import { useCallback, useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Pressable,
} from 'react-native'
import { SlidersHorizontal, X } from 'lucide-react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getReservations } from '../lib/db'
import { fmtDate } from '../lib/dates'
import { colors, radius, spacing, fonts, typography } from '../theme'
import HamburgerButton from '../components/HamburgerButton'

const STATUS_STYLE = {
  PENDING:   { hue: colors.signalSoft, label: 'En attente' },
  CONFIRMED: { hue: colors.success,    label: 'Confirmée' },
  COMPLETED: { hue: colors.slate,      label: 'Terminée' },
  CANCELLED: { hue: colors.danger,     label: 'Annulée' },
}
const STATUS_FILTERS = [
  { key: 'all',       label: 'Toutes' },
  { key: 'PENDING',   label: 'En attente' },
  { key: 'CONFIRMED', label: 'Confirmées' },
  { key: 'COMPLETED', label: 'Terminées' },
  { key: 'CANCELLED', label: 'Annulées' },
]
const SOURCE_FILTERS = [
  { key: 'all',       label: 'Toutes' },
  { key: 'WHATSAPP',  label: 'WhatsApp' },
  { key: 'EMAIL',     label: 'Email' },
  { key: 'WEBSITE',   label: 'Site web' },
  { key: 'IN_PERSON', label: 'Sur place' },
  { key: 'DIRECT',    label: 'Direct' },
]
const SOURCE_HUE = {
  WHATSAPP:  '#22c55e',
  EMAIL:     '#3b82f6',
  WEBSITE:   '#8b5cf6',
  IN_PERSON: colors.slate,
  DIRECT:    colors.slate,
}

export default function ReservationsScreen({ navigation }) {
  const [list, setList]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [status, setStatus]   = useState('all')
  const [source, setSource]   = useState('all')
  const [search, setSearch]   = useState('')

  const [filterOpen, setFilterOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await getReservations({
        page: 1,
        pageSize: 100,
        status: status === 'all' ? undefined : status,
        source: source === 'all' ? undefined : source,
        search: search.trim() || undefined,
      })
      setList(Array.isArray(r?.data) ? r.data : [])
      setTotal(r?.total ?? 0)
    } catch (e) {
      setList([]); setTotal(0)
    }
  }, [status, source, search])

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)) }, [load])
  useFocusEffect(useCallback(() => { load() }, [load]))
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const activeCount = (status !== 'all' ? 1 : 0) + (source !== 'all' ? 1 : 0)
  const statusLabel = STATUS_FILTERS.find(f => f.key === status)?.label
  const sourceLabel = SOURCE_FILTERS.find(f => f.key === source)?.label
  const resetFilters = () => { setStatus('all'); setSource('all') }

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
      >
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Réservations</Text>
            <Text style={s.subtitle}>{list.length} / {total} réservation{total !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('ReservationDetail', { reservationId: 'new' })} activeOpacity={0.8}>
            <Text style={s.fabText}>+ Nouvelle</Text>
          </TouchableOpacity>
          <HamburgerButton inline style={{ marginLeft: 8 }} />
        </View>

        <View style={s.toolbar}>
          <View style={s.searchWrap}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher (client, contact)…"
              placeholderTextColor={colors.dustTaupe}
              autoCorrect={false}
              autoCapitalize="none"
              style={s.search}
            />
          </View>
          <TouchableOpacity style={s.filterBtn} onPress={() => setFilterOpen(true)} activeOpacity={0.75}>
            <SlidersHorizontal size={16} color={colors.ink} strokeWidth={1.5} />
            <Text style={s.filterBtnText}>Filtres</Text>
            {activeCount > 0 && (
              <View style={s.filterBadge}><Text style={s.filterBadgeText}>{activeCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>

        {activeCount > 0 && (
          <View style={s.activePillsRow}>
            {status !== 'all' && (
              <TouchableOpacity style={s.activePill} onPress={() => setStatus('all')} activeOpacity={0.7}>
                <Text style={s.activePillLabel}>Statut : {statusLabel}</Text>
                <X size={12} color={colors.canvas} strokeWidth={2} />
              </TouchableOpacity>
            )}
            {source !== 'all' && (
              <TouchableOpacity style={s.activePill} onPress={() => setSource('all')} activeOpacity={0.7}>
                <Text style={s.activePillLabel}>Source : {sourceLabel}</Text>
                <X size={12} color={colors.canvas} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {loading ? (
          <View style={s.center}><ActivityIndicator color={colors.ink} /></View>
        ) : list.length === 0 ? (
          <Text style={s.empty}>Aucune réservation.</Text>
        ) : list.map(r => {
          const style = STATUS_STYLE[r.status] || { hue: colors.slate, label: r.status }
          const sourceHue = SOURCE_HUE[r.source_channel] || colors.slate
          return (
            <TouchableOpacity
              key={r.id}
              style={s.card}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('ReservationDetail', { reservationId: r.id })}
            >
              <View style={s.cardRow}>
                <Text style={s.client} numberOfLines={1}>{r.customer_name || '—'}</Text>
                <View style={[s.badge, { backgroundColor: style.hue + '1A' }]}>
                  <Text style={[s.badgeText, { color: style.hue }]}>{style.label}</Text>
                </View>
              </View>
              <Text style={s.car}>{r.car_model || '—'}</Text>
              <View style={s.cardFooter}>
                <Text style={s.dates}>{fmtDate(r.start_date)} → {fmtDate(r.end_date)}</Text>
                <Text style={s.amount}>{Number(r.total_price || 0).toLocaleString()} MAD</Text>
              </View>
              <View style={s.metaRow}>
                <View style={[s.sourcePill, { backgroundColor: sourceHue + '1A' }]}>
                  <Text style={[s.sourcePillText, { color: sourceHue }]}>
                    {SOURCE_FILTERS.find(f => f.key === r.source_channel)?.label || r.source_channel}
                  </Text>
                </View>
                {r.customer_contact ? <Text style={s.contact}>{r.customer_contact}</Text> : null}
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setFilterOpen(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Filtres</Text>
            {activeCount > 0 && (
              <TouchableOpacity onPress={resetFilters} activeOpacity={0.7}>
                <Text style={s.sheetReset}>Tout effacer</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={s.sheetGroupLabel}>Statut</Text>
          <View style={s.sheetChipsWrap}>
            {STATUS_FILTERS.map(f => {
              const active = status === f.key
              return (
                <TouchableOpacity key={f.key} onPress={() => setStatus(f.key)} style={[s.sheetChip, active && s.sheetChipActive]} activeOpacity={0.7}>
                  <Text style={[s.sheetChipText, active && s.sheetChipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={s.sheetGroupLabel}>Source</Text>
          <View style={s.sheetChipsWrap}>
            {SOURCE_FILTERS.map(f => {
              const active = source === f.key
              return (
                <TouchableOpacity key={f.key} onPress={() => setSource(f.key)} style={[s.sheetChip, active && s.sheetChipActive]} activeOpacity={0.7}>
                  <Text style={[s.sheetChipText, active && s.sheetChipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <TouchableOpacity style={s.sheetApply} onPress={() => setFilterOpen(false)} activeOpacity={0.85}>
            <Text style={s.sheetApplyText}>Voir {total} résultat{total !== 1 ? 's' : ''}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.sm },
  title:    { ...typography.screenTitle },
  subtitle: { ...typography.cardSub, marginTop: 4 },
  fab: { backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  fabText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 12 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  searchWrap: { flex: 1 },
  search: { backgroundColor: colors.white, borderRadius: radius.button, borderWidth: 1, borderColor: colors.borderStrong, color: colors.ink, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: fonts.regular },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, borderRadius: radius.button, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 12, paddingVertical: 10 },
  filterBtnText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },
  filterBadge: { backgroundColor: colors.ink, borderRadius: 999, minWidth: 18, height: 18, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 10 },

  activePillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.ink, borderRadius: radius.pill, paddingLeft: 10, paddingRight: 8, paddingVertical: 5 },
  activePillLabel: { color: colors.canvas, fontFamily: fonts.medium, fontSize: 11 },

  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,20,19,0.45)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.canvas, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: spacing.xl + spacing.md },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.dustTaupe, marginBottom: spacing.md },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sheetTitle: { ...typography.screenTitle, fontSize: 20 },
  sheetReset: { color: colors.slate, fontFamily: fonts.medium, fontSize: 13, textDecorationLine: 'underline' },
  sheetGroupLabel: { ...typography.eyebrow, marginTop: spacing.md, marginBottom: 8 },
  sheetChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sheetChip: { backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 14, paddingVertical: 9 },
  sheetChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  sheetChipText: { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  sheetChipTextActive: { color: colors.canvas, fontFamily: fonts.medium },
  sheetApply: { marginTop: spacing.xl, backgroundColor: colors.ink, borderRadius: radius.button, paddingVertical: 14, alignItems: 'center' },
  sheetApplyText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 14 },
  center: { paddingVertical: 40, alignItems: 'center' },
  empty: { color: colors.slate, textAlign: 'center', padding: 40, fontFamily: fonts.regular },
  card: { backgroundColor: colors.white, marginHorizontal: spacing.md, marginBottom: 10, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  client: { ...typography.cardTitle, flex: 1, marginRight: 8 },
  car: { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  dates: { color: colors.slate, fontFamily: fonts.regular, fontSize: 12 },
  amount: { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  sourcePill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  sourcePillText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.3 },
  contact: { color: colors.slate, fontFamily: fonts.regular, fontSize: 11 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11 },
})
