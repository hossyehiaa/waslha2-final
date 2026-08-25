'use client'

import { useCallback, useEffect, useState } from 'react'
import { RotateCcw, Send, Trash2 } from 'lucide-react'
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
    fetch('/api/admin/returns?status=IN_TRANSIT')
      .then(r => r.json())
      .then(d => setItems(d.returns || []))
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [dict])

  useEffect(() => { load() }, [load])

  async function applyAction(action: 'deliver' | 'dispose') {
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
      toast.success(action === 'deliver'
        ? (isRTL ? `تم تسليم ${d.updated} مرتجع للعميل — تمت الأرشفة في إدارة المرتجعات` : `${d.updated} returns delivered to clients`)
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
    { key: 'condition', header: isRTL ? 'الحالة الفنية' : 'Condition', hideOnMobile: true, cell: (r) => <span className="text-xs">{r.condition || '-'}</span> },
    { key: 'status', header: dict.common.status, cell: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', header: isRTL ? 'التاريخ' : 'Date', sortable: true, hideOnMobile: true, cell: (r) => <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en')}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={isRTL ? 'تسليم المرتجعات' : 'Deliver Returns'}
        subtitle={isRTL ? 'المرحلة الثانية — تسليم المرتجعات المستلمة للعملاء' : 'Stage 2 — deliver received returns back to clients'}
        icon={RotateCcw}
      />

      <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-xs leading-relaxed text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-300">
        {isRTL ? (
          <>💡 تظهر هنا المرتجعات التي <b>تم استلامها من المنديب</b> — بعد تسليمها للعميل تُؤرشف تلقائياً في <b>إدارة المرتجعات</b>. لو مرتجع مش موجود هنا، استلمه أولاً من <b>استلام المرتجعات</b>.</>
        ) : (
          <>💡 Returns already <b>received from the driver</b> appear here — after client delivery they are archived in <b>Returns Management</b>. If a return is missing, receive it first from <b>Receive Returns</b>.</>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{isRTL ? 'جاهز للتسليم' : 'Ready to deliver'}</div>
          <div className="text-xl font-bold mt-1">{items.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{isRTL ? 'محدد' : 'Selected'}</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{selectedIds.length}</div>
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
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={acting} onClick={() => applyAction('deliver')}>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {acting ? (isRTL ? 'جاري التسليم...' : 'Delivering...') : (isRTL ? 'تسليم للعميل' : 'Deliver to client')}
            </Button>
            <Button size="sm" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/5" disabled={acting} onClick={() => applyAction('dispose')}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {isRTL ? 'تصرف' : 'Dispose'}
            </Button>
          </>
        }
        emptyMessage={isRTL ? 'لا توجد مرتجعات جاهزة للتسليم — استلمها أولاً من صفحة استلام المرتجعات' : 'No returns ready to deliver — receive them first'}
        pageSize={10}
      />
    </div>
  )
}
