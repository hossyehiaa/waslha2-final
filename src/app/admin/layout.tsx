'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard/shell'
import { AIChatbot } from '@/components/ai-chatbot'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.user) {
          router.push('/login')
          return
        }
        if (d.user.role !== 'ADMIN' && d.user.role !== 'EMPLOYEE') {
          router.push('/dashboard')
          return
        }
        setUser(d.user)
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading admin console...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <DashboardShell variant="admin" user={user}>{children}</DashboardShell>
      <AIChatbot />
    </>
  )
}
