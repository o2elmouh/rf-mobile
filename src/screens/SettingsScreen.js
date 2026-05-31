import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useUser } from '../lib/UserContext'
import { useRole } from '../lib/useRole'
import { changeLanguage } from '../lib/i18n'
import { useTranslation } from 'react-i18next'
import { colors, radius, spacing, fonts, typography } from '../theme'
import HamburgerButton from '../components/HamburgerButton'

function Row({ label, hint, onPress, badge }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {hint ? <Text style={s.rowHint}>{hint}</Text> : null}
      </View>
      {badge ? <Text style={s.rowBadge}>{badge}</Text> : null}
      <Text style={s.rowArrow}>›</Text>
    </TouchableOpacity>
  )
}

export default function SettingsScreen({ navigation }) {
  const { signOut, user } = useUser()
  const { isAdmin } = useRole()
  const { i18n } = useTranslation()
  const currentLang = i18n.language || 'fr'

  return (
    <View style={s.container}>
      <HamburgerButton />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={s.title}>Réglages</Text>
        <Text style={s.subtitle}>{user?.email || ''}</Text>

        {isAdmin && (
          <>
            <Text style={s.section}>Administration</Text>
            <View style={s.card}>
              <Row label="Agence" hint="Identité, fiscalité, contact" onPress={() => navigation.navigate('SettingsAgency')} />
              <Row label="Équipe" hint="Membres, invitations, rôles" onPress={() => navigation.navigate('SettingsTeam')} />
              <Row label="Gmail" hint="Intégration IMAP" onPress={() => navigation.navigate('SettingsGmail')} />
              <Row label="WhatsApp" hint="État de la connexion Twilio" onPress={() => navigation.navigate('SettingsWhatsapp')} />
              <Row label="Parc & maintenance" hint="Garanties et entretiens par marque" onPress={() => navigation.navigate('SettingsFleetConfig')} />
              <Row label="Télématique" hint="Boîtiers GPS" onPress={() => navigation.navigate('SettingsTelematics')} />
            </View>
          </>
        )}

        <Text style={s.section}>Compte</Text>
        <View style={s.card}>
          <Row label="Confidentialité" hint="Loi 09-08, anonymisation" onPress={() => navigation.navigate('SettingsPrivacy')} />
          <Row label="À propos" hint="Version, build, mentions" onPress={() => navigation.navigate('SettingsAbout')} />
        </View>

        <Text style={s.section}>Langue</Text>
        <View style={s.card}>
          {[['fr', 'Français'], ['ar', 'العربية'], ['en', 'English']].map(([code, label]) => {
            const active = currentLang === code || currentLang.startsWith(code)
            return (
              <TouchableOpacity key={code} style={[s.row, active && s.rowActive]} onPress={() => changeLanguage(code)} activeOpacity={0.7}>
                <Text style={s.rowLabel}>{label}</Text>
                {active ? <Text style={s.check}>✓</Text> : null}
              </TouchableOpacity>
            )
          })}
        </View>

        <TouchableOpacity style={s.signOut} onPress={signOut} activeOpacity={0.8}>
          <Text style={s.signOutText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  title:     { ...typography.screenTitle, paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: 4 },
  subtitle:  { ...typography.cardSub, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  section:   { ...typography.eyebrow, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: 8 },
  card:      { backgroundColor: colors.white, marginHorizontal: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowActive: { backgroundColor: colors.softBone },
  rowLabel:  { color: colors.ink, fontFamily: fonts.medium, fontSize: 15 },
  rowHint:   { color: colors.slate, fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  rowBadge:  { color: colors.signal, fontFamily: fonts.medium, fontSize: 12, marginRight: 8 },
  rowArrow:  { color: colors.dustTaupe, fontSize: 22, fontFamily: fonts.regular, marginLeft: 8 },
  check:     { color: colors.success, fontFamily: fonts.bold, fontSize: 18 },
  signOut:   { marginHorizontal: spacing.md, marginTop: spacing.xl, paddingVertical: 14, borderRadius: radius.button, borderWidth: 1, borderColor: colors.danger + '66', alignItems: 'center' },
  signOutText: { color: colors.danger, fontFamily: fonts.bold, fontSize: 14 },
})
