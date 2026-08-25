'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw, RefreshCw, PackageCheck, Send, Trash2, History } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

type ReturnItem = {
  id: string
  shipmentId: string
  trackingNumber: string
  client: string
  route: string
  recipient: string
  phone: string
  codAmount: number
  shipmentStatus: string
  shipmentType: string
  reason: string
  status: string
  condition: string | null
  notes: string | null
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'بانتظار الاستلام',
  IN_TRANSIT: 'تم الاستلام — جاهز للتسليم',
  RETURNED_TO_CLIENT: 'تم التسليم',
  DISPOSED: 'تم التصرف',
}

export default function AdminReturnsPage() {
  const { dict, isRTL } = useLanguage()
  const [items, setItems] = useState<ReturnItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [acting, setActing] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/returns')
      .then(r => r.json())
      .then(d => setItems(d.returns || []))
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [dict])

  useEffect(() => { load() }, [load])

  async function applyAction(action: 'receive' | 'deliver' | 'dispose') {
    if (selectedIds.length === 0) return
    setActing(true)
    try {
      const res = await fetch('/api/admin/returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error || (isRTL ? 'فشل تنفيذ العملية' : 'Action failed'))
        return
      }
      const parts: string[] = []
      if (d.updated > 0) parts.push(isRTL ? `تم تحديث ${d.updated}` : `${d.updated} updated`)
      if (d.skipped > 0) parts.push(isRTL ? `تخطي ${d.skipped}` : `${d.skipped} skipped`)
      if (d.errors?.length > 0) parts.push(isRTL ? `${d.errors.length} فشلت` : `${d.errors.length} failed`)
      toast.success(parts.join(' • ') || (isRTL ? 'تم' : 'Done'))
      setSelectedIds([])
      load()
    } catch {
      toast.error(isRTL ? 'خطأ في الشبكة' : 'Network error')
    } finally {
      setActing(false)
    }
  }

  const stats = useMemo(() => {
    return {
      pending: items.filter(i => i.status === 'PENDING').length,
      received: items.filter(i => i.status === 'IN_TRANSIT').length,
      delivered: items.filter(i => i.status === 'RETURNED_TO_CLIENT').length,
      disposed: items.filter(i => i.status === 'DISPOSED').length,
      total: items.length,
    }
  }, [items])

  const columns: Column<ReturnItem>[] = [
    {
      key: 'trackingNumber',
      header: isRTL ? 'رقم التتبع' : 'Tracking #',
      sortable: true,
      cell: (r) => <span className="font-mono font-medium text-xs">{r.trackingNumber}</span>,
    },
    {
      key: 'client',
      header: isRTL ? 'العميل' : 'Client',
      sortable: true,
      cell: (r) => <span className="font-medium text-xs">{r.client}</span>,
    },
    {
      key: 'route',
      header: isRTL ? 'المسار' : 'Route',
      hideOnMobile: true,
      cell: (r) => <span className="text-xs text-muted-foreground">{r.route}</span>,
    },
    {
      key: 'reason',
      header: isRTL ? 'السبب' : 'Reason',
      hideOnMobile: true,
      cell: (r) => <span className="text-xs">{r.reason}</span>,
    },
    {
      key: 'condition',
      header: isRTL ? 'الحالة الفنية' : 'Condition',
      hideOnMobile: true,
      cell: (r) => <span className="text-xs">{r.condition || '-'}</span>,
    },
    {
      key: 'status',
      header: dict.common.status,
      cell: (r) => (
        <div className="flex flex-col gap-1 items-start">
          <StatusBadge status={r.status} />
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {isRTL ? 'الشحنة:' : 'Shipment:'}
            <StatusBadge status={r.shipmentStatus} />
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: isRTL ? 'التاريخ' : 'Date',
      sortable: true,
      hideOnMobile: true,
      cell: (r) => <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en')}</span>,
    },
  ]

  const selectable = useCallback(
    (r: ReturnItem) => r.status !== 'RETURNED_TO_CLIENT' && r.status !== 'DISPOSED',
    []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={isRTL ? 'إدارة المرتجعات' : 'Returns Management'}
        subtitle={isRTL ? 'استلام وتسليم المرتجعات من المناديب للعملاء' : 'Receive and deliver returns from drivers to clients'}
        icon={RotateCcw}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        {isRTL ? (
          <>💡 المرتجعات تُسجَّل <b>تلقائياً</b> بمجرد <b>رفض العميل الاستلام</b> (فشل تسليم) أو <b>إلغاء شحنة كانت في الطريق</b> — استلمها من المنديب ثم سلّمها للعميل، ولو الشحنة اتسلمت بنجاح بعد الفشل يتشال ملف المرتجع تلقائياً.</>
        ) : (
          <>💡 Returns are recorded <b>automatically</b> whenever the customer refuses delivery or an in-flight shipment is cancelled — receive them from the driver, then hand them back to the client.</>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isRTL ? 'بانتظار الاستلام' : 'Pending receipt', value: stats.pending, icon: PackageCheck, color: 'bg-amber-100 text-amber-700' },
          { label: isRTL ? 'تم الاستلام' : 'Received', value: stats.received, icon: History, color: 'bg-cyan-100 text-cyan-700' },
          { label: isRTL ? 'تم التسليم' : 'Delivered', value: stats.delivered, icon: Send, color: 'bg-emerald-100 text-emerald-700' },
          { label: isRTL ? 'إجمالي المرتجعات' : 'Total returns', value: stats.total, icon: RotateCcw, color: 'bg-purple-100 text-purple-700' },
        ].map((s, i) => (
          <Card key={s.label} className="p-4">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      <DataTable
        data={items}
        columns={columns}
        loading={loading}
        searchPlaceholder={isRTL ? 'بحث برقم التتبع أو العميل...' : 'Search tracking # or client...'}
        searchKeys={['trackingNumber', 'client', 'recipient', 'phone']}
        enableSelection
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        selectable={selectable}
        selectionLabel={isRTL ? 'مرتجع محدد' : 'selected'}
        bulkBar={
          <>
            <Button size="sm" variant="outline" disabled={acting} onClick={() => applyAction('receive')} className="border-amber-300 text-amber-700 hover:bg-amber-50">
              <PackageCheck className="w-3.5 h-3.5 mr-1.5" />
              {isRTL ? 'استلام من المنديب' : 'Receive'}
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={acting} onClick={() => applyAction('deliver')}>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {isRTL ? 'تسليم للعميل' : 'Deliver'}
            </Button>
            <Button size="sm" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/5" disabled={acting} onClick={() => applyAction('dispose')}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {isRTL ? 'تصرف' : 'Dispose'}
            </Button>
          </>
        }
        emptyMessage={isRTL ? 'لا توجد مرتجعات — بمجرد رفض العميل الاستلام أو إلغاء شحنة في الطريق ستظهر هنا تلقائياً' : 'No returns yet — refused or cancelled in-flight shipments appear here automatically'}
        pageSize={10}
      />
    </div>
  )
}
