'use client'

import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, Package, Users, Wallet, Truck } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'

const PIE_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#ef4444']

export default function AdminReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('7d')

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false))
  }, [range])

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports & Analytics" subtitle="Business intelligence insights" icon={BarChart3} />
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6 h-80 animate-pulse bg-muted/30" />
          <Card className="p-6 h-80 animate-pulse bg-muted/30" />
        </div>
      </div>
    )
  }

  const monthlyData = [
    { month: 'Jan', shipments: 1820, revenue: 145000 },
    { month: 'Feb', shipments: 2150, revenue: 168000 },
    { month: 'Mar', shipments: 2480, revenue: 192000 },
    { month: 'Apr', shipments: 2210, revenue: 175000 },
    { month: 'May', shipments: 2890, revenue: 224000 },
    { month: 'Jun', shipments: 3247, revenue: 256000 },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Business performance insights"
        icon={BarChart3}
        actions={
          <div className="flex gap-2">
            <Button variant={range === '7d' ? 'default' : 'outline'} size="sm" onClick={() => setRange('7d')}>7 Days</Button>
            <Button variant={range === '30d' ? 'default' : 'outline'} size="sm" onClick={() => setRange('30d')}>30 Days</Button>
            <Button variant={range === '90d' ? 'default' : 'outline'} size="sm" onClick={() => setRange('90d')}>90 Days</Button>
          </div>
        }
      />

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(monthlyData.reduce((s, m) => s + m.revenue, 0)), icon: Wallet, color: 'bg-emerald-100 text-emerald-700', trend: '+12.4%' },
          { label: 'Total Shipments', value: monthlyData.reduce((s, m) => s + m.shipments, 0).toLocaleString(), icon: Package, color: 'bg-purple-100 text-purple-700', trend: '+8.1%' },
          { label: 'Active Clients', value: data.stats.totalClients, icon: Users, color: 'bg-cyan-100 text-cyan-700', trend: '+5.3%' },
          { label: 'Active Drivers', value: data.stats.activeDrivers, icon: Truck, color: 'bg-amber-100 text-amber-700', trend: '+2.1%' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />{s.trend}
                </span>
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Monthly Trends */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Monthly Performance</h3>
          <p className="text-sm text-muted-foreground">Shipments and revenue over 6 months</p>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: '12px' }} />
            <Bar dataKey="shipments" fill="#0d9488" radius={[6, 6, 0, 0]} name="Shipments" />
            <Bar dataKey="revenue" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Revenue (EGP)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Shipment Status Distribution</h3>
            <p className="text-sm text-muted-foreground">Current breakdown</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.chart.statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                {data.chart.statusDistribution.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {data.chart.statusDistribution.map((s: any, i: number) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-muted-foreground flex-1 truncate">{s.name}</span>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Daily Trends */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Daily Shipment Trends</h3>
            <p className="text-sm text-muted-foreground">Last 7 days</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
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
      </div>

      {/* Top Clients */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Performing Clients</h3>
        <div className="space-y-3">
          {data.topClients.map((c: any, i: number) => (
            <motion.div key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-sm font-bold">#{i + 1}</div>
              <div className="flex-1">
                <div className="font-medium">{c.companyName}</div>
                <div className="text-xs text-muted-foreground">{c.totalShipments} shipments</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(c.codCollected)}</div>
                <div className="text-xs text-muted-foreground">COD collected</div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  )
}
