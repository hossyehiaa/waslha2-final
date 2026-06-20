'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Plus, Download } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'

type Shipment = {
  id: string
  trackingNumber: string
  client: string
  clientId: string
  senderCity: string
  recipientCity: string
  recipientName: string
  recipientPhone: string
  status: string
  paymentStatus: string
  serviceType: string
  priority: string
  weight: number
  pieces: number
  codAmount: number
  shippingCost: number
  description: string | null
  driver: { name: string; code: string } | null
  createdAt: string
  deliveredAt: string | null
}

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Picked Up', value: 'PICKED_UP' },
  { label: 'In Transit', value: 'IN_TRANSIT' },
  { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Returned', value: 'RETURNED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

export default function AdminShipmentsPage() {
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
    {
      key: 'trackingNumber',
      header: 'Tracking #',
      sortable: true,
      cell: (s) => <span className="font-mono font-medium text-xs">{s.trackingNumber}</span>,
    },
    {
      key: 'client',
      header: 'Client',
      sortable: true,
      cell: (s) => <span className="font-medium">{s.client}</span>,
    },
    {
      key: 'route',
      header: 'Route',
      hideOnMobile: true,
      cell: (s) => <span className="text-xs text-muted-foreground">{s.senderCity} → {s.recipientCity}</span>,
    },
    {
      key: 'recipient',
      header: 'Recipient',
      hideOnMobile: true,
      cell: (s) => (
        <div>
          <div className="text-xs font-medium">{s.recipientName}</div>
          <div className="text-xs text-muted-foreground">{s.recipientPhone}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      hideOnMobile: true,
      cell: (s) => <StatusBadge status={s.paymentStatus} />,
    },
    {
      key: 'codAmount',
      header: 'COD',
      sortable: true,
      cell: (s) => <span className="font-medium text-xs">{formatCurrency(s.codAmount)}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      hideOnMobile: true,
      cell: (s) => <span className="text-xs text-muted-foreground">{formatTimeAgo(s.createdAt)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments"
        subtitle={`${shipments.length} shipments in the system`}
        icon={Package}
        actions={
          <>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => router.push('/admin/shipments/new')} className="shadow-premium">
              <Plus className="w-4 h-4 mr-2" />
              New Shipment
            </Button>
          </>
        }
      />
      <DataTable
        data={shipments}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by tracking #, recipient name, phone..."
        searchKeys={['trackingNumber', 'recipientName', 'recipientPhone']}
        filters={[
          {
            label: 'Status',
            value: statusFilter,
            options: STATUS_OPTIONS,
            onChange: (v) => setStatusFilter(v),
          },
        ]}
        onRowClick={(s) => router.push(`/admin/shipments/${s.id}`)}
        pageSize={12}
      />
    </div>
  )
}
