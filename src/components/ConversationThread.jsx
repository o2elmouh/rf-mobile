import { View, Text, Image, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, radius, spacing, fonts } from '../theme'
import { apiBaseUrl } from '../lib/api'

function mediaUri(url) {
  if (!url) return null
  if (url.startsWith('data:image/')) return url
  if (url.startsWith('http')) return `${apiBaseUrl}/leads/media?url=${encodeURIComponent(url)}`
  return null
}

function MessageBubble({ message }) {
  const isAgent = message.role === 'agent'
  const time = message.timestamp ? new Date(message.timestamp) : null
  const timeLabel = time ? time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : null

  if (message.type === 'image' && message.url) {
    const uri = mediaUri(message.url)
    return (
      <View style={[s.bubbleRow, isAgent && s.bubbleRowAgent]}>
        <View style={[s.bubble, isAgent ? s.bubbleAgent : s.bubbleClient, s.bubbleImage]}>
          {uri ? <Image source={{ uri }} style={s.image} resizeMode="cover" /> : null}
          {timeLabel ? <Text style={[s.time, isAgent && s.timeAgent]}>{timeLabel}</Text> : null}
        </View>
      </View>
    )
  }

  return (
    <View style={[s.bubbleRow, isAgent && s.bubbleRowAgent]}>
      <View style={[s.bubble, isAgent ? s.bubbleAgent : s.bubbleClient]}>
        <Text style={[s.text, isAgent && s.textAgent]}>{message.text || ''}</Text>
        {timeLabel ? <Text style={[s.time, isAgent && s.timeAgent]}>{timeLabel}</Text> : null}
      </View>
    </View>
  )
}

export default function ConversationThread({ messages, mediaUrls }) {
  const { t } = useTranslation('leads')

  const items = []
  if (Array.isArray(messages)) items.push(...messages)
  if (Array.isArray(mediaUrls)) {
    mediaUrls.forEach(url => items.push({ role: 'client', type: 'image', url }))
  }

  if (items.length === 0) {
    return <Text style={s.empty}>{t('detail.noConversation')}</Text>
  }

  return (
    <View style={s.container}>
      {items.map((m, i) => <MessageBubble key={i} message={m} />)}
    </View>
  )
}

const s = StyleSheet.create({
  container: { gap: 8 },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowAgent: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  bubbleClient: { backgroundColor: colors.white, borderColor: colors.border },
  bubbleAgent:  { backgroundColor: colors.ink, borderColor: colors.ink },
  bubbleImage:  { padding: 4, gap: 4 },
  image:        { width: 180, height: 220, borderRadius: 12 },
  text:         { fontFamily: fonts.regular, fontSize: 14, color: colors.ink, lineHeight: 19 },
  textAgent:    { color: colors.canvas },
  time:         { fontFamily: fonts.regular, fontSize: 10, color: colors.slate, marginTop: 4, alignSelf: 'flex-end' },
  timeAgent:    { color: colors.canvas + 'AA' },
  empty:        { color: colors.slate, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', paddingVertical: spacing.lg },
})
