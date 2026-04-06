import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { getFleet } from '../lib/db'

const STATUS_COLOR = { available: '#10b981', rented: '#f59e0b', maintenance: '#ef4444', retired: '#888' }
const STATUS_LABEL = { available: 'Disponible', rented: 'En location', maintenance: 'Maintenance', retired: 'Retiré' }

export default function FleetScreen() {
  const [fleet, setFleet] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => { const data = await getFleet(); setFleet(data || []) }
  useEffect(() => { load() }, [])
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}>
      <Text style={s.title}>Parc automobile</Text>
      <Text style={s.subtitle}>{fleet.length} véhicule{fleet.length !== 1 ? 's' : ''}</Text>

      {fleet.map(v => (
        <View key={v.id} style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.vehicleName}>{v.brand} {v.model} {v.year}</Text>
            <View style={[s.badge, { backgroundColor: (STATUS_COLOR[v.status] || '#888') + '22' }]}>
              <Text style={[s.badgeText, { color: STATUS_COLOR[v.status] || '#888' }]}>{STATUS_LABEL[v.status] || v.status}</Text>
            </View>
          </View>
          <Text style={s.plate}>{v.plate_number}</Text>
          <View style={s.row}>
            <Text style={s.detail}>{Number(v.mileage || 0).toLocaleString()} km</Text>
            <Text style={s.rate}>{Number(v.daily_rate || 0).toLocaleString()} MAD/j</Text>
          </View>
        </View>
      ))}
      {fleet.length === 0 && <Text style={s.empty}>Aucun véhicule</Text>}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0f0f1a' },
  title:       { color: '#fff', fontSize: 22, fontWeight: '700', padding: 20, paddingTop: 56, paddingBottom: 4 },
  subtitle:    { color: '#888', fontSize: 13, paddingHorizontal: 20, marginBottom: 12 },
  card:        { backgroundColor: '#1a1a2e', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 16 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicleName: { color: '#fff', fontWeight: '700', fontSize: 15, flex: 1 },
  plate:       { color: '#888', fontSize: 13, marginTop: 4 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  detail:      { color: '#aaa', fontSize: 13 },
  rate:        { color: '#e94560', fontWeight: '700', fontSize: 14 },
  badge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:   { fontSize: 11, fontWeight: '600' },
  empty:       { color: '#555', textAlign: 'center', padding: 40 },
})
