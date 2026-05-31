import 'react-native-gesture-handler'
import { useEffect, useRef, useState } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import { useFonts, SofiaSans_400Regular, SofiaSans_500Medium, SofiaSans_700Bold } from '@expo-google-fonts/sofia-sans'

import Navigation, { routeFromPushData } from './src/navigation'
import { registerForPushNotifications } from './src/lib/notifications'
import { UserProvider } from './src/lib/UserContext'
import { initI18n } from './src/lib/i18n'
import { colors } from './src/theme'

export default function App() {
  const [i18nReady, setI18nReady] = useState(false)
  const [fontsLoaded] = useFonts({
    SofiaSans_400Regular, SofiaSans_500Medium, SofiaSans_700Bold,
  })
  const notificationListener = useRef()
  const responseListener      = useRef()

  useEffect(() => {
    initI18n()
      .catch(e => console.warn('[App] i18n init failed', e?.message))
      .finally(() => setI18nReady(true))

    registerForPushNotifications()

    // Cold-start: app was launched by tapping a push. The response listener
    // does NOT fire for this case — we have to ask Expo for the last response.
    Notifications.getLastNotificationResponseAsync()
      .then(response => {
        const data = response?.notification?.request?.content?.data
        if (data) {
          // Defer until the navigation ref is mounted (~next tick).
          setTimeout(() => routeFromPushData(data), 500)
        }
      })
      .catch(() => {})

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[notifications] Received:', notification)
    })

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[notifications] Tapped:', response)
      const data = response?.notification?.request?.content?.data
      routeFromPushData(data)
    })

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])

  if (!i18nReady || !fontsLoaded) {
    return (
      <View style={s.splash}>
        <ActivityIndicator color={colors.ink} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <UserProvider>
        <Navigation />
      </UserProvider>
    </SafeAreaProvider>
  )
}

const s = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.canvas, justifyContent: 'center', alignItems: 'center' },
})
