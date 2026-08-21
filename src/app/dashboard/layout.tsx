'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard/shell'
import { AIChatbot } from '@/components/ai-chatbot'
import { useAuth } from '@/components/auth-context'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading, refresh } = useAuth()

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (user.role !== 'CLIENT') router.push('/admin')
  }, [loading, router, user])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading client portal...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <DashboardShell variant="client" user={user}>{children}</DashboardShell>
      <AIChatbot scope="client" />
    </>
  )
}
