import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, radius, fonts } from '../theme'

const HUE = {
  whatsapp: '#22c55e',
  gmail:    '#3b82f6',
}

export default function SourceBadge({ source }) {
  const { t } = useTranslation('leads')
  const hue = HUE[source] || colors.slate
  return (
    <View style={[s.pill, { backgroundColor: hue + '1A' }]}>
      <Text style={[s.text, { color: hue }]}>{t(`source.${source}`, source)}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  pill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  text: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.3 },
})
