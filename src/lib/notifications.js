import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase, getAgencyId } from './supabase'
import { APP_VERSION } from './version'

// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
})

/**
 * Requests permission, gets the Expo push token, and registers it.
 * Writes to both `device_tokens` (per-user, multi-device) and `agencies.push_token`
 * (kept for backward compatibility with the existing notify-same-day-turnovers Edge Function).
 */
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('[notifications] Skipping — not a physical device')
    return null
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:            'default',
      importance:      Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:      '#CF4500',
    })
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('[notifications] Permission denied')
    return null
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  )

  const token = tokenData.data
  console.log('[notifications] Push token:', token)

  await saveAgencyPushToken(token)
  await saveDeviceToken(token)

  return token
}

async function saveAgencyPushToken(token) {
  try {
    const agencyId = await getAgencyId()
    if (!agencyId) return
    await supabase
      .from('agencies')
      .update({ push_token: token })
      .eq('id', agencyId)
  } catch (e) {
    console.error('[notifications] Failed to save agency push token', e?.message || e)
  }
}

async function saveDeviceToken(token) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const agencyId = await getAgencyId()
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web'

    const { error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          user_id:      user.id,
          agency_id:    agencyId,
          token,
          platform,
          app_version: APP_VERSION,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      )
    if (error) console.warn('[notifications] device_tokens upsert failed', error.message)
  } catch (e) {
    console.error('[notifications] Failed to save device token', e?.message || e)
  }
}
