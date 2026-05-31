import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, radius, fonts } from '../theme'

const HUE = {
  pending:    colors.info,
  waiting:    colors.signalSoft,
  offer_sent: colors.signalSoft,
  accepted:   colors.success,
  processed:  colors.slate,
  ignored:    colors.slate,
  converted:  colors.success,
}

export default function LeadStatusPill({ status }) {
  const { t } = useTranslation('leads')
  const hue = HUE[status] || colors.slate
  return (
    <View style={[s.pill, { backgroundColor: hue + '1A' }]}>
      <Text style={[s.text, { color: hue }]}>{t(`status.${status}`, status)}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontFamily: fonts.bold, fontSize: 11 },
})
