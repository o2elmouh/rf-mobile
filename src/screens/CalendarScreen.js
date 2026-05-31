import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Calendar, LocaleConfig } from 'react-native-calendars'
import { useFocusEffect } from '@react-navigation/native'
import { getContracts, getReservations } from '../lib/db'
import { fmtDate } from '../lib/dates'
import { colors, radius, spacing, fonts, typography } from '../theme'
import HamburgerButton from '../components/HamburgerButton'

LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  monthNamesShort: ['Janv','Févr','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
  today: "Aujourd'hui",
}
LocaleConfig.defaultLocale = 'fr'

const DOT_CONTRACT    = { key: 'contract',    color: colors.signalSoft }
const DOT_RESERVATION = { key: 'reservation', color: colors.info }

function isoDay(d) {
  if (!d) return null
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date)) return null
  // YYYY-MM-DD in local time
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function* daysBetween(startIso, endIso) {
  if (!startIso || !endIso) return
  const start = new Date(startIso)
  const end   = new Date(endIso)
  if (isNaN(start) || isNaN(end) || end < start) return
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (cur <= last) {
    yield isoDay(cur)
    cur.setDate(cur.getDate() + 1)
  }
}

export default function CalendarScreen({ navigation }) {
  const [contracts, setContracts]       = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [selected, setSelected]         = useState(isoDay(new Date()))

  const load = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([
        getContracts().catch(() => []),
        // Pull a large page; sort by start_date so the markers are stable.
        getReservations({ page: 1, pageSize: 200, sort: 'start_date', order: 'asc' }).catch(() => null),
      ])
      setContracts(c || [])
      setReservations(Array.isArray(r?.data) ? r.data : [])
    } catch {
      setContracts([]); setReservations([])
    }
  }, [])

  useEffect(() => { load().finally(() => setLoading(false)) }, [load])
  useFocusEffect(useCallback(() => { load() }, [load]))
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const markedDates = useMemo(() => {
    const marks = {}
    for (const c of contracts) {
      if (c.status === 'cancelled') continue
      const start = c.pickup_date
      const end   = c.return_date || c.pickup_date
      for (const day of daysBetween(start, end)) {
        if (!day) continue
        marks[day] = marks[day] || { dots: [] }
        if (!marks[day].dots.some(d => d.key === 'contract')) marks[day].dots.push(DOT_CONTRACT)
      }
    }
    for (const r of reservations) {
      if (r.status === 'CANCELLED') continue
      for (const day of daysBetween(r.start_date, r.end_date)) {
        if (!day) continue
        marks[day] = marks[day] || { dots: [] }
        if (!marks[day].dots.some(d => d.key === 'reservation')) marks[day].dots.push(DOT_RESERVATION)
      }
    }
    if (selected) {
      marks[selected] = { ...(marks[selected] || { dots: [] }), selected: true, selectedColor: colors.ink }
    }
    return marks
  }, [contracts, reservations, selected])

  const itemsForSelected = useMemo(() => {
    if (!selected) return { contracts: [], reservations: [] }
    const cs = contracts.filter(c => {
      if (c.status === 'cancelled') return false
      const start = isoDay(c.pickup_date)
      const end   = isoDay(c.return_date || c.pickup_date)
      return start && end && selected >= start && selected <= end
    })
    const rs = reservations.filter(r => {
      if (r.status === 'CANCELLED') return false
      const start = isoDay(r.start_date)
      const end   = isoDay(r.end_date)
      return start && end && selected >= start && selected <= end
    })
    return { contracts: cs, reservations: rs }
  }, [contracts, reservations, selected])

  return (
    <View style={s.container}>
      <HamburgerButton />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
      >
        <Text style={s.title}>Calendrier</Text>
        <Text style={s.subtitle}>Contrats et réservations</Text>

        {loading ? (
          <View style={s.center}><ActivityIndicator color={colors.ink} /></View>
        ) : (
          <>
            <View style={s.calCard}>
              <Calendar
                markingType="multi-dot"
                markedDates={markedDates}
                onDayPress={(d) => setSelected(d.dateString)}
                firstDay={1}
                enableSwipeMonths
                theme={{
                  backgroundColor: colors.white,
                  calendarBackground: colors.white,
                  textSectionTitleColor: colors.slate,
                  selectedDayBackgroundColor: colors.ink,
                  selectedDayTextColor: colors.canvas,
                  todayTextColor: colors.signalSoft,
                  dayTextColor: colors.ink,
                  textDisabledColor: colors.dustTaupe,
                  arrowColor: colors.ink,
                  monthTextColor: colors.ink,
                  textMonthFontFamily: fonts.bold,
                  textDayFontFamily: fonts.regular,
                  textDayHeaderFontFamily: fonts.medium,
                }}
              />
            </View>

            <View style={s.legendRow}>
              <View style={s.legendItem}>
                <View style={[s.dot, { backgroundColor: DOT_CONTRACT.color }]} />
                <Text style={s.legendText}>Contrats</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.dot, { backgroundColor: DOT_RESERVATION.color }]} />
                <Text style={s.legendText}>Réservations</Text>
              </View>
            </View>

            <Text style={s.section}>{selected || ''}</Text>

            {itemsForSelected.contracts.length === 0 && itemsForSelected.reservations.length === 0 ? (
              <Text style={s.empty}>Rien ce jour-là.</Text>
            ) : (
              <>
                {itemsForSelected.contracts.map(c => (
                  <TouchableOpacity
                    key={`c-${c.id}`}
                    style={[s.card, { borderLeftColor: DOT_CONTRACT.color, borderLeftWidth: 3 }]}
                    onPress={() => navigation.navigate('ContractDetail', { contractId: c.id })}
                    activeOpacity={0.75}
                  >
                    <Text style={s.kind}>CONTRAT</Text>
                    <Text style={s.cardTitle}>{c.contract_number || '—'}</Text>
                    <Text style={s.cardSub}>{c.client_name || '—'} · {c.vehicle_label || '—'}</Text>
                    <Text style={s.cardDates}>{fmtDate(c.pickup_date)} → {fmtDate(c.return_date)}</Text>
                  </TouchableOpacity>
                ))}
                {itemsForSelected.reservations.map(r => (
                  <TouchableOpacity
                    key={`r-${r.id}`}
                    style={[s.card, { borderLeftColor: DOT_RESERVATION.color, borderLeftWidth: 3 }]}
                    onPress={() => navigation.navigate('ReservationDetail', { reservationId: r.id })}
                    activeOpacity={0.75}
                  >
                    <Text style={s.kind}>RÉSERVATION</Text>
                    <Text style={s.cardTitle}>{r.customer_name || '—'}</Text>
                    <Text style={s.cardSub}>{r.car_model || '—'}</Text>
                    <Text style={s.cardDates}>{fmtDate(r.start_date)} → {fmtDate(r.end_date)}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  center: { paddingVertical: 40, alignItems: 'center' },
  title:    { ...typography.screenTitle, paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: 4 },
  subtitle: { ...typography.cardSub, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  calCard:  { backgroundColor: colors.white, marginHorizontal: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  legendRow: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.md, paddingTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate },
  section: { ...typography.eyebrow, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: 8 },
  empty: { color: colors.slate, textAlign: 'center', padding: 30, fontFamily: fonts.regular },
  card: { backgroundColor: colors.white, marginHorizontal: spacing.md, marginBottom: 10, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  kind: { fontFamily: fonts.bold, fontSize: 10, color: colors.slate, letterSpacing: 0.5, marginBottom: 4 },
  cardTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  cardSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginTop: 2 },
  cardDates: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginTop: 6 },
})
