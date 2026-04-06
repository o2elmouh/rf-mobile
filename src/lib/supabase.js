import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pcokfeljfggimqrqoxxb.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

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
