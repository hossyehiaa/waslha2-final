'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  link: string | null
  createdAt: string
}

const TYPE_COLORS: Record<string, string> = {
  SHIPMENT: 'bg-emerald-100 text-emerald-700',
  PAYMENT: 'bg-amber-100 text-amber-700',
  SYSTEM: 'bg-purple-100 text-purple-700',
  PICKUP: 'bg-cyan-100 text-cyan-700',
  ALERT: 'bg-rose-100 text-rose-700',
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => setNotifications(d.notifications || []))
      .finally(() => setLoading(false))
  }, [])

  async function markAllRead() {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to update notifications')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={`${notifications.filter(n => !n.isRead).length} unread`}
        icon={Bell}
        actions={<Button variant="outline" onClick={markAllRead}><CheckCheck className="w-4 h-4 mr-2" />Mark all read</Button>}
      />
      <Card className="divide-y">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`p-4 flex items-start gap-3 hover:bg-accent/30 transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}>
              <div className={`w-10 h-10 rounded-xl ${TYPE_COLORS[n.type] || TYPE_COLORS.SYSTEM} flex items-center justify-center shrink-0`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{n.title}</span>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <span className="text-xs text-muted-foreground mt-1 inline-block">{formatTimeAgo(n.createdAt)}</span>
              </div>
              {n.link && <Button variant="ghost" size="sm" asChild><a href={n.link}>View</a></Button>}
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
