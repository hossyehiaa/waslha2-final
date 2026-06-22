'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Plus } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

type Shipment = {
  id: string
  trackingNumber: string
  senderCity: string
  recipientCity: string
  recipientName: string
  status: string
  codAmount: number
  createdAt: string
}

export default function ClientShipmentsPage() {
  const router = useRouter()
  const { dict } = useLanguage()
  const L = dict.pages.shipments
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetch(`/api/shipments?status=${statusFilter}`)
      .then(r => r.json())
      .then(d => setShipments(d.shipments || []))
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [statusFilter, dict])

  const columns: Column<Shipment>[] = [
    { key: 'trackingNumber', header: dict.dashboard.admin.tracking, sortable: true, cell: (s) => <span className="font-mono font-medium text-xs">{s.trackingNumber}</span> },
    { key: 'route', header: dict.dashboard.admin.route, hideOnMobile: true, cell: (s) => <span className="text-xs text-muted-foreground">{s.senderCity} → {s.recipientCity}</span> },
    { key: 'recipientName', header: L.recipient, cell: (s) => <span className="text-sm">{s.recipientName}</span> },
    { key: 'status', header: dict.common.status, cell: (s) => <StatusBadge status={s.status} /> },
    { key: 'codAmount', header: dict.dashboard.admin.cod, sortable: true, cell: (s) => <span className="font-medium text-xs">{formatCurrency(s.codAmount)}</span> },
    { key: 'createdAt', header: dict.dashboard.admin.created2, sortable: true, hideOnMobile: true, cell: (s) => <span className="text-xs text-muted-foreground">{formatTimeAgo(s.createdAt)}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.nav.myShipments}
        subtitle={`${shipments.length} ${dict.nav.shipments}`}
        icon={Package}
        actions={<Button onClick={() => router.push('/dashboard/shipments/new')} className="shadow-premium"><Plus className="w-4 h-4 mr-2" />{L.newShipment}</Button>}
      />
      <DataTable
        data={shipments}
        columns={columns}
        loading={loading}
        searchPlaceholder={`${dict.common.search}...`}
        searchKeys={['trackingNumber', 'recipientName']}
        filters={[{
          label: dict.common.status,
          value: statusFilter,
          options: [
            { label: dict.statuses.PENDING, value: 'PENDING' },
            { label: dict.statuses.IN_TRANSIT, value: 'IN_TRANSIT' },
            { label: dict.statuses.DELIVERED, value: 'DELIVERED' },
            { label: dict.statuses.RETURNED, value: 'RETURNED' },
          ],
          onChange: (v) => setStatusFilter(v),
        }]}
        onRowClick={(s) => router.push(`/dashboard/shipments/${s.id}`)}
        pageSize={10}
      />
    </div>
  )
}
