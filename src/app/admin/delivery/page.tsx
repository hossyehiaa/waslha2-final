'use client'

import { useEffect, useState } from 'react'
import { Truck } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { formatCurrency, formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'

type Shipment = {
  id: string
  trackingNumber: string
  client: string
  recipientName: string
  recipientCity: string
  status: string
  codAmount: number
  driver: { name: string; code: string } | null
  createdAt: string
}

export default function AdminDeliveryPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/shipments?status=OUT_FOR_DELIVERY')
      .then(r => r.json())
      .then(d => setShipments(d.shipments || []))
      .catch(() => toast.error('Failed to load deliveries'))
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<Shipment>[] = [
    { key: 'trackingNumber', header: 'Tracking #', cell: (s) => <span className="font-mono font-medium text-xs">{s.trackingNumber}</span> },
    { key: 'client', header: 'Client', cell: (s) => <span className="text-sm">{s.client}</span> },
    { key: 'recipientName', header: 'Recipient', hideOnMobile: true, cell: (s) => <span className="text-xs">{s.recipientName}</span> },
    { key: 'recipientCity', header: 'City', hideOnMobile: true, cell: (s) => <span className="text-xs">{s.recipientCity}</span> },
    { key: 'driver', header: 'Driver', cell: (s) => <span className="text-xs">{s.driver?.name || 'Unassigned'}</span> },
    { key: 'codAmount', header: 'COD', cell: (s) => <span className="font-medium text-xs">{formatCurrency(s.codAmount)}</span> },
    { key: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
    { key: 'createdAt', header: 'Created', hideOnMobile: true, cell: (s) => <span className="text-xs text-muted-foreground">{formatTimeAgo(s.createdAt)}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery Management" subtitle="Shipments currently out for delivery" icon={Truck} />
      <DataTable data={shipments} columns={columns} loading={loading} searchPlaceholder="Search deliveries..." searchKeys={['trackingNumber', 'recipientName']} pageSize={10} />
    </div>
  )
}
