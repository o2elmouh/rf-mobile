import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, radius, fonts } from '../theme'

export default function ApiErrorBanner({ error, onRetry, onDismiss }) {
  if (!error) return null

  const message =
    typeof error === 'string'
      ? error
      : error?.message || 'Une erreur est survenue.'
  const status = error?.status

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <Text style={s.icon}>!</Text>
        <View style={s.textCol}>
          <Text style={s.title}>{status ? `Erreur ${status}` : 'Erreur réseau'}</Text>
          <Text style={s.body} numberOfLines={3}>{message}</Text>
        </View>
      </View>
      <View style={s.actions}>
        {onRetry && (
          <TouchableOpacity style={s.btn} onPress={onRetry} activeOpacity={0.85}>
            <Text style={s.btnText}>Réessayer</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={[s.btnText, s.btnTextGhost]}>Fermer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  wrap:    { backgroundColor: 'rgba(178,56,36,0.06)', borderColor: colors.danger, borderWidth: 1, borderRadius: radius.button, padding: 14, marginVertical: 8 },
  row:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  icon:    { width: 22, height: 22, lineHeight: 22, textAlign: 'center', backgroundColor: colors.danger, color: colors.canvas, borderRadius: 11, fontFamily: fonts.bold },
  textCol: { flex: 1 },
  title:   { color: colors.ink, fontFamily: fonts.bold, fontSize: 13, marginBottom: 2 },
  body:    { color: colors.charcoal, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end' },
  btn:     { paddingVertical: 8, paddingHorizontal: 18, backgroundColor: colors.danger, borderRadius: radius.button },
  btnText: { color: colors.canvas, fontFamily: fonts.medium, fontSize: 13 },
  btnGhost:    { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
  btnTextGhost:{ color: colors.danger },
})
