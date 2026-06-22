'use client'

import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

type ReturnItem = {
  id: string
  shipmentId: string
  trackingNumber: string
  reason: string
  status: string
  condition: string | null
  notes: string | null
  createdAt: string
}

export default function AdminReturnsPage() {
  const { dict } = useLanguage()
  const L = dict.pages.returns
  const [returns, setReturns] = useState<ReturnItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/returns')
      .then(r => r.json())
      .then(d => setReturns(d.returns || []))
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [dict])

  const columns: Column<ReturnItem>[] = [
    { key: 'trackingNumber', header: L.tracking, sortable: true, cell: (r) => <span className="font-mono font-medium text-xs">{r.trackingNumber}</span> },
    { key: 'reason', header: L.reason, cell: (r) => <span className="text-xs">{r.reason}</span> },
    { key: 'condition', header: L.condition, hideOnMobile: true, cell: (r) => <span className="text-xs">{r.condition || '-'}</span> },
    { key: 'createdAt', header: L.created, sortable: true, hideOnMobile: true, cell: (r) => <span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span> },
    { key: 'status', header: dict.common.status, cell: (r) => <StatusBadge status={r.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={L.title} icon={RotateCcw} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: L.totalReturns, value: returns.length, color: 'bg-rose-100 text-rose-700' },
          { label: L.pending, value: returns.filter(r => r.status === 'PENDING').length, color: 'bg-amber-100 text-amber-700' },
          { label: L.inTransit, value: returns.filter(r => r.status === 'IN_TRANSIT').length, color: 'bg-blue-100 text-blue-700' },
          { label: L.returned, value: returns.filter(r => r.status === 'RETURNED_TO_CLIENT').length, color: 'bg-emerald-100 text-emerald-700' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>
      <DataTable data={returns} columns={columns} loading={loading} searchPlaceholder={`${dict.common.search}...`} searchKeys={['trackingNumber', 'reason']} pageSize={10} />
    </div>
  )
}
