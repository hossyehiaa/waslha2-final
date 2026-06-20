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
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetch(`/api/shipments?status=${statusFilter}`)
      .then(r => r.json())
      .then(d => setShipments(d.shipments || []))
      .catch(() => toast.error('Failed to load shipments'))
      .finally(() => setLoading(false))
  }, [statusFilter])

  const columns: Column<Shipment>[] = [
    { key: 'trackingNumber', header: 'Tracking #', sortable: true, cell: (s) => <span className="font-mono font-medium text-xs">{s.trackingNumber}</span> },
    { key: 'route', header: 'Route', hideOnMobile: true, cell: (s) => <span className="text-xs text-muted-foreground">{s.senderCity} → {s.recipientCity}</span> },
    { key: 'recipientName', header: 'Recipient', cell: (s) => <span className="text-sm">{s.recipientName}</span> },
    { key: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
    { key: 'codAmount', header: 'COD', sortable: true, cell: (s) => <span className="font-medium text-xs">{formatCurrency(s.codAmount)}</span> },
    { key: 'createdAt', header: 'Created', sortable: true, hideOnMobile: true, cell: (s) => <span className="text-xs text-muted-foreground">{formatTimeAgo(s.createdAt)}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Shipments"
        subtitle={`${shipments.length} shipments`}
        icon={Package}
        actions={<Button onClick={() => router.push('/dashboard/shipments/new')} className="shadow-premium"><Plus className="w-4 h-4 mr-2" />New Shipment</Button>}
      />
      <DataTable
        data={shipments}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by tracking # or recipient..."
        searchKeys={['trackingNumber', 'recipientName']}
        filters={[{
          label: 'Status',
          value: statusFilter,
          options: [
            { label: 'Pending', value: 'PENDING' },
            { label: 'In Transit', value: 'IN_TRANSIT' },
            { label: 'Delivered', value: 'DELIVERED' },
            { label: 'Returned', value: 'RETURNED' },
          ],
          onChange: (v) => setStatusFilter(v),
        }]}
        onRowClick={(s) => router.push(`/dashboard/shipments/${s.id}`)}
        pageSize={10}
      />
    </div>
  )
}
