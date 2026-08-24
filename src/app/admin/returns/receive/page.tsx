'use client'

import { useCallback, useEffect, useState } from 'react'
import { PackageCheck, ArrowDownToLine } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

type ReturnItem = {
  id: string
  shipmentId: string
  trackingNumber: string
  client: string
  route: string
  reason: string
  status: string
  condition: string | null
  notes: string | null
  createdAt: string
}

export default function Page() {
  const { dict, isRTL } = useLanguage()
  const [items, setItems] = useState<ReturnItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [acting, setActing] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/returns?status=PENDING')
      .then(r => r.json())
      .then(d => setItems(d.returns || []))
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [dict])

  useEffect(() => { load() }, [load])

  async function receive() {
    if (selectedIds.length === 0) return
    setActing(true)
    try {
      const res = await fetch('/api/admin/returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action: 'receive' }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || (isRTL ? 'فشل' : 'Failed')); return }
      toast.success(isRTL ? `تم استلام ${d.updated} مرتجع من المنديب` : `${d.updated} returns received`)
      setSelectedIds([])
      load()
    } catch {
      toast.error(isRTL ? 'خطأ في الشبكة' : 'Network error')
    } finally {
      setActing(false)
    }
  }

  const columns: Column<ReturnItem>[] = [
    { key: 'trackingNumber', header: isRTL ? 'رقم التتبع' : 'Tracking #', sortable: true, cell: (r) => <span className="font-mono font-medium text-xs">{r.trackingNumber}</span> },
    { key: 'client', header: isRTL ? 'العميل' : 'Client', sortable: true, cell: (r) => <span className="font-medium text-xs">{r.client}</span> },
    { key: 'route', header: isRTL ? 'المسار' : 'Route', hideOnMobile: true, cell: (r) => <span className="text-xs text-muted-foreground">{r.route}</span> },
    { key: 'reason', header: isRTL ? 'السبب' : 'Reason', hideOnMobile: true, cell: (r) => <span className="text-xs">{r.reason}</span> },
    { key: 'status', header: dict.common.status, cell: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', header: isRTL ? 'التاريخ' : 'Date', sortable: true, hideOnMobile: true, cell: (r) => <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en')}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={isRTL ? 'استلام المرتجعات' : 'Receive Returns'}
        subtitle={isRTL ? 'استلام المرتجعات من المناديب — حدد المرتجعات واضغط استلام' : 'Receive returns from drivers — select and click Receive'}
        icon={PackageCheck}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{isRTL ? 'بانتظار الاستلام' : 'Awaiting receipt'}</div>
          <div className="text-xl font-bold mt-1">{items.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{isRTL ? 'محدد' : 'Selected'}</div>
          <div className="text-xl font-bold text-amber-600 mt-1">{selectedIds.length}</div>
        </Card>
      </div>

      <DataTable
        data={items}
        columns={columns}
        loading={loading}
        searchPlaceholder={isRTL ? 'بحث برقم التتبع أو العميل...' : 'Search tracking # or client...'}
        searchKeys={['trackingNumber', 'client']}
        enableSelection
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        selectionLabel={isRTL ? 'مرتجع محدد' : 'selected'}
        bulkBar={
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700" disabled={acting} onClick={receive}>
            <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" />
            {acting ? (isRTL ? 'جاري الاستلام...' : 'Receiving...') : (isRTL ? 'استلام من المنديب' : 'Receive from driver')}
          </Button>
        }
        emptyMessage={isRTL ? 'لا توجد مرتجعات بانتظار الاستلام' : 'No returns awaiting receipt'}
        pageSize={10}
      />
    </div>
  )
}
