import { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { searchNetwork, createNetworkRequest } from '../lib/db'
import { colors, radius, spacing, fonts, typography } from '../theme'
import HamburgerButton from '../components/HamburgerButton'

function ResultCard({ v, onPress }) {
  return (
    <TouchableOpacity style={s.card} activeOpacity={0.75} onPress={onPress}>
      <View style={s.cardHeader}>
        <Text style={s.brand}>{`${v.brand || ''} ${v.model || ''}`.trim() || '—'}</Text>
        {v.year ? <Text style={s.year}>{v.year}</Text> : null}
      </View>
      <Text style={s.meta}>
        {[v.transmission, v.fuel_type, v.seats ? `${v.seats} pl.` : null].filter(Boolean).join(' · ')}
      </Text>
      <View style={s.cardFooter}>
        <Text style={s.city}>📍 {v.city || '—'}</Text>
        <Text style={s.price}>
          {v.network_daily_price ? `${Number(v.network_daily_price).toLocaleString()} MAD/j` : '—'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

export default function NetworkSearchScreen({ navigation }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [city, setCity]           = useState('')
  const [transmission, setTransmission] = useState('')
  const [results, setResults]     = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError]         = useState(null)

  const [selected, setSelected]   = useState(null)
  const [notes, setNotes]         = useState('')
  const [sending, setSending]     = useState(false)

  async function doSearch() {
    if (!startDate || !endDate) {
      Alert.alert('Dates requises', 'Veuillez renseigner les dates de début et de fin.'); return
    }
    setSearching(true); setError(null)
    try {
      const r = await searchNetwork({ startDate, endDate, city: city.trim() || undefined, transmission: transmission || undefined })
      setResults(Array.isArray(r?.results) ? r.results : [])
    } catch (e) {
      setError(e?.message || 'Recherche impossible'); setResults([])
    } finally {
      setSearching(false)
    }
  }

  async function doSendRequest() {
    if (!selected) return
    setSending(true)
    try {
      await createNetworkRequest({
        vehicle_id: selected.id,
        start_date: startDate,
        end_date:   endDate,
        requester_notes: notes.trim() || undefined,
      })
      setSelected(null); setNotes('')
      Alert.alert('Demande envoyée', 'L\'agence propriétaire recevra votre demande.')
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  const days = (() => {
    if (!startDate || !endDate) return 0
    const a = new Date(startDate), b = new Date(endDate)
    if (isNaN(a) || isNaN(b) || b <= a) return 0
    return Math.ceil((b - a) / 86400000)
  })()
  const totalForSelected = selected && days > 0 && selected.network_daily_price
    ? Number(selected.network_daily_price) * days
    : null

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Réseau — Recherche</Text>
        <HamburgerButton inline />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
        <View style={s.filterCard}>
          <View style={s.row}>
            <View style={s.col}>
              <Text style={s.label}>Date début *</Text>
              <TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.dustTaupe} autoCapitalize="none" style={s.input} />
            </View>
            <View style={s.col}>
              <Text style={s.label}>Date fin *</Text>
              <TextInput value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.dustTaupe} autoCapitalize="none" style={s.input} />
            </View>
          </View>
          <Text style={s.label}>Ville (optionnel)</Text>
          <TextInput value={city} onChangeText={setCity} placeholder="Ex: Casablanca" placeholderTextColor={colors.dustTaupe} style={s.input} />
          <Text style={s.label}>Transmission</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[['', 'Toutes'], ['manual', 'Manuelle'], ['automatic', 'Automatique']].map(([k, label]) => (
              <TouchableOpacity key={k || 'any'} style={[s.pill, transmission === k && s.pillActive]} onPress={() => setTransmission(k)}>
                <Text style={[s.pillText, transmission === k && s.pillTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity disabled={searching} onPress={doSearch} style={[s.searchBtn, searching && { opacity: 0.6 }]} activeOpacity={0.8}>
            <Text style={s.searchBtnText}>{searching ? 'Recherche…' : 'Rechercher'}</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {!searching && results.length === 0 ? (
          <Text style={s.empty}>{startDate && endDate ? 'Aucun véhicule disponible.' : 'Renseignez des dates et lancez la recherche.'}</Text>
        ) : (
          results.map(v => <ResultCard key={v.id} v={v} onPress={() => setSelected(v)} />)
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={s.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={s.modalTitle}>Demander ce véhicule</Text>
            {selected && (
              <View style={s.modalInfo}>
                <Text style={s.modalBrand}>{`${selected.brand} ${selected.model}`.trim()}</Text>
                <Text style={s.modalMeta}>
                  📅 {startDate} → {endDate} · {days} jour{days > 1 ? 's' : ''}
                </Text>
                {totalForSelected != null ? (
                  <Text style={s.modalTotal}>Total estimé : {totalForSelected.toLocaleString()} MAD</Text>
                ) : null}
              </View>
            )}
            <Text style={s.label}>Note (optionnel)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Précisions pour l'agence propriétaire…"
              placeholderTextColor={colors.dustTaupe}
              multiline
              style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]}
            />
            <TouchableOpacity disabled={sending} onPress={doSendRequest} style={[s.sendBtn, sending && { opacity: 0.6 }]} activeOpacity={0.8}>
              <Text style={s.sendBtnText}>{sending ? 'Envoi…' : 'Envoyer la demande'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.ink, fontSize: 22, width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 17, color: colors.ink },

  filterCard: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: 8 },
  col: { flex: 1 },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: fonts.regular, color: colors.ink },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.white },
  pillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { color: colors.slate, fontFamily: fonts.regular, fontSize: 12 },
  pillTextActive: { color: colors.canvas, fontFamily: fonts.medium },
  searchBtn: { marginTop: 14, backgroundColor: colors.ink, paddingVertical: 12, borderRadius: radius.button, alignItems: 'center' },
  searchBtnText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 14 },

  card: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, flex: 1 },
  year: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginTop: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  city: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate },
  price: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },

  error: { color: colors.danger, textAlign: 'center', fontFamily: fonts.regular, padding: 12 },
  empty: { color: colors.slate, textAlign: 'center', padding: 40, fontFamily: fonts.regular },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.canvas, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: spacing.lg, paddingBottom: spacing.xl },
  modalTitle: { ...typography.sectionTitle, fontSize: 18, marginBottom: spacing.md },
  modalInfo: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  modalBrand: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  modalMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.slate, marginTop: 6 },
  modalTotal: { fontFamily: fonts.bold, fontSize: 14, color: colors.success, marginTop: 8 },
  sendBtn: { marginTop: spacing.md, backgroundColor: colors.ink, paddingVertical: 13, borderRadius: radius.button, alignItems: 'center' },
  sendBtnText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 14 },
})
