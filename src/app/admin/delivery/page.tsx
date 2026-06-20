'use client'

import { useEffect, useState } from 'react'
import { Truck } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { formatCurrency, formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

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
  const { dict } = useLanguage()
  const L = dict.pages.delivery
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/shipments?status=OUT_FOR_DELIVERY')
      .then(r => r.json())
      .then(d => setShipments(d.shipments || []))
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [dict])

  const columns: Column<Shipment>[] = [
    { key: 'trackingNumber', header: dict.dashboard.admin.tracking, cell: (s) => <span className="font-mono font-medium text-xs">{s.trackingNumber}</span> },
    { key: 'client', header: dict.dashboard.admin.client, cell: (s) => <span className="text-sm">{s.client}</span> },
    { key: 'recipientName', header: dict.pages.shipments.recipient, hideOnMobile: true, cell: (s) => <span className="text-xs">{s.recipientName}</span> },
    { key: 'recipientCity', header: dict.pages.branches.city, hideOnMobile: true, cell: (s) => <span className="text-xs">{s.recipientCity}</span> },
    { key: 'driver', header: dict.pages.shipments.driver, cell: (s) => <span className="text-xs">{s.driver?.name || '-'}</span> },
    { key: 'codAmount', header: dict.dashboard.admin.cod, cell: (s) => <span className="font-medium text-xs">{formatCurrency(s.codAmount)}</span> },
    { key: 'status', header: dict.common.status, cell: (s) => <StatusBadge status={s.status} /> },
    { key: 'createdAt', header: dict.dashboard.admin.created2, hideOnMobile: true, cell: (s) => <span className="text-xs text-muted-foreground">{formatTimeAgo(s.createdAt)}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={L.title} subtitle={L.subtitle} icon={Truck} />
      <DataTable data={shipments} columns={columns} loading={loading} searchPlaceholder={`${dict.common.search}...`} searchKeys={['trackingNumber', 'recipientName']} pageSize={10} />
    </div>
  )
}
