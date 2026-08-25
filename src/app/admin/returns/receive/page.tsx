'use client'

import { useCallback, useEffect, useState } from 'react'
import { PackageCheck, ArrowDownToLine, Trash2 } from 'lucide-react'
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

  async function applyAction(action: 'receive' | 'dispose') {
    if (selectedIds.length === 0) return
    setActing(true)
    try {
      const res = await fetch('/api/admin/returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || (isRTL ? 'فشل' : 'Failed')); return }
      toast.success(action === 'receive'
        ? (isRTL ? `تم استلام ${d.updated} مرتجع من المنديب — انتقل الآن لتسليم المرتجعات` : `${d.updated} returns received`)
        : (isRTL ? `تم التصرف في ${d.updated} مرتجع` : `${d.updated} returns disposed`))
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
        subtitle={isRTL ? 'المرحلة الأولى — استلام المرتجعات من المناديب قبل تسليمها للعملاء' : 'Stage 1 — receive returns from drivers before delivering them back to clients'}
        icon={PackageCheck}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        {isRTL ? (
          <>💡 أي شحنة <b>ملغية أو مرتجعة أو العميل رفض استلامها</b> تظهر هنا أولاً — استلمها من المنديب لتنتقل إلى <b>تسليم المرتجعات</b>، وبعد تسليمها للعميل تُأرشف في <b>إدارة المرتجعات</b>.</>
        ) : (
          <>💡 Any <b>cancelled / returned / refused</b> shipment appears here first — receive it from the driver to move it to <b>Deliver Returns</b>; after client delivery it is archived in <b>Returns Management</b>.</>
        )}
      </div>

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
          <>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" disabled={acting} onClick={() => applyAction('receive')}>
              <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" />
              {acting ? (isRTL ? 'جاري الاستلام...' : 'Receiving...') : (isRTL ? 'استلام من المنديب' : 'Receive from driver')}
            </Button>
            <Button size="sm" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/5" disabled={acting} onClick={() => applyAction('dispose')}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {isRTL ? 'تصرف' : 'Dispose'}
            </Button>
          </>
        }
        emptyMessage={isRTL ? 'لا توجد مرتجعات بانتظار الاستلام — أي شحنة ملغية أو مرتجعة أو رفض العميل استلامها ستظهر هنا تلقائياً' : 'No returns awaiting receipt — cancelled / returned / refused shipments appear here automatically'}
        pageSize={10}
      />
    </div>
  )
}
