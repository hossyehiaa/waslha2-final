'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Star, Wallet, Package } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency, formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'

type Client = {
  id: string
  companyName: string
  username: string
  email: string | null
  phone: string | null
  status: string
  rating: number
  totalShipments: number
  activeShipments: number
  codBalance: number
  codCollected: number
  codPaid: number
  codPending: number
  shippingBalance: number
  branch: string | null
  city: string | null
  createdAt: string
  lastLoginAt: string | null
}

export default function AdminClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/clients')
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false))
  }, [])

  const totalCod = clients.reduce((s, c) => s + c.codPending, 0)
  const totalCollected = clients.reduce((s, c) => s + c.codCollected, 0)
  const totalShipments = clients.reduce((s, c) => s + c.totalShipments, 0)

  const columns: Column<Client>[] = [
    {
      key: 'companyName',
      header: 'Client',
      sortable: true,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-bold text-sm shrink-0">
            {c.companyName[0]}
          </div>
          <div>
            <div className="font-medium">{c.companyName}</div>
            <div className="text-xs text-muted-foreground">@{c.username}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      hideOnMobile: true,
      cell: (c) => (
        <div>
          <div className="text-xs">{c.email || '-'}</div>
          <div className="text-xs text-muted-foreground">{c.phone || '-'}</div>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'Location',
      hideOnMobile: true,
      cell: (c) => <span className="text-xs">{c.city ? `${c.city}${c.branch ? ` / ${c.branch}` : ''}` : '-'}</span>,
    },
    {
      key: 'totalShipments',
      header: 'Shipments',
      sortable: true,
      cell: (c) => <span className="font-medium">{c.totalShipments}</span>,
    },
    {
      key: 'codPending',
      header: 'COD Balance',
      sortable: true,
      cell: (c) => (
        <div>
          <div className="font-medium text-xs">{formatCurrency(c.codPending)}</div>
          <div className="text-xs text-muted-foreground">{formatCurrency(c.codCollected)} collected</div>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      sortable: true,
      hideOnMobile: true,
      cell: (c) => (
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-medium">{c.rating.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (c) => <StatusBadge status={c.status} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} merchants on the platform`}
        icon={Users}
        actions={
          <Button onClick={() => router.push('/admin/clients/new')} className="shadow-premium">
            <Plus className="w-4 h-4 mr-2" />
            New Client
          </Button>
        }
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: clients.length, icon: Users, color: 'bg-purple-100 text-purple-700' },
          { label: 'Total Shipments', value: totalShipments, icon: Package, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'COD Pending', value: formatCurrency(totalCod), icon: Wallet, color: 'bg-amber-100 text-amber-700' },
          { label: 'COD Collected', value: formatCurrency(totalCollected), icon: Wallet, color: 'bg-teal-100 text-teal-700' },
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
        data={clients}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search clients by name, username, email..."
        searchKeys={['companyName', 'username', 'email']}
        onRowClick={(c) => router.push(`/admin/clients/${c.id}`)}
        pageSize={10}
      />
    </div>
  )
}
