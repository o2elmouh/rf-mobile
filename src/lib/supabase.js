import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl      = process.env.EXPO_PUBLIC_SUPABASE_URL      || 'https://apzarvjxvwtlphdqirjm.supabase.co'
const supabaseAnonKey  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // handled manually via deep link listener
  },
})

/**
 * Call this with the full deep-link URL when the app is opened via a link.
 * Supabase embeds the token in the URL hash/query; this extracts and applies it.
 */
export async function handleAuthDeepLink(url) {
  if (!url) return
  // Supabase uses either #access_token or ?code= (PKCE)
  if (url.includes('access_token') || url.includes('code=')) {
    await supabase.auth.exchangeCodeForSession(url).catch(() => {
      // Fallback: parse hash params manually for implicit flow
      const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1] || '')
      const accessToken  = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      }
    })
  }
}

export async function getAgencyId() {
  const { data } = await supabase.auth.getUser()
  if (!data?.user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', data.user.id)
    .maybeSingle()
  return profile?.agency_id ?? null
}
