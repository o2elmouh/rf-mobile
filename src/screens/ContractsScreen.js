import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { getContracts } from '../lib/db'

const STATUS_COLOR = { active: '#10b981', closed: '#6366f1', draft: '#f59e0b', cancelled: '#ef4444' }
const STATUS_LABEL = { active: 'Actif', closed: 'Clôturé', draft: 'Brouillon', cancelled: 'Annulé' }

export default function ContractsScreen() {
  const [contracts, setContracts] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => { const data = await getContracts(); setContracts(data || []) }
  useEffect(() => { load() }, [])
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}>
      <Text style={s.title}>Contrats</Text>
      <Text style={s.subtitle}>{contracts.length} contrat{contracts.length !== 1 ? 's' : ''}</Text>

      {contracts.map(c => (
        <View key={c.id} style={s.card}>
          <View style={s.row}>
            <Text style={s.num}>{c.contract_number}</Text>
            <View style={[s.badge, { backgroundColor: (STATUS_COLOR[c.status] || '#888') + '22' }]}>
              <Text style={[s.badgeText, { color: STATUS_COLOR[c.status] || '#888' }]}>{STATUS_LABEL[c.status] || c.status}</Text>
            </View>
          </View>
          <Text style={s.client}>{c.client_name || '—'}</Text>
          <Text style={s.dates}>{c.pickup_date} → {c.return_date}</Text>
          <Text style={s.amount}>{Number(c.total_amount || 0).toLocaleString()} MAD</Text>
        </View>
      ))}
      {contracts.length === 0 && <Text style={s.empty}>Aucun contrat</Text>}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  title:     { color: '#fff', fontSize: 22, fontWeight: '700', padding: 20, paddingTop: 56, paddingBottom: 4 },
  subtitle:  { color: '#888', fontSize: 13, paddingHorizontal: 20, marginBottom: 12 },
  card:      { backgroundColor: '#1a1a2e', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 16 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  num:       { color: '#fff', fontWeight: '700', fontSize: 15 },
  client:    { color: '#aaa', fontSize: 13, marginTop: 4 },
  dates:     { color: '#666', fontSize: 12, marginTop: 3 },
  amount:    { color: '#10b981', fontWeight: '700', fontSize: 15, marginTop: 8 },
  badge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty:     { color: '#555', textAlign: 'center', padding: 40 },
})
