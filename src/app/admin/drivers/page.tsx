'use client'

import { useEffect, useState } from 'react'
import { Truck, Plus, Star, Package, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

type Driver = {
  id: string
  fullName: string
  username: string
  email: string | null
  phone: string | null
  driverCode: string
  vehicleType: string
  vehiclePlate: string | null
  status: string
  rating: number
  totalDeliveries: number
  totalEarnings: number
  pendingEarnings: number
  branch: string | null
  zone: string | null
  joinDate: string
  lastLoginAt: string | null
}

export default function AdminDriversPage() {
  const { dict } = useLanguage()
  const L = dict.pages.drivers
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/drivers')
      .then(r => r.json())
      .then(d => setDrivers(d.drivers || []))
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [dict])

  const columns: Column<Driver>[] = [
    {
      key: 'fullName',
      header: L.driver,
      sortable: true,
      cell: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center font-bold text-sm shrink-0">
            {(d.fullName || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
          </div>
          <div>
            <div className="font-medium">{d.fullName || '-'}</div>
            <div className="text-xs text-muted-foreground font-mono">{d.driverCode}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'vehicleType',
      header: L.vehicle,
      hideOnMobile: true,
      cell: (d) => (
        <div>
          <div className="text-xs font-medium">{dict.vehicles[d.vehicleType as keyof typeof dict.vehicles] || d.vehicleType}</div>
          {d.vehiclePlate && <div className="text-xs text-muted-foreground font-mono">{d.vehiclePlate}</div>}
        </div>
      ),
    },
    {
      key: 'phone',
      header: L.phone,
      hideOnMobile: true,
      cell: (d) => <span className="text-xs">{d.phone || '-'}</span>,
    },
    {
      key: 'zone',
      header: L.zone,
      hideOnMobile: true,
      cell: (d) => <span className="text-xs">{d.zone ? `${d.zone}${d.branch ? ` / ${d.branch}` : ''}` : '-'}</span>,
    },
    {
      key: 'totalDeliveries',
      header: L.deliveries,
      sortable: true,
      cell: (d) => <span className="font-medium">{d.totalDeliveries}</span>,
    },
    {
      key: 'pendingEarnings',
      header: L.pending,
      sortable: true,
      cell: (d) => <span className="font-medium text-xs text-amber-600">{formatCurrency(d.pendingEarnings)}</span>,
    },
    {
      key: 'rating',
      header: L.rating,
      sortable: true,
      cell: (d) => (
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-medium">{d.rating.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: dict.common.status,
      cell: (d) => <StatusBadge status={d.status} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.nav.drivers}
        subtitle={`${drivers.length} ${L.subtitle}`}
        icon={Truck}
        actions={<Button className="shadow-premium"><Plus className="w-4 h-4 mr-2" />{L.newDriver}</Button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: L.totalDrivers, value: drivers.length, icon: Truck, color: 'bg-cyan-100 text-cyan-700' },
          { label: L.activeNow, value: drivers.filter(d => d.status === 'ACTIVE').length, icon: Star, color: 'bg-emerald-100 text-emerald-700' },
          { label: L.totalDeliveries, value: drivers.reduce((s, d) => s + d.totalDeliveries, 0), icon: Package, color: 'bg-purple-100 text-purple-700' },
          { label: L.pendingEarnings, value: formatCurrency(drivers.reduce((s, d) => s + d.pendingEarnings, 0)), icon: Wallet, color: 'bg-amber-100 text-amber-700' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>
      <DataTable
        data={drivers}
        columns={columns}
        loading={loading}
        searchPlaceholder={`${dict.common.search}...`}
        searchKeys={['fullName', 'username', 'driverCode', 'vehiclePlate']}
        pageSize={10}
      />
    </div>
  )
}
