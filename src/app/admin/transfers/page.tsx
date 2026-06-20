'use client'

import { useEffect, useState } from 'react'
import { ArrowLeftRight, Truck } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { toast } from 'sonner'

type Transfer = {
  id: string
  reference: string
  fromBranch: string
  toBranch: string
  shipmentCount: number
  totalValue: number
  status: string
  sentAt: string
  receivedAt: string | null
}

export default function AdminTransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/transfers')
      .then(r => r.json())
      .then(d => setTransfers(d.transfers || []))
      .catch(() => toast.error('Failed to load transfers'))
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<Transfer>[] = [
    { key: 'reference', header: 'Reference', sortable: true, cell: (t) => <span className="font-mono font-medium text-xs">{t.reference}</span> },
    { key: 'fromBranch', header: 'From', cell: (t) => <span className="text-xs">{t.fromBranch}</span> },
    { key: 'toBranch', header: 'To', cell: (t) => <span className="text-xs">{t.toBranch}</span> },
    { key: 'shipmentCount', header: 'Shipments', sortable: true, cell: (t) => <span className="font-medium">{t.shipmentCount}</span> },
    { key: 'totalValue', header: 'Value', sortable: true, cell: (t) => <span className="font-medium text-xs">{formatCurrency(t.totalValue)}</span> },
    { key: 'sentAt', header: 'Sent', sortable: true, hideOnMobile: true, cell: (t) => <span className="text-xs text-muted-foreground">{formatDateTime(t.sentAt)}</span> },
    { key: 'status', header: 'Status', cell: (t) => <StatusBadge status={t.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Branch Transfers" subtitle={`${transfers.length} transfers between branches`} icon={ArrowLeftRight} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Transfers', value: transfers.length, color: 'bg-blue-100 text-blue-700' },
          { label: 'Pending', value: transfers.filter(t => t.status === 'PENDING_RECEIPT').length, color: 'bg-amber-100 text-amber-700' },
          { label: 'Received', value: transfers.filter(t => t.status === 'RECEIVED').length, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Total Value', value: formatCurrency(transfers.reduce((s, t) => s + t.totalValue, 0)), color: 'bg-purple-100 text-purple-700' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
              <Truck className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>
      <DataTable data={transfers} columns={columns} loading={loading} searchPlaceholder="Search transfers..." searchKeys={['reference', 'fromBranch', 'toBranch']} pageSize={10} />
    </div>
  )
}
