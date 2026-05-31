import { useCallback, useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useFocusEffect } from '@react-navigation/native'
import { getLeads } from '../lib/db'
import { formatPhone } from '../lib/phoneFormat'
import { colors, radius, spacing, fonts, typography } from '../theme'
import SourceBadge from '../components/SourceBadge'
import LeadStatusPill from '../components/LeadStatusPill'
import HamburgerButton from '../components/HamburgerButton'

const TABS = ['pending', 'waiting', 'offer_sent', 'accepted', 'ignored']

function timeAgo(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'à l’instant'
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  return `il y a ${d} j`
}


function LeadCard({ lead, onPress }) {
  const { t } = useTranslation('leads')
  const ex = lead.extracted_data || {}
  const hasName = ex.firstName || ex.lastName
  const title = hasName ? `${ex.firstName || ''} ${ex.lastName || ''}`.trim() : formatPhone(lead.sender_id)
  const summary = ex.summary_for_agent || lead.summary_for_agent
    || (ex.documentType ? `${ex.documentType} · ${ex.documentNumber || ''}` : '')

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.75} onPress={onPress}>
      <View style={s.cardHeader}>
        <SourceBadge source={lead.source} />
        <Text style={s.time}>{timeAgo(lead.created_at)}</Text>
      </View>

      <Text style={s.name} numberOfLines={1}>{title || '—'}</Text>

      {ex.classification ? (
        <Text style={s.classification}>{t(`classification.${ex.classification}`, ex.classification)}</Text>
      ) : null}

      {summary ? (
        <Text style={s.summary} numberOfLines={2}>{summary}</Text>
      ) : null}

      <View style={s.cardFooter}>
        <LeadStatusPill status={lead.status} />
        {lead.match_score ? (
          <Text style={s.matchWarn}>⚠ {Math.round(lead.match_score * 100)}%</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

export default function LeadsScreen({ navigation }) {
  const { t } = useTranslation('leads')
  const [tab, setTab]         = useState('pending')
  const [leads, setLeads]     = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]     = useState(null)

  const load = useCallback(async (status) => {
    try {
      setError(null)
      const data = await getLeads(status)
      setLeads(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.message || 'Erreur')
      setLeads([])
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    load(tab).finally(() => setLoading(false))
  }, [tab, load])

  // Refresh when returning from detail
  useFocusEffect(useCallback(() => {
    load(tab)
  }, [tab, load]))

  const onRefresh = async () => {
    setRefreshing(true)
    await load(tab)
    setRefreshing(false)
  }

  return (
    <View style={s.container}>
      <HamburgerButton />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
      >
        <Text style={s.title}>{t('title')}</Text>
        <Text style={s.subtitle}>{t('subtitle')}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsRow} contentContainerStyle={s.chipsContent}>
          {TABS.map(k => {
            const active = tab === k
            return (
              <TouchableOpacity key={k} onPress={() => setTab(k)} style={[s.chip, active && s.chipActive]} activeOpacity={0.7}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{t(`tabs.${k}`)}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {loading ? (
          <View style={s.loading}><ActivityIndicator color={colors.ink} /></View>
        ) : error ? (
          <Text style={s.errorText}>{error}</Text>
        ) : leads.length === 0 ? (
          <Text style={s.empty}>{t('empty')}</Text>
        ) : (
          leads.map(l => (
            <LeadCard
              key={l.id}
              lead={l}
              onPress={() => navigation.navigate('LeadDetail', { leadId: l.id })}
            />
          ))
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  title:     { ...typography.screenTitle, paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: 4 },
  subtitle:  { ...typography.cardSub, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },

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

  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom:     10,
    borderRadius:     radius.card,
    borderWidth:      1,
    borderColor:      colors.border,
    padding:          spacing.md,
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  name:        { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  classification: { fontFamily: fonts.regular, fontSize: 12, color: colors.info, marginTop: 2 },
  summary:     { fontFamily: fonts.regular, fontSize: 13, color: colors.slate, marginTop: 6, lineHeight: 17 },
  time:        { fontFamily: fonts.regular, fontSize: 11, color: colors.slate },
  matchWarn:   { fontFamily: fonts.medium, fontSize: 11, color: colors.signal },

  loading:    { paddingVertical: 40, alignItems: 'center' },
  empty:      { color: colors.slate, textAlign: 'center', padding: 40, fontFamily: fonts.regular },
  errorText:  { color: colors.danger, textAlign: 'center', padding: 20, fontFamily: fonts.regular },
})
