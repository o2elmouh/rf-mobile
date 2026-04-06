import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, TextInput } from 'react-native'
import { getClients } from '../lib/db'

export default function ClientsScreen() {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => { const data = await getClients(); setClients(data || []) }
  useEffect(() => { load() }, [])
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return !q || `${c.first_name} ${c.last_name} ${c.phone} ${c.id_number}`.toLowerCase().includes(q)
  })

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}>
      <Text style={s.title}>Clients</Text>
      <TextInput style={s.search} placeholder="Rechercher..." placeholderTextColor="#555"
        value={search} onChangeText={setSearch} />

      {filtered.map(c => (
        <View key={c.id} style={s.card}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(c.first_name?.[0] || '?').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{c.first_name} {c.last_name}</Text>
            <Text style={s.detail}>{c.phone || '—'}</Text>
            <Text style={s.detail}>{c.id_type?.toUpperCase()}: {c.id_number || '—'}</Text>
          </View>
          {c.flag_category && (
            <View style={s.flag}><Text style={s.flagText}>⚠</Text></View>
          )}
        </View>
      ))}
      {filtered.length === 0 && <Text style={s.empty}>Aucun client trouvé</Text>}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  title:     { color: '#fff', fontSize: 22, fontWeight: '700', padding: 20, paddingTop: 56, paddingBottom: 12 },
  search:    { backgroundColor: '#1a1a2e', marginHorizontal: 16, marginBottom: 12, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#333' },
  card:      { backgroundColor: '#1a1a2e', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:    { width: 42, height: 42, borderRadius: 21, backgroundColor: '#e9456022', alignItems: 'center', justifyContent: 'center' },
  avatarText:{ color: '#e94560', fontWeight: '800', fontSize: 18 },
  name:      { color: '#fff', fontWeight: '700', fontSize: 15 },
  detail:    { color: '#888', fontSize: 12, marginTop: 2 },
  flag:      { backgroundColor: '#f59e0b22', borderRadius: 6, padding: 6 },
  flagText:  { color: '#f59e0b', fontSize: 16 },
  empty:     { color: '#555', textAlign: 'center', padding: 40 },
})
