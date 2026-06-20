'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Package, Wallet, Clock, TrendingUp, ArrowRight,
  Activity, Plus, MapPin, CheckCircle2,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '@/components/dashboard/page-header'
import { StatGrid } from '@/components/dashboard/stat-grid'
import { Stat } from '@/components/dashboard/stat-card'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatTimeAgo } from '@/lib/format'

export default function ClientDashboard() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/client/dashboard')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="Welcome to your client portal" icon={Activity} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )
  }

  const stats: Stat[] = [
    { label: 'Active Shipments', value: data.stats.activeShipments, icon: Package, color: 'bg-emerald-100 text-emerald-700', link: '/dashboard/shipments' },
    { label: 'COD Available', value: formatCurrency(data.stats.codBalance), icon: Wallet, color: 'bg-amber-100 text-amber-700', link: '/dashboard/cod' },
    { label: 'COD Pending', value: formatCurrency(data.stats.codPending), icon: Clock, color: 'bg-rose-100 text-rose-700', link: '/dashboard/cod' },
    { label: 'Total Shipments', value: data.stats.totalShipments, icon: TrendingUp, color: 'bg-purple-100 text-purple-700', link: '/dashboard/shipments' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Your shipping activity overview"
        icon={Activity}
        actions={
          <Button onClick={() => router.push('/dashboard/shipments/new')} className="shadow-premium">
            <Plus className="w-4 h-4 mr-2" />
            New Shipment
          </Button>
        }
      />

      <StatGrid stats={stats} />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Shipment Activity</h3>
            <p className="text-sm text-muted-foreground">Last 7 days</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.chart.days}>
              <defs>
                <linearGradient id="colorShip" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: '12px' }} />
              <Area type="monotone" dataKey="shipments" stroke="#0d9488" strokeWidth={2} fill="url(#colorShip)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold">COD Balance</h3>
            <p className="text-sm text-muted-foreground">Your wallet overview</p>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-100 dark:border-emerald-900">
              <div className="text-xs text-muted-foreground">Available Balance</div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{formatCurrency(data.stats.codBalance)}</div>
              <Button size="sm" className="mt-3 w-full" onClick={() => router.push('/dashboard/cod')}>
                <Wallet className="w-3.5 h-3.5 mr-1.5" />
                Request Payout
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground">Pending</div>
                <div className="font-bold text-amber-600">{formatCurrency(data.stats.codPending)}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground">Collected</div>
                <div className="font-bold">{formatCurrency(data.stats.codCollected)}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Shipments */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Recent Shipments</h3>
            <p className="text-sm text-muted-foreground">Your latest shipping activity</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/shipments')}>
            View all
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
        <div className="space-y-2">
          {data.recentShipments.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No shipments yet</p>
              <Button onClick={() => router.push('/dashboard/shipments/new')} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create your first shipment
              </Button>
            </div>
          ) : (
            data.recentShipments.map((s: any, i: number) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/dashboard/shipments/${s.id}`)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/40 transition-colors cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  s.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                  s.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                  'bg-cyan-100 text-cyan-700'
                }`}>
                  {s.status === 'DELIVERED' ? <CheckCircle2 className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-medium text-sm">{s.trackingNumber}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {s.from} → {s.to}
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={s.status} />
                  <div className="text-xs text-muted-foreground mt-1">{formatTimeAgo(s.createdAt)}</div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </Card>

      {/* Recent Settlements */}
      {data.settlements.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Settlements</h3>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/cod')}>
              View all
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {data.settlements.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <div className="font-mono text-sm font-medium">{s.reference}</div>
                  <div className="text-xs text-muted-foreground">Period: {s.period}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600">{formatCurrency(s.netAmount)}</div>
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
