import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { I18nManager } from 'react-native'
import { changeLanguage } from '../lib/i18n'
import { colors, radius, fonts, spacing } from '../theme'

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية',  flag: '🇲🇦' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
]

export default function LanguageSelector({ compact = false }) {
  const { i18n, t } = useTranslation('common')
  const [open, setOpen] = useState(false)

  const current = LANGUAGES.find(l => l.code === (i18n.language || 'fr').slice(0, 2)) || LANGUAGES[0]

  const handleSelect = async (code) => {
    setOpen(false)
    if (code === current.code) return
    const wasRtl = I18nManager.isRTL
    await changeLanguage(code)
    const willBeRtl = code === 'ar'
    if (wasRtl !== willBeRtl) {
      Alert.alert(
        t('languageChanged', { defaultValue: 'Langue modifiée' }),
        t('restartToApplyRtl', { defaultValue: 'Veuillez redémarrer l\'application pour appliquer le sens d\'écriture.' }),
      )
    }
  }

  return (
    <>
      <TouchableOpacity
        style={[s.trigger, compact && s.triggerCompact]}
        onPress={() => setOpen(true)}
        accessibilityLabel="Langue / Language"
        activeOpacity={0.85}
      >
        <Text style={s.flag}>{current.flag}</Text>
        {!compact && <Text style={s.label}>{current.label}</Text>}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            {LANGUAGES.map(({ code, label, flag }) => (
              <TouchableOpacity
                key={code}
                style={[s.row, code === current.code && s.rowActive]}
                onPress={() => handleSelect(code)}
                activeOpacity={0.85}
              >
                <Text style={s.flag}>{flag}</Text>
                <Text style={s.label}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

const s = StyleSheet.create({
  trigger:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.white, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  triggerCompact: { paddingHorizontal: 10, paddingVertical: 6 },
  flag:           { fontSize: 18 },
  label:          { color: colors.ink, fontFamily: fonts.medium, fontSize: 13, letterSpacing: -0.2 },
  backdrop:       { flex: 1, backgroundColor: 'rgba(20,20,19,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet:          { width: '100%', maxWidth: 320, backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  row:            { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderRadius: radius.button },
  rowActive:      { backgroundColor: colors.softBone },
})
