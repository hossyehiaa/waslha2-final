'use client'

import { useEffect, useState } from 'react'
import { Truck, Plus, Star, Package, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency, formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'

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

const VEHICLE_LABELS: Record<string, string> = {
  MOTORCYCLE: 'Motorcycle',
  CAR: 'Car',
  VAN: 'Van',
  TRUCK: 'Truck',
}

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/drivers')
      .then(r => r.json())
      .then(d => setDrivers(d.drivers || []))
      .catch(() => toast.error('Failed to load drivers'))
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<Driver>[] = [
    {
      key: 'fullName',
      header: 'Driver',
      sortable: true,
      cell: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center font-bold text-sm shrink-0">
            {d.fullName.split(' ').map(w => w[0]).slice(0, 2).join('')}
          </div>
          <div>
            <div className="font-medium">{d.fullName}</div>
            <div className="text-xs text-muted-foreground font-mono">{d.driverCode}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'vehicleType',
      header: 'Vehicle',
      hideOnMobile: true,
      cell: (d) => (
        <div>
          <div className="text-xs font-medium">{VEHICLE_LABELS[d.vehicleType] || d.vehicleType}</div>
          {d.vehiclePlate && <div className="text-xs text-muted-foreground font-mono">{d.vehiclePlate}</div>}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      hideOnMobile: true,
      cell: (d) => <span className="text-xs">{d.phone || '-'}</span>,
    },
    {
      key: 'zone',
      header: 'Zone',
      hideOnMobile: true,
      cell: (d) => <span className="text-xs">{d.zone ? `${d.zone}${d.branch ? ` / ${d.branch}` : ''}` : '-'}</span>,
    },
    {
      key: 'totalDeliveries',
      header: 'Deliveries',
      sortable: true,
      cell: (d) => <span className="font-medium">{d.totalDeliveries}</span>,
    },
    {
      key: 'pendingEarnings',
      header: 'Pending',
      sortable: true,
      cell: (d) => <span className="font-medium text-xs text-amber-600">{formatCurrency(d.pendingEarnings)}</span>,
    },
    {
      key: 'rating',
      header: 'Rating',
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
      header: 'Status',
      cell: (d) => <StatusBadge status={d.status} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        subtitle={`${drivers.length} couriers in the fleet`}
        icon={Truck}
        actions={<Button className="shadow-premium"><Plus className="w-4 h-4 mr-2" />New Driver</Button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Drivers', value: drivers.length, icon: Truck, color: 'bg-cyan-100 text-cyan-700' },
          { label: 'Active Now', value: drivers.filter(d => d.status === 'ACTIVE').length, icon: Star, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Total Deliveries', value: drivers.reduce((s, d) => s + d.totalDeliveries, 0), icon: Package, color: 'bg-purple-100 text-purple-700' },
          { label: 'Pending Earnings', value: formatCurrency(drivers.reduce((s, d) => s + d.pendingEarnings, 0)), icon: Wallet, color: 'bg-amber-100 text-amber-700' },
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
        searchPlaceholder="Search by name, code, vehicle..."
        searchKeys={['fullName', 'username', 'driverCode', 'vehiclePlate']}
        pageSize={10}
      />
    </div>
  )
}
