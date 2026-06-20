'use client'

import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
import { getCurrentUser } from '@/lib/auth-helpers'

type AuthUser = {
  id: string
  username: string
  fullName: string
  role: string
  clientId?: string | null
  driverId?: string | null
  employeeId?: string | null
}

const AuthContext = createContext<{ user: AuthUser | null; loading: boolean }>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUser(d.user || null))
      .finally(() => setLoading(false))
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
