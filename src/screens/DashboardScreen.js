import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native'
import { Menu } from 'lucide-react-native'
import { getDashboardStats, getActiveContracts } from '../lib/db'
import { fmtDate } from '../lib/dates'
import { useDrawer } from '../navigation/DrawerContext'
import {
  colors, radius, spacing, fonts, typography,
} from '../theme'

// ── Sub-components ─────────────────────────────────────────────────────────

function Eyebrow({ children }) {
  return (
    <View style={s.eyebrowRow}>
      <View style={s.eyebrowDot} />
      <Text style={s.eyebrowText}>{children}</Text>
    </View>
  )
}

function KpiCard({ label, value, sub, subColor }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiValue}>{value ?? '—'}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      {sub ? (
        <Text style={[s.kpiSub, subColor && { color: subColor }]}>{sub}</Text>
      ) : null}
    </View>
  )
}

// Days remaining until return_date (negative = overdue)
function daysLeft(returnDate) {
  if (!returnDate) return null
  const diff = Math.round((new Date(returnDate) - Date.now()) / 86_400_000)
  return diff
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }) {
  const { openMenu } = useDrawer()

  const [stats,      setStats]      = useState(null)
  const [contracts,  setContracts]  = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    const [s, c] = await Promise.all([getDashboardStats(), getActiveContracts()])
    setStats(s)
    setContracts(c || [])
  }

  useEffect(() => { load() }, [])
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  // Contracts returning today
  const today = new Date().toISOString().slice(0, 10)
  const returnsToday = contracts.filter(c => c.return_date?.slice(0, 10) === today).length
  const overdue      = contracts.filter(c => daysLeft(c.return_date) < 0).length

  return (
    <ScrollView
      style={s.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.ink}
        />
      }
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Bonjour</Text>
          <Text style={s.agencyName}>Tableau de bord</Text>
        </View>
        <TouchableOpacity
          onPress={openMenu}
          style={s.menuBtn}
          activeOpacity={0.75}
          accessibilityLabel="Ouvrir le menu"
        >
          <Menu size={20} color={colors.ink} strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      {/* ── Alert strip (returns today) ── */}
      {returnsToday > 0 && (
        <View style={s.alertStrip}>
          <Text style={s.alertText}>
            {returnsToday} retour{returnsToday > 1 ? 's' : ''} attendu{returnsToday > 1 ? 's' : ''} aujourd'hui
          </Text>
        </View>
      )}

      {/* ── KPI grid ── */}
      <View style={s.kpiRow}>
        <KpiCard
          label="Disponibles"
          value={stats?.available_vehicles}
          sub={stats?.available_vehicles != null ? `sur ${stats.total_vehicles}` : null}
          subColor={colors.slate}
        />
        <KpiCard
          label="En location"
          value={stats?.rented_vehicles}
          sub={stats?.rented_vehicles != null ? `sur ${stats.total_vehicles}` : null}
          subColor={colors.slate}
        />
        <KpiCard
          label="Retours auj."
          value={returnsToday}
          sub={returnsToday > 0 ? 'à traiter' : 'aucun'}
          subColor={returnsToday > 0 ? colors.warning : colors.slate}
        />
        <KpiCard
          label="En retard"
          value={overdue}
          sub={overdue > 0 ? 'urgent' : 'aucun'}
          subColor={overdue > 0 ? colors.danger : colors.slate}
        />
      </View>

      {/* ── Revenue banner ── */}
      <View style={s.revenueCard}>
        <Text style={s.revenueLabel}>REVENUS CE MOIS</Text>
        <Text style={s.revenueValue}>
          {stats?.monthly_revenue
            ? `${Number(stats.monthly_revenue).toLocaleString('fr-MA')} MAD`
            : '— MAD'}
        </Text>
      </View>

      {/* ── Quick actions (compact) ── */}
      <View style={s.actionRow}>
        <TouchableOpacity
          style={s.btnPrimary}
          onPress={() => navigation.navigate('NewRental')}
          activeOpacity={0.85}
        >
          <Text style={s.btnPrimaryText}>+ Nouveau contrat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.btnSecondary}
          onPress={() => navigation.navigate('RestitutionPicker')}
          activeOpacity={0.85}
        >
          <Text style={s.btnSecondaryText}>Restituer</Text>
        </TouchableOpacity>
      </View>

      {/* ── Active contracts ── */}
      <View style={s.sectionHeader}>
        <Eyebrow>Contrats actifs</Eyebrow>
        <Text style={s.sectionCount}>{contracts.length}</Text>
      </View>

      {contracts.map(c => {
        const days = daysLeft(c.return_date)
        const isToday   = days === 0
        const isOverdue = days !== null && days < 0

        return (
          <TouchableOpacity
            key={c.id}
            style={s.contractCard}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('RestitutionWizard', { contract: c })}
          >
            <View style={s.contractTop}>
              <Text style={s.contractNum}>{c.contract_number}</Text>
              {isOverdue ? (
                <View style={[s.pill, s.pillDanger]}>
                  <Text style={[s.pillText, { color: colors.danger }]}>
                    {Math.abs(days)}j de retard
                  </Text>
                </View>
              ) : isToday ? (
                <View style={[s.pill, s.pillWarning]}>
                  <Text style={[s.pillText, { color: colors.warning }]}>Retour auj.</Text>
                </View>
              ) : days !== null ? (
                <View style={[s.pill, s.pillOk]}>
                  <Text style={[s.pillText, { color: colors.success }]}>J+{days}</Text>
                </View>
              ) : (
                <View style={[s.pill, s.pillOk]}>
                  <Text style={[s.pillText, { color: colors.success }]}>Actif</Text>
                </View>
              )}
            </View>
            <Text style={s.contractClient}>
              {c.client_name || '—'}
              {c.vehicle_plate ? ` · ${c.vehicle_plate}` : ''}
            </Text>
            <View style={s.contractBottom}>
              <Text style={s.contractDates}>
                {fmtDate(c.pickup_date)} → {fmtDate(c.return_date)}
              </Text>
              <Text style={s.contractAmount}>
                {Number(c.total_amount || 0).toLocaleString('fr-MA')} MAD
              </Text>
            </View>
          </TouchableOpacity>
        )
      })}

      {contracts.length === 0 && (
        <View style={s.emptyWrap}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={s.empty}>Aucun contrat actif</Text>
        </View>
      )}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },

  // Header
  header: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    paddingHorizontal: spacing.lg,
    paddingTop:        56,
    paddingBottom:     spacing.md,
  },
  greeting: {
    fontFamily:    fonts.regular,
    fontSize:      14,
    color:         colors.slate,
    letterSpacing: -0.1,
    marginBottom:  2,
  },
  agencyName: {
    ...typography.screenTitle,
  },
  menuBtn: {
    width:           40,
    height:          40,
    borderRadius:    radius.pill,
    backgroundColor: colors.white,
    borderWidth:     1,
    borderColor:     colors.borderStrong,
    justifyContent:  'center',
    alignItems:      'center',
  },

  // Eyebrow
  eyebrowRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  eyebrowDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.signalSoft },
  eyebrowText: { ...typography.eyebrow },

  // Alert strip
  alertStrip: {
    marginHorizontal: spacing.md,
    marginBottom:     spacing.sm,
    backgroundColor:  'rgba(186, 117, 23, 0.10)',
    borderRadius:     radius.button,
    borderWidth:      0.5,
    borderColor:      'rgba(186, 117, 23, 0.30)',
    paddingVertical:  10,
    paddingHorizontal: spacing.md,
  },
  alertText: {
    fontFamily: fonts.medium,
    fontSize:   13,
    color:      '#854F0B',
    letterSpacing: -0.1,
  },

  // KPI grid
  kpiRow: {
    flexDirection:    'row',
    flexWrap:         'wrap',
    paddingHorizontal: spacing.md,
    gap:              10,
    marginBottom:     spacing.sm,
  },
  kpi: {
    flexBasis:       '48%',
    flexGrow:        0,
    flexShrink:      0,
    backgroundColor: colors.white,
    borderRadius:    radius.card,
    padding:         spacing.md,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  kpiValue: {
    fontFamily:    fonts.medium,
    fontSize:      26,
    lineHeight:    28,
    letterSpacing: -0.56,
    color:         colors.ink,
  },
  kpiLabel: { ...typography.cardSub, marginTop: 4 },
  kpiSub:   {
    fontFamily: fonts.medium,
    fontSize:   11,
    marginTop:  3,
    color:      colors.slate,
  },

  // Revenue banner
  revenueCard: {
    marginHorizontal: spacing.md,
    marginVertical:   spacing.md,
    backgroundColor:  colors.ink,
    borderRadius:     radius.hero,
    padding:          spacing.lg,
  },
  revenueLabel: {
    ...typography.eyebrow,
    color: 'rgba(243,240,238,0.6)',
  },
  revenueValue: {
    fontFamily:    fonts.medium,
    fontSize:      32,
    lineHeight:    36,
    letterSpacing: -0.7,
    color:         colors.canvas,
    marginTop:     6,
  },

  // Quick actions — compact pill buttons
  actionRow: {
    flexDirection:    'row',
    gap:              8,
    marginHorizontal: spacing.md,
    marginBottom:     spacing.lg,
  },
  btnPrimary: {
    flex:              1,
    backgroundColor:   colors.ink,
    borderRadius:      radius.button,
    borderWidth:       1,
    borderColor:       colors.ink,
    paddingVertical:   9,
    paddingHorizontal: 12,
    alignItems:        'center',
  },
  btnPrimaryText: {
    color:         colors.canvas,
    fontFamily:    fonts.medium,
    fontSize:      13,
    letterSpacing: -0.3,
  },
  btnSecondary: {
    flex:              1,
    backgroundColor:   colors.white,
    borderRadius:      radius.button,
    borderWidth:       1,
    borderColor:       colors.ink,
    paddingVertical:   9,
    paddingHorizontal: 12,
    alignItems:        'center',
  },
  btnSecondaryText: {
    color:         colors.ink,
    fontFamily:    fonts.regular,
    fontSize:      13,
    letterSpacing: -0.3,
  },

  // Section header
  sectionHeader: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'flex-end',
    paddingHorizontal: spacing.md,
    marginBottom:     spacing.sm,
  },
  sectionCount: {
    fontFamily: fonts.bold,
    fontSize:   13,
    color:      colors.slate,
  },

  // Contract cards
  contractCard: {
    backgroundColor:  colors.white,
    marginHorizontal: spacing.md,
    marginBottom:     8,
    borderRadius:     radius.card,
    padding:          spacing.md,
    borderWidth:      1,
    borderColor:      colors.border,
  },
  contractTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   4,
  },
  contractNum:    { ...typography.cardTitle },
  contractClient: { ...typography.cardSub, marginBottom: 8 },
  contractBottom: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    gap:            12,
  },
  contractDates:  { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, flexShrink: 1 },
  contractAmount: { color: colors.ink, fontFamily: fonts.medium, fontSize: 15, letterSpacing: -0.3, flexShrink: 0 },

  // Status pills
  pill: {
    borderRadius:    radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  pillOk:      { backgroundColor: 'rgba(30,127,58,0.10)' },
  pillWarning: { backgroundColor: 'rgba(207,69,0,0.10)' },
  pillDanger:  { backgroundColor: 'rgba(178,56,36,0.10)' },
  pillText:    { fontFamily: fonts.bold, fontSize: 11 },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  empty:     { color: colors.slate, fontSize: 14, fontFamily: fonts.regular },
})
