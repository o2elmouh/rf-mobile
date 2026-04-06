import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native'
import { getDashboardStats, getActiveContracts } from '../lib/db'
import { supabase } from '../lib/supabase'

function KpiCard({ label, value, color }) {
  return (
    <View style={[s.kpi, { borderLeftColor: color }]}>
      <Text style={s.kpiValue}>{value ?? '—'}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  )
}

export default function DashboardScreen() {
  const [stats,     setStats]     = useState(null)
  const [contracts, setContracts] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    const [s, c] = await Promise.all([getDashboardStats(), getActiveContracts()])
    setStats(s); setContracts(c || [])
  }

  useEffect(() => { load() }, [])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const handleLogout = () => supabase.auth.signOut()

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Tableau de bord</Text>
          <Text style={s.subtitle}>Vue d'ensemble</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
          <Text style={s.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <View style={s.kpiRow}>
        <KpiCard label="Véhicules"    value={stats?.total_vehicles}     color="#e94560" />
        <KpiCard label="En location"  value={stats?.rented_vehicles}    color="#f59e0b" />
        <KpiCard label="Disponibles"  value={stats?.available_vehicles} color="#10b981" />
        <KpiCard label="Clients"      value={stats?.total_clients}      color="#6366f1" />
      </View>

      <View style={s.revenueCard}>
        <Text style={s.revenueLabel}>Revenus ce mois</Text>
        <Text style={s.revenueValue}>{stats?.monthly_revenue ? `${Number(stats.monthly_revenue).toLocaleString()} MAD` : '— MAD'}</Text>
      </View>

      <Text style={s.sectionTitle}>Contrats actifs ({contracts.length})</Text>
      {contracts.map(c => (
        <View key={c.id} style={s.contractCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.contractNum}>{c.contract_number}</Text>
            <View style={s.badge}><Text style={s.badgeText}>Actif</Text></View>
          </View>
          <Text style={s.contractDetail}>{c.client_name || '—'}</Text>
          <Text style={s.contractDetail}>{c.pickup_date} → {c.return_date}</Text>
          <Text style={s.contractAmount}>{Number(c.total_amount || 0).toLocaleString()} MAD</Text>
        </View>
      ))}
      {contracts.length === 0 && <Text style={s.empty}>Aucun contrat actif</Text>}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0f0f1a' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  title:          { color: '#fff', fontSize: 22, fontWeight: '700' },
  subtitle:       { color: '#888', fontSize: 13, marginTop: 2 },
  logoutBtn:      { backgroundColor: '#1a1a2e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  logoutText:     { color: '#e94560', fontSize: 13, fontWeight: '600' },
  kpiRow:         { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  kpi:            { flex: 1, minWidth: '45%', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, borderLeftWidth: 3 },
  kpiValue:       { color: '#fff', fontSize: 26, fontWeight: '700' },
  kpiLabel:       { color: '#888', fontSize: 12, marginTop: 4 },
  revenueCard:    { margin: 16, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 20, alignItems: 'center' },
  revenueLabel:   { color: '#888', fontSize: 13 },
  revenueValue:   { color: '#e94560', fontSize: 28, fontWeight: '800', marginTop: 4 },
  sectionTitle:   { color: '#fff', fontSize: 16, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 },
  contractCard:   { backgroundColor: '#1a1a2e', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 16 },
  contractNum:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  contractDetail: { color: '#888', fontSize: 13, marginTop: 3 },
  contractAmount: { color: '#10b981', fontWeight: '700', fontSize: 16, marginTop: 8 },
  badge:          { backgroundColor: '#e9456022', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:      { color: '#e94560', fontSize: 11, fontWeight: '600' },
  empty:          { color: '#555', textAlign: 'center', padding: 20 },
})
