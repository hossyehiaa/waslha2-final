'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Package, Users, Truck, Building2, Wallet, TrendingUp,
  PackageCheck, ArrowLeftRight, Bell, Star, Clock,
  ArrowRight, Activity, AlertCircle,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { PageHeader } from '@/components/dashboard/page-header'
import { StatGrid } from '@/components/dashboard/stat-grid'
import { Stat } from '@/components/dashboard/stat-card'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatTimeAgo } from '@/lib/format'
import { useLanguage } from '@/components/language-provider'

const PIE_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#ef4444']

export default function AdminDashboard() {
  const router = useRouter()
  const { dict, locale, isRTL } = useLanguage()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const L = dict.dashboard.admin

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title={L.title} subtitle={L.subtitle} icon={Activity} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    )
  }

  const stats: Stat[] = [
    { label: L.todaysShipments, value: data.stats.todayShipments, icon: Package, color: 'bg-emerald-100 text-emerald-700', trend: '+12%', link: '/admin/shipments' },
    { label: L.readyToCollect, value: data.stats.pendingCod.toLocaleString('en-US', { maximumFractionDigits: 0 }), icon: Wallet, color: 'bg-amber-100 text-amber-700', trend: '+5.2%', link: '/admin/finance' },
    { label: L.activeDrivers, value: data.stats.activeDrivers, icon: Truck, color: 'bg-cyan-100 text-cyan-700', link: '/admin/drivers' },
    { label: L.totalClients, value: data.stats.totalClients, icon: Users, color: 'bg-purple-100 text-purple-700', link: '/admin/clients' },
  ]

  const secondaryStats: Stat[] = [
    { label: L.pendingPickups, value: data.stats.pendingPickups, icon: PackageCheck, color: 'bg-amber-100 text-amber-700', link: '/admin/pickups' },
    { label: L.pendingTransfers, value: data.stats.pendingTransfers, icon: ArrowLeftRight, color: 'bg-blue-100 text-blue-700', link: '/admin/transfers' },
    { label: L.payoutRequests, value: data.stats.payoutRequests, icon: Wallet, color: 'bg-rose-100 text-rose-700', link: '/admin/finance/payouts' },
    { label: L.totalBranches, value: data.stats.totalBranches, icon: Building2, color: 'bg-teal-100 text-teal-700', link: '/admin/branches' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={L.title}
        subtitle={L.subtitle}
        icon={Activity}
        actions={
          <Button onClick={() => router.push('/admin/shipments/new')} className="shadow-premium">
            <Package className="w-4 h-4 mr-2" />
            {L.newShipment}
          </Button>
        }
      />

      <StatGrid stats={stats} />
      <StatGrid stats={secondaryStats} />

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Shipment Movement Chart */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">{L.shipmentMovement}</h3>
              <p className="text-sm text-muted-foreground">{L.last7Days}</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                {L.created}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                {L.delivered}
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.chart.days}>
              <defs>
                <linearGradient id="colorShip" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} reversed={isRTL} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} orientation={isRTL ? 'right' : 'left'} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="shipments" stroke="#0d9488" strokeWidth={2} fill="url(#colorShip)" />
              <Area type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} fill="url(#colorDel)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Status Distribution */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold">{L.statusDistribution}</h3>
            <p className="text-sm text-muted-foreground">{L.currentShipmentStates}</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.chart.statusDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {data.chart.statusDistribution.map((_: any, i: number) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {data.chart.statusDistribution.slice(0, 6).map((s: any, i: number) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-muted-foreground flex-1 truncate">{s.name}</span>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* COD Overview & Top Clients */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{L.codOverview}</h3>
              <p className="text-sm text-muted-foreground">{L.cashOnDeliveryStatus}</p>
            </div>
            <Wallet className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
              <div>
                <div className="text-xs text-muted-foreground">{L.paid}</div>
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(data.stats.paidCod)}</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-700" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <div>
                <div className="text-xs text-muted-foreground">{L.readyToPay}</div>
                <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(data.stats.readyToPay)}</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-700" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30">
              <div>
                <div className="text-xs text-muted-foreground">{L.pendingCollection}</div>
                <div className="text-xl font-bold text-rose-700 dark:text-rose-400">{formatCurrency(data.stats.pendingCod)}</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-700" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{L.topClients}</h3>
              <p className="text-sm text-muted-foreground">{L.mostActiveMerchants}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/clients')}>
              {dict.common.viewAll}
              <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'mr-1 rotate-180' : 'ml-1'}`} />
            </Button>
          </div>
          <div className="space-y-3">
            {data.topClients.map((c: any, i: number) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/40 transition-colors cursor-pointer"
                onClick={() => router.push('/admin/clients')}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-bold text-sm shrink-0">
                  {(c.companyName || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.companyName}</div>
                  <div className="text-xs text-muted-foreground">{c.totalShipments} {dict.nav.shipments}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{formatCurrency(c.codCollected)}</div>
                  <div className="flex items-center gap-0.5 justify-end text-xs text-muted-foreground">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {c.rating.toFixed(1)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Shipments */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">{L.recentShipments}</h3>
            <p className="text-sm text-muted-foreground">{L.latestShipmentActivity}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/shipments')}>
            {dict.common.viewAll}
            <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'mr-1 rotate-180' : 'ml-1'}`} />
          </Button>
        </div>
        <div className="overflow-x-auto scrollbar-premium">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2 px-3 font-medium">{L.tracking}</th>
                <th className="text-left py-2 px-3 font-medium">{L.client}</th>
                <th className="text-left py-2 px-3 font-medium hidden md:table-cell">{L.route}</th>
                <th className="text-left py-2 px-3 font-medium">{dict.common.status}</th>
                <th className="text-right py-2 px-3 font-medium">{L.cod}</th>
                <th className="text-right py-2 px-3 font-medium hidden md:table-cell">{L.created2}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentShipments.map((s: any) => (
                <tr
                  key={s.id}
                  className="border-b last:border-0 hover:bg-accent/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/shipments/${s.id}`)}
                >
                  <td className="py-3 px-3 font-mono font-medium text-xs">{s.trackingNumber}</td>
                  <td className="py-3 px-3">{s.client}</td>
                  <td className="py-3 px-3 hidden md:table-cell text-muted-foreground text-xs">
                    {s.from} → {s.to}
                  </td>
                  <td className="py-3 px-3"><StatusBadge status={s.status} /></td>
                  <td className="py-3 px-3 text-right font-medium">{formatCurrency(s.codAmount)}</td>
                  <td className="py-3 px-3 text-right hidden md:table-cell text-xs text-muted-foreground">
                    {formatTimeAgo(s.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
