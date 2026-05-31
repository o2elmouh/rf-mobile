import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Modal, Pressable, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useUser } from '../../lib/UserContext'
import { getTeam, inviteTeamMember, setTeamMemberRole, removeTeamMember } from '../../lib/db'
import { colors, radius, spacing, fonts, typography } from '../../theme'

function MemberRow({ m, isSelf, onChangeRole, onRemove }) {
  return (
    <TouchableOpacity
      style={s.row}
      onLongPress={() => {
        if (isSelf) return
        Alert.alert(m.full_name || m.email, '', [
          { text: 'Annuler', style: 'cancel' },
          { text: m.role === 'admin' ? 'Passer en staff' : 'Passer en admin', onPress: () => onChangeRole(m.id, m.role === 'admin' ? 'staff' : 'admin') },
          { text: 'Retirer', style: 'destructive', onPress: () => onRemove(m.id, m.full_name || m.email) },
        ])
      }}
      activeOpacity={0.8}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.name}>
          {m.full_name || m.email}
          {isSelf ? <Text style={s.self}>  (vous)</Text> : null}
        </Text>
        <Text style={s.email}>{m.email}</Text>
      </View>
      <View style={[s.roleBadge, m.role === 'admin' ? s.roleAdmin : s.roleStaff]}>
        <Text style={[s.roleText, m.role === 'admin' ? s.roleAdminText : s.roleStaffText]}>
          {m.role === 'admin' ? 'Admin' : 'Staff'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

export default function TeamScreen({ navigation }) {
  const { user } = useUser()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [inviting, setInviting] = useState(false)

  async function load() {
    setLoading(true)
    try { setMembers(await getTeam()) }
    catch (e) { Alert.alert('Erreur', e?.message || 'Chargement impossible') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function doInvite() {
    if (!email.trim()) return
    setInviting(true)
    try {
      await inviteTeamMember(email.trim(), role)
      Alert.alert('Invitation envoyée', `Un lien magique a été envoyé à ${email.trim()}.`)
      setEmail(''); setRole('staff'); setModalOpen(false); await load()
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Invitation impossible')
    } finally {
      setInviting(false)
    }
  }

  async function doChangeRole(id, newRole) {
    try { await setTeamMemberRole(id, newRole); await load() }
    catch (e) { Alert.alert('Erreur', e?.message || 'Action impossible') }
  }

  function doRemove(id, name) {
    Alert.alert('Retirer un membre', `Retirer ${name} de l'agence ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: async () => {
        try { await removeTeamMember(id); await load() }
        catch (e) { Alert.alert('Erreur', e?.message || 'Action impossible') }
      } },
    ])
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Équipe</Text>
        <TouchableOpacity onPress={() => setModalOpen(true)} style={s.inviteBtn}>
          <Text style={s.inviteBtnText}>+ Inviter</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.ink} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
          {members.length === 0 ? (
            <Text style={s.empty}>Aucun membre.</Text>
          ) : (
            members.map(m => (
              <MemberRow
                key={m.id}
                m={m}
                isSelf={m.id === user?.id}
                onChangeRole={doChangeRole}
                onRemove={doRemove}
              />
            ))
          )}
          <Text style={s.hint}>Appui long sur un membre pour modifier son rôle ou le retirer.</Text>
        </ScrollView>
      )}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={s.modalTitle}>Inviter un membre</Text>
            <Text style={s.label}>Adresse e-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="nom@exemple.com"
              placeholderTextColor={colors.dustTaupe}
              style={s.input}
            />
            <Text style={s.label}>Rôle</Text>
            <View style={s.roleRow}>
              {['staff', 'admin'].map(r => (
                <TouchableOpacity key={r} style={[s.rolePill, role === r && s.rolePillActive]} onPress={() => setRole(r)}>
                  <Text style={[s.rolePillText, role === r && s.rolePillTextActive]}>
                    {r === 'admin' ? 'Administrateur' : 'Personnel'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity disabled={inviting} onPress={doInvite} style={[s.sendBtn, inviting && { opacity: 0.6 }]} activeOpacity={0.8}>
              <Text style={s.sendBtnText}>{inviting ? 'Envoi…' : 'Envoyer l\'invitation'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.ink, fontSize: 22, width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  inviteBtn: { backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  inviteBtnText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 12 },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: 8 },
  name: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  self: { color: colors.slate, fontSize: 12 },
  email: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginTop: 2 },
  roleBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  roleAdmin: { backgroundColor: colors.ink },
  roleStaff: { backgroundColor: colors.softBone, borderWidth: 1, borderColor: colors.borderStrong },
  roleText: { fontFamily: fonts.bold, fontSize: 11 },
  roleAdminText: { color: colors.canvas },
  roleStaffText: { color: colors.slate },
  empty: { color: colors.slate, textAlign: 'center', padding: 40, fontFamily: fonts.regular },
  hint: { color: colors.slate, textAlign: 'center', fontFamily: fonts.regular, fontSize: 11, marginTop: 12 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.canvas, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: spacing.lg, paddingBottom: spacing.xl },
  modalTitle: { ...typography.sectionTitle, fontSize: 18, marginBottom: spacing.md },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.slate, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: fonts.regular, fontSize: 14 },
  roleRow: { flexDirection: 'row', gap: 8 },
  rolePill: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', backgroundColor: colors.white },
  rolePillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  rolePillText: { color: colors.slate, fontFamily: fonts.medium, fontSize: 13 },
  rolePillTextActive: { color: colors.canvas },
  sendBtn: { marginTop: spacing.lg, backgroundColor: colors.ink, paddingVertical: 13, borderRadius: radius.button, alignItems: 'center' },
  sendBtnText: { color: colors.canvas, fontFamily: fonts.bold, fontSize: 14 },
})
