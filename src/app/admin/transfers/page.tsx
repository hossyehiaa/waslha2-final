'use client'

import { useEffect, useState } from 'react'
import { ArrowLeftRight, Truck, Plus, Check, X } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog'

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
  const { dict } = useLanguage()
  const L = dict.pages.transfers
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [receiveTarget, setReceiveTarget] = useState<Transfer | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Transfer | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/transfers')
      const data = await res.json()
      setTransfers(data.transfers || [])
    } catch {
      toast.error(dict.common.noData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [dict])

  async function handleReceive() {
    if (!receiveTarget) return
    const res = await fetch('/api/admin/transfers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: receiveTarget.id, action: 'receive' }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error || dict.common.noData)
    }
    toast.success(dict.statuses.RECEIVED)
    load()
  }

  async function handleCancel() {
    if (!cancelTarget) return
    const res = await fetch('/api/admin/transfers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cancelTarget.id, action: 'cancel' }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error || dict.common.noData)
    }
    toast.success(dict.statuses.CANCELLED)
    load()
  }

  const columns: Column<Transfer>[] = [
    { key: 'reference', header: L.reference, sortable: true, cell: (t) => <span className="font-mono font-medium text-xs">{t.reference}</span> },
    { key: 'fromBranch', header: L.from, cell: (t) => <span className="text-xs">{t.fromBranch}</span> },
    { key: 'toBranch', header: L.to, cell: (t) => <span className="text-xs">{t.toBranch}</span> },
    { key: 'shipmentCount', header: L.shipments, sortable: true, cell: (t) => <span className="font-medium">{t.shipmentCount}</span> },
    { key: 'totalValue', header: L.value, sortable: true, cell: (t) => <span className="font-medium text-xs">{formatCurrency(t.totalValue)}</span> },
    { key: 'sentAt', header: L.sent, sortable: true, hideOnMobile: true, cell: (t) => <span className="text-xs text-muted-foreground">{formatDateTime(t.sentAt)}</span> },
    { key: 'status', header: dict.common.status, cell: (t) => <StatusBadge status={t.status} /> },
    {
      key: 'actions',
      header: dict.common.actions,
      cell: (t) => (
        <div className="flex gap-2">
          {t.status === 'PENDING_RECEIPT' && (
            <>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setReceiveTarget(t) }}>
                <Check className="w-3.5 h-3.5 mr-1" />
                {dict.statuses.RECEIVED}
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={(e) => { e.stopPropagation(); setCancelTarget(t) }}>
                <X className="w-3.5 h-3.5 mr-1" />
                {dict.statuses.CANCELLED}
              </Button>
            </>
          )}
          {t.status === 'RECEIVED' && t.receivedAt && (
            <span className="text-xs text-muted-foreground">{formatDateTime(t.receivedAt)}</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={L.title} subtitle={`${transfers.length} ${L.subtitle}`} icon={ArrowLeftRight} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: L.totalTransfers, value: transfers.length, color: 'bg-blue-100 text-blue-700' },
          { label: L.pending, value: transfers.filter(t => t.status === 'PENDING_RECEIPT').length, color: 'bg-amber-100 text-amber-700' },
          { label: L.received, value: transfers.filter(t => t.status === 'RECEIVED').length, color: 'bg-emerald-100 text-emerald-700' },
          { label: L.totalValue, value: formatCurrency(transfers.reduce((s, t) => s + t.totalValue, 0)), color: 'bg-purple-100 text-purple-700' },
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
      <DataTable data={transfers} columns={columns} loading={loading} searchPlaceholder={`${dict.common.search}...`} searchKeys={['reference', 'fromBranch', 'toBranch']} pageSize={10} />

      <ConfirmDialog
        open={!!receiveTarget}
        onOpenChange={(v) => !v && setReceiveTarget(null)}
        title={dict.statuses.RECEIVED}
        description={`${dict.statuses.RECEIVED} ${receiveTarget?.reference}?`}
        onConfirm={handleReceive}
        confirmLabel={dict.statuses.RECEIVED}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        title={dict.statuses.CANCELLED}
        description={`${dict.statuses.CANCELLED} ${cancelTarget?.reference}?`}
        onConfirm={handleCancel}
        destructive
        confirmLabel={dict.statuses.CANCELLED}
      />
    </div>
  )
}
