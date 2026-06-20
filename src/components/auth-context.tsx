'use client'

import { useEffect, useState, createContext, useContext, ReactNode, useCallback } from 'react'

type AuthUser = {
  id: string
  username: string
  fullName: string
  email?: string | null
  phone?: string | null
  role: string
  clientId?: string | null
  driverId?: string | null
  employeeId?: string | null
}

const AuthContext = createContext<{ user: AuthUser | null; loading: boolean; refresh: () => Promise<void> }>({ user: null, loading: true, refresh: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUser(data.user || null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return <AuthContext.Provider value={{ user, loading, refresh }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
