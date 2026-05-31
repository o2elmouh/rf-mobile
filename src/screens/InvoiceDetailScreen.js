import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getInvoiceById, setInvoiceStatus, sendInvoiceWhatsApp } from '../lib/db'
import { supabase } from '../lib/supabase'
import { fmtDate } from '../lib/dates'
import { colors, radius, spacing, fonts, typography } from '../theme'

const STATUS_STYLE = {
  paid:      { hue: colors.success, label: 'Payée' },
  pending:   { hue: colors.signalSoft, label: 'En attente' },
  cancelled: { hue: colors.danger,  label: 'Annulée' },
}

export default function InvoiceDetailScreen({ route, navigation }) {
  const { invoiceId } = route.params || {}
  const [inv, setInv]         = useState(null)
  const [clientPhone, setClientPhone] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await getInvoiceById(invoiceId)
      setInv(data)
      if (data?.client_id) {
        const { data: c } = await supabase.from('clients').select('phone').eq('id', data.client_id).maybeSingle()
        setClientPhone(c?.phone || null)
      }
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [invoiceId])

  async function doStatus(status) {
    setActing(true)
    try {
      const updated = await setInvoiceStatus(invoiceId, status)
      setInv(updated)
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Action impossible')
    } finally {
      setActing(false)
    }
  }

  async function doSendWhatsapp() {
    if (!clientPhone) { Alert.alert('Numéro manquant', "Le client n'a pas de téléphone enregistré."); return }
    setActing(true)
    try {
      await sendInvoiceWhatsApp({
        to: clientPhone,
        clientName: inv.client_name,
        invoiceNumber: inv.invoice_number,
        totalTTC: inv.total_ttc,
      })
      Alert.alert('Envoyée', 'Facture envoyée par WhatsApp.')
    } catch (e) {
      Alert.alert('Erreur', e?.message || "L'envoi a échoué")
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return <SafeAreaView style={s.container}><View style={s.loading}><ActivityIndicator color={colors.ink} /></View></SafeAreaView>
  }
  if (!inv) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.headerBar}><TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity></View>
        <Text style={s.error}>Facture introuvable.</Text>
      </SafeAreaView>
    )
  }

  const style = STATUS_STYLE[inv.status] || { hue: colors.slate, label: inv.status }
  const days = inv.days || 0
  const totalHt = Number(inv.total_ht || 0)
  const tva = Number(inv.tva || 0)
  const totalTtc = Number(inv.total_ttc || 0)
  const dailyRate = days > 0 ? (totalHt / days) : null

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Facture</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={s.metaBlock}>
          <Text style={s.invNum}>{inv.invoice_number || '—'}</Text>
          <View style={[s.badge, { backgroundColor: style.hue + '1A' }]}>
            <Text style={[s.badgeText, { color: style.hue }]}>{style.label}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Row label="Client" value={inv.client_name || '—'} />
          <Row label="Contrat" value={inv.contract_number || '—'} />
          <Row label="Véhicule" value={inv.vehicle_name || '—'} />
          <Row label="Période" value={`${fmtDate(inv.start_date)} → ${fmtDate(inv.end_date)}`} />
          <Row label="Durée" value={`${days} jour${days > 1 ? 's' : ''}`} />
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Détail</Text>
          {dailyRate != null ? (
            <Row label={`${days} × ${dailyRate.toFixed(2)} MAD`} value={`${totalHt.toLocaleString()} MAD`} />
          ) : (
            <Row label="Total HT" value={`${totalHt.toLocaleString()} MAD`} />
          )}
          <Row label="TVA" value={`${tva.toLocaleString()} MAD`} />
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total TTC</Text>
            <Text style={s.totalVal}>{totalTtc.toLocaleString()} MAD</Text>
          </View>
        </View>

        <View style={s.actions}>
          {inv.status === 'pending' && (
            <TouchableOpacity disabled={acting} onPress={() => doStatus('paid')} style={[s.btn, s.btnPrimary]} activeOpacity={0.8}>
              <Text style={s.btnPrimaryText}>Marquer comme payée</Text>
            </TouchableOpacity>
          )}
          {inv.status !== 'cancelled' && (
            <TouchableOpacity
              disabled={acting}
              onPress={() => Alert.alert('Annuler la facture', 'Confirmer ?', [
                { text: 'Non', style: 'cancel' },
                { text: 'Annuler la facture', style: 'destructive', onPress: () => doStatus('cancelled') },
              ])}
              style={[s.btn, s.btnGhost]}
              activeOpacity={0.8}
            >
              <Text style={s.btnGhostText}>Annuler la facture</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity disabled={acting} onPress={doSendWhatsapp} style={[s.btn, s.btnSecondary]} activeOpacity={0.8}>
            <Text style={s.btnSecondaryText}>📲 Envoyer par WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: colors.danger, textAlign: 'center', padding: 20 },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  back: { color: colors.ink, fontSize: 22 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 17, color: colors.ink },

  metaBlock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 8 },
  invNum: { ...typography.screenTitle, fontSize: 22 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11 },

  card: { backgroundColor: colors.white, marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  cardTitle: { ...typography.sectionTitle, fontSize: 15, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { color: colors.slate, fontFamily: fonts.regular, fontSize: 13 },
  rowValue: { color: colors.ink, fontFamily: fonts.medium, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.ink, borderRadius: radius.card, padding: 14, marginTop: 12 },
  totalLabel: { color: 'rgba(243,240,238,0.7)', fontFamily: fonts.regular, fontSize: 14 },
  totalVal: { color: colors.canvas, fontFamily: fonts.medium, fontSize: 20 },

  actions: { paddingHorizontal: spacing.md, marginTop: spacing.lg, gap: 10 },
  btn: { paddingVertical: 13, borderRadius: radius.button, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.success },
  btnPrimaryText: { color: colors.white, fontFamily: fonts.bold, fontSize: 14 },
  btnSecondary: { backgroundColor: colors.ink },
  btnSecondaryText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 14 },
  btnGhost: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong },
  btnGhostText: { color: colors.danger, fontFamily: fonts.medium, fontSize: 14 },
})
