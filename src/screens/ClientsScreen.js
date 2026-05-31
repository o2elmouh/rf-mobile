import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput,
} from 'react-native'
import { getClients, getContracts } from '../lib/db'
import { flagStyle } from '../lib/clientFlags'
import { colors, radius, spacing, typography, input } from '../theme'
import HamburgerButton from '../components/HamburgerButton'

const daysBetween = (start, end) => {
  if (!start || !end) return 0
  const ms = new Date(end) - new Date(start)
  return ms > 0 ? Math.round(ms / 86400000) : 0
}

const fullName = (c) => `${c.firstName || c.first_name || ''} ${c.lastName || c.last_name || ''}`.trim()
const idNumber = (c) => c.cinNumber || c.id_number || ''

export default function ClientsScreen({ navigation }) {
  const [clients,    setClients]    = useState([])
  const [contracts,  setContracts]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search,     setSearch]     = useState('')

  const load = useCallback(async () => {
    const [c, ct] = await Promise.all([getClients(), getContracts()])
    setClients(c || [])
    setContracts(ct || [])
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  // Reload on focus — picks up edits from ClientDetail and new clients from rentals.
  useEffect(() => navigation.addListener('focus', load), [navigation, load])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  // Per-client rental stats — mirrors the web app.
  const statsByClient = useMemo(() => {
    const m = new Map()
    for (const ct of contracts) {
      const cid = ct.client_id || ct.clientId
      if (!cid) continue
      const stat = m.get(cid) || { count: 0, days: 0, paid: 0 }
      stat.count += 1
      stat.days  += Number(ct.total_days || ct.days || daysBetween(ct.pickup_date || ct.startDate, ct.return_date || ct.endDate)) || 0
      stat.paid  += Number(ct.total_amount || ct.totalTTC || 0)
      m.set(cid, stat)
    }
    return m
  }, [contracts])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(c => {
      if (c.anonymizedAt) return false
      return [fullName(c), c.phone, idNumber(c), c.email]
        .filter(Boolean)
        .some(x => String(x).toLowerCase().includes(q))
    })
  }, [clients, search])

  return (
    <View style={s.container}>
      <HamburgerButton />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
      >
        <Text style={s.title}>Clients</Text>
        <Text style={s.subtitle}>{filtered.length} / {clients.length} client{clients.length !== 1 ? 's' : ''}</Text>

        <View style={s.searchWrap}>
          <TextInput
            style={s.search}
            placeholder="Rechercher (nom, téléphone, CIN, email)…"
            placeholderTextColor={colors.dustTaupe}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {loading && <Text style={s.empty}>Chargement…</Text>}

        {!loading && filtered.map(c => {
          const stats = statsByClient.get(c.id) || { count: 0, days: 0, paid: 0 }
          const flag  = c.flag_category ? { category: c.flag_category, note: c.flag_note } : null
          const anon  = !!c.anonymizedAt
          return (
            <TouchableOpacity
              key={c.id}
              style={s.card}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('ClientDetail', { clientId: c.id })}
            >
              <View style={s.cardHeader}>
                <Text style={s.name} numberOfLines={1}>
                  {anon
                    ? <Text style={{ fontStyle: 'italic', color: colors.dustTaupe }}>[Client anonymisé]</Text>
                    : (fullName(c) || '— sans nom —')}
                </Text>
                {flag && (
                  <View style={[s.flagBadge, { backgroundColor: flagStyle(flag.category).hue + '22', borderColor: flagStyle(flag.category).hue }]}>
                    <Text style={[s.flagText, { color: flagStyle(flag.category).hue }]}>{flag.category}</Text>
                  </View>
                )}
              </View>
              {!anon && (
                <>
                  <Text style={s.sub}>{idNumber(c) || '—'}  ·  {c.phone || '—'}</Text>
                  {c.email ? <Text style={s.subMuted} numberOfLines={1}>{c.email}</Text> : null}
                </>
              )}
              <View style={s.statsRow}>
                <Stat label="Locations" value={stats.count} />
                <Stat label="Jours"     value={stats.days} />
                <Stat label="Payé"      value={`${stats.paid.toFixed(0)} MAD`} accent />
              </View>
            </TouchableOpacity>
          )
        })}

        {!loading && filtered.length === 0 && (
          <Text style={s.empty}>
            {clients.length === 0
              ? 'Aucun client. Ajoutez-en via une nouvelle location.'
              : 'Aucun résultat.'}
          </Text>
        )}
      </ScrollView>
    </View>
  )
}

function Stat({ label, value, accent }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[s.statValue, accent && { color: colors.ink }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.canvas },
  title:       { ...typography.screenTitle, padding: spacing.lg, paddingTop: 56, paddingBottom: 4 },
  subtitle:    { ...typography.caption, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },

  searchWrap:  { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  search:      { ...input, marginBottom: 0 },

  card: {
    backgroundColor:  colors.white,
    marginHorizontal: spacing.md,
    marginBottom:     10,
    borderRadius:     radius.card,
    borderWidth:      1,
    borderColor:      colors.border,
    padding:          spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name:       { ...typography.cardTitle, flex: 1 },
  sub:        { ...typography.cardSub, marginTop: 4 },
  subMuted:   { color: colors.dustTaupe, fontSize: 12, marginTop: 2 },

  statsRow:   { flexDirection: 'row', marginTop: 10, gap: 8 },
  statValue:  { color: colors.ink, fontWeight: '700', fontSize: 14 },
  statLabel:  { color: colors.slate, fontSize: 11, marginTop: 2 },

  flagBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  flagText:  { fontSize: 11, fontWeight: '700' },

  empty:     { color: colors.slate, textAlign: 'center', padding: 40 },
})
