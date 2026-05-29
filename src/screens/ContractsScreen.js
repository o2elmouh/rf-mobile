import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { getContracts, getLeads } from '../lib/db'
import { fmtDate } from '../lib/dates'
import { colors, radius, spacing, fonts, typography } from '../theme'
import HamburgerButton from '../components/HamburgerButton'

const STATUS_STYLE = {
  active:    { hue: colors.success,    label: 'Actif' },
  closed:    { hue: colors.slate,      label: 'Clôturé' },
  draft:     { hue: colors.signalSoft, label: 'Brouillon' },
  cancelled: { hue: colors.danger,     label: 'Annulé' },
}
const FILTERS = [
  { key: 'all',       label: 'Tous' },
  { key: 'active',    label: 'Actifs' },
  { key: 'draft',     label: 'Brouillons' },
  { key: 'closed',    label: 'Clôturés' },
  { key: 'cancelled', label: 'Annulés' },
]
const SORTS = [
  { key: 'pickup_desc', label: 'Date départ ↓' },
  { key: 'return_asc',  label: 'Retour prévu ↑' },
]

export default function ContractsScreen({ navigation }) {
  const { t } = useTranslation('contracts')
  const [contracts,  setContracts]  = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('all')
  const [sort,       setSort]       = useState('pickup_desc')
  const [prolongLeadsByContract, setProlongLeadsByContract] = useState({})

  const load = async () => {
    setContracts((await getContracts()) || [])
    try {
      const pending = await getLeads('pending')
      const map = {}
      for (const l of (pending || [])) {
        if (l.classification !== 'prolongation') continue
        const cid = l.prolongation_target_contract_id
        if (!cid) continue
        ;(map[cid] ||= []).push(l)
      }
      setProlongLeadsByContract(map)
    } catch (_) { /* non-fatal */ }
  }
  useEffect(() => { load() }, [])
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = contracts.filter(c => {
      if (filter !== 'all' && c.status !== filter) return false
      if (!q) return true
      return [c.contract_number, c.client_name, c.vehicle?.plate_number, c.vehicle_label]
        .filter(Boolean)
        .some(s => String(s).toLowerCase().includes(q))
    })
    const cmp = (a, b) => {
      if (sort === 'pickup_desc') return new Date(b.pickup_date || 0) - new Date(a.pickup_date || 0)
      return new Date(a.return_date || 0) - new Date(b.return_date || 0) // return_asc
    }
    return [...list].sort(cmp)
  }, [contracts, search, filter, sort])

  return (
    <View style={s.container}>
      <HamburgerButton />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
      >
        <Text style={s.title}>Contrats</Text>
        <Text style={s.subtitle}>{filtered.length} / {contracts.length} contrat{contracts.length !== 1 ? 's' : ''}</Text>

        <View style={s.searchWrap}>
          <TextInput
            style={s.search}
            placeholder="Rechercher (n°, client, plaque)…"
            placeholderTextColor={colors.dustTaupe}
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
              <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[s.chip, active && s.chipActive]} activeOpacity={0.7}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <View style={s.sortRow}>
          <Text style={s.sortLabel}>Trier :</Text>
          {SORTS.map(o => {
            const active = sort === o.key
            return (
              <TouchableOpacity key={o.key} onPress={() => setSort(o.key)} style={[s.sortPill, active && s.sortPillActive]} activeOpacity={0.7}>
                <Text style={[s.sortText, active && s.sortTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {filtered.map(c => {
          const style = STATUS_STYLE[c.status] || { hue: colors.slate, label: c.status }
          const prolongLeads = prolongLeadsByContract[c.id] || []
          return (
            <View key={c.id}>
              {prolongLeads.length > 0 && (() => {
                const first = prolongLeads[0]
                const date = first.extracted_data?.end_date || '—'
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('ContractDetail', {
                      contractId: c.id,
                      openExtendWithPrefill: date !== '—' ? date : null,
                      prolongationLeadIds: prolongLeads.map(l => l.id),
                    })}
                    style={s.prolongBanner}
                  >
                    <Text style={s.prolongBannerText}>
                      {'🔔'} {t('prolongationRequestedUntil', {
                        defaultValue: "Prolongation demandée jusqu'au {{date}}",
                        date,
                      })}
                    </Text>
                    <Text style={s.prolongBannerCta}>{t('prolongationView', { defaultValue: 'Voir' })} →</Text>
                  </TouchableOpacity>
                )
              })()}
              <TouchableOpacity
                style={s.card}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('ContractDetail', { contractId: c.id })}
              >
                <View style={s.row}>
                  <Text style={s.num}>{c.contract_number || '—'}</Text>
                  <View style={[s.badge, { backgroundColor: style.hue + '1A' }]}>
                    <Text style={[s.badgeText, { color: style.hue }]}>{style.label}</Text>
                  </View>
                </View>
                <Text style={s.client}>{c.client_name || '—'}</Text>
                {c.vehicle_label ? <Text style={s.vehicleLine}>{c.vehicle_label}</Text> : null}
                <Text style={s.dates}>{fmtDate(c.pickup_date)} → {fmtDate(c.return_date)}</Text>
                <View style={s.bottomRow}>
                  <Text style={s.amount}>{Number(c.total_amount || 0).toLocaleString()} MAD</Text>
                  <Text style={s.restituerHint}>Voir →</Text>
                </View>
              </TouchableOpacity>
            </View>
          )
        })}
        {filtered.length === 0 && (
          <Text style={s.empty}>
            {contracts.length === 0 ? 'Aucun contrat.' : 'Aucun résultat.'}
          </Text>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  title:     { ...typography.screenTitle, paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: 4 },
  subtitle:  { ...typography.cardSub, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },

  searchWrap: { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  search: {
    backgroundColor: colors.white,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.ink,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
  },

  chipsRow:     { marginBottom: spacing.sm },
  chipsContent: { paddingHorizontal: spacing.md, gap: 8 },
  chip: {
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive:     { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText:       { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  chipTextActive: { color: colors.canvas, fontFamily: fonts.medium },

  sortRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  sortLabel:      { ...typography.eyebrow, marginRight: 2 },
  sortPill:       { backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 10, paddingVertical: 5 },
  sortPillActive: { backgroundColor: colors.softBone, borderColor: colors.ink },
  sortText:       { color: colors.slate, fontFamily: fonts.regular, fontSize: 12 },
  sortTextActive: { color: colors.ink, fontFamily: fonts.medium },

  card: {
    backgroundColor:  colors.white,
    marginHorizontal: spacing.md,
    marginBottom:     10,
    borderRadius:     radius.card,
    borderWidth:      1,
    borderColor:      colors.border,
    padding:          spacing.md,
  },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  num:         { ...typography.cardTitle, flexShrink: 1 },
  client:      { ...typography.cardSub, marginTop: 4 },
  vehicleLine: { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  dates:       { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginTop: 6 },

  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 },
  amount:    { color: colors.ink, fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.3 },

  badge:     { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11 },

  empty:         { color: colors.slate, textAlign: 'center', padding: 40, fontFamily: fonts.regular },
  restituerHint: { color: colors.slate, fontSize: 11, fontFamily: fonts.regular },

  prolongBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.md,
  },
  prolongBannerText: { fontFamily: fonts.regular, fontSize: 12, color: '#2563eb', flex: 1 },
  prolongBannerCta: { fontFamily: fonts.medium, fontSize: 12, color: '#2563eb' },
})
