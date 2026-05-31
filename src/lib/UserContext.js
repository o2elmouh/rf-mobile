import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const UserContext = createContext({
  user: null,
  profile: null,
  role: 'staff',
  agencyId: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
})

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (u) => {
    if (!u) { setProfile(null); return null }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .maybeSingle()
    if (error) {
      console.warn('[UserContext] profile load failed', error.message)
      setProfile(null)
      return null
    }
    setProfile(data || null)
    return data || null
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const u = data?.session?.user ?? null
      if (!mounted) return
      setUser(u)
      await loadProfile(u)
      setLoading(false)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      await loadProfile(u)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user)
  }, [user, loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const role = profile?.role || 'staff'
  const agencyId = profile?.agency_id || null

  return (
    <UserContext.Provider value={{ user, profile, role, agencyId, loading, refreshProfile, signOut }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
