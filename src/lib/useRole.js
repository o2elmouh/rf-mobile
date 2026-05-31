import { useUser } from './UserContext'

export function useRole() {
  const { role, loading } = useUser()
  return {
    role,
    isAdmin: role === 'admin',
    isStaff: role === 'staff',
    loading,
  }
}
