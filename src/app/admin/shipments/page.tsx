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
import { useLanguage } from '@/components/language-provider'

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

export default function AdminShipmentsPage() {
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
    {
      key: 'trackingNumber',
      header: L.tracking || 'Tracking #',
      sortable: true,
      cell: (s) => <span className="font-mono font-medium text-xs">{s.trackingNumber}</span>,
    },
    {
      key: 'client',
      header: L.client || 'Client',
      sortable: true,
      cell: (s) => <span className="font-medium">{s.client}</span>,
    },
    {
      key: 'route',
      header: L.route || 'Route',
      hideOnMobile: true,
      cell: (s) => <span className="text-xs text-muted-foreground">{s.senderCity} → {s.recipientCity}</span>,
    },
    {
      key: 'recipient',
      header: L.recipient || 'Recipient',
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
      header: dict.common.status,
      cell: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: 'paymentStatus',
      header: dict.pages.shipments.paymentStatus,
      hideOnMobile: true,
      cell: (s) => <StatusBadge status={s.paymentStatus} />,
    },
    {
      key: 'codAmount',
      header: L.cod || 'COD',
      sortable: true,
      cell: (s) => <span className="font-medium text-xs">{formatCurrency(s.codAmount)}</span>,
    },
    {
      key: 'createdAt',
      header: L.created || 'Created',
      sortable: true,
      hideOnMobile: true,
      cell: (s) => <span className="text-xs text-muted-foreground">{formatTimeAgo(s.createdAt)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.nav.shipments}
        subtitle={`${shipments.length} ${L.listSubtitle}`}
        icon={Package}
        actions={
          <>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              {dict.common.export}
            </Button>
            <Button onClick={() => router.push('/admin/shipments/new')} className="shadow-premium">
              <Plus className="w-4 h-4 mr-2" />
              {L.newShipment}
            </Button>
          </>
        }
      />
      <DataTable
        data={shipments}
        columns={columns}
        loading={loading}
        searchPlaceholder={L.searchPlaceholder}
        searchKeys={['trackingNumber', 'recipientName', 'recipientPhone']}
        filters={[
          {
            label: dict.common.status,
            value: statusFilter,
            options: [
              { label: dict.statuses.PENDING, value: 'PENDING' },
              { label: dict.statuses.PICKED_UP, value: 'PICKED_UP' },
              { label: dict.statuses.IN_TRANSIT, value: 'IN_TRANSIT' },
              { label: dict.statuses.OUT_FOR_DELIVERY, value: 'OUT_FOR_DELIVERY' },
              { label: dict.statuses.DELIVERED, value: 'DELIVERED' },
              { label: dict.statuses.RETURNED, value: 'RETURNED' },
              { label: dict.statuses.FAILED, value: 'FAILED' },
              { label: dict.statuses.CANCELLED, value: 'CANCELLED' },
            ],
            onChange: (v) => setStatusFilter(v),
          },
        ]}
        onRowClick={(s) => router.push(`/admin/shipments/${s.id}`)}
        pageSize={12}
      />
    </div>
  )
}
