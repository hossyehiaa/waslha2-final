'use client'

import { useCallback, useEffect, useState } from 'react'
import { RotateCcw, PackageCheck, Send, Archive, Link2 } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
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
  updatedAt: string
}

type Counts = { PENDING: number; IN_TRANSIT: number; RETURNED_TO_CLIENT: number; DISPOSED: number }

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'بانتظار الاستلام (استلام المرتجعات)',
  IN_TRANSIT: 'تم الاستلام — جاهز للتسليم (تسليم المرتجعات)',
  RETURNED_TO_CLIENT: 'تم التسليم للعميل — أرشيف',
  DISPOSED: 'تم التصرف — أرشيف',
}

export default function AdminReturnsPage() {
  const { dict, isRTL } = useLanguage()
  const [items, setItems] = useState<ReturnItem[]>([])
  const [counts, setCounts] = useState<Counts>({ PENDING: 0, IN_TRANSIT: 0, RETURNED_TO_CLIENT: 0, DISPOSED: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/returns?scope=archive')
      .then(r => r.json())
      .then(d => {
        setItems(d.returns || [])
        if (d.counts) setCounts(d.counts)
      })
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [dict])

  useEffect(() => { load() }, [load])

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
      key: 'recipient',
      header: isRTL ? 'المستلم' : 'Recipient',
      hideOnMobile: true,
      cell: (r) => (
        <div className="flex flex-col">
          <span className="text-xs">{r.recipient}</span>
          <span className="text-[10px] text-muted-foreground" dir="ltr">{r.phone}</span>
        </div>
      ),
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
      key: 'codAmount',
      header: isRTL ? 'المبلغ' : 'Amount',
      sortable: true,
      hideOnMobile: true,
      cell: (r) => <span className="text-xs font-medium">{r.codAmount.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</span>,
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
      key: 'updatedAt',
      header: isRTL ? 'تاريخ التسليم' : 'Delivered at',
      sortable: true,
      hideOnMobile: true,
      cell: (r) => <span className="text-xs text-muted-foreground">{new Date(r.updatedAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en')}</span>,
    },
  ]

  const total = counts.PENDING + counts.IN_TRANSIT + counts.RETURNED_TO_CLIENT + counts.DISPOSED

  return (
    <div className="space-y-6">
      <PageHeader
        title={isRTL ? 'إدارة المرتجعات' : 'Returns Management'}
        subtitle={isRTL ? 'أرشيف المرتجعات المكتملة — تظهر هنا فقط بعد استلامها وتسليمها للعميل' : 'Completed returns archive — appears here only after receive + deliver to client'}
        icon={RotateCcw}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        {isRTL ? (
          <>💡 دورة حياة المرتجع: أي شحنة <b>ملغية / مرتجعة / العميل رفض استلامها</b> تظهر تلقائياً في <b>استلام المرتجعات</b> ← بعد استلامها من المنديب تنتقل إلى <b>تسليم المرتجعات</b> ← وبعد تسليمها للعميل تُؤرشف هنا في <b>إدارة المرتجعات</b> — لا يظهر المرتجع هنا قبل اكتمال الدورة.</>
        ) : (
          <>💡 Return lifecycle: any cancelled / returned / refused shipment appears automatically in <b>Receive Returns</b> ← after being received from the driver it moves to <b>Deliver Returns</b> ← and after being delivered to the client it is archived here in <b>Returns Management</b>.</>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
            <a href="/admin/returns/receive" className="text-[10px] text-amber-700 hover:underline flex items-center gap-0.5">
              <Link2 className="w-3 h-3" />
              {isRTL ? 'اذهب' : 'Go'}
            </a>
          </div>
          <div className="text-xl font-bold">{counts.PENDING}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{isRTL ? 'بانتظار الاستلام (من المنديب)' : 'Awaiting receipt (from driver)'}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <a href="/admin/returns/deliver" className="text-[10px] text-cyan-700 hover:underline flex items-center gap-0.5">
              <Link2 className="w-3 h-3" />
              {isRTL ? 'اذهب' : 'Go'}
            </a>
          </div>
          <div className="text-xl font-bold">{counts.IN_TRANSIT}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{isRTL ? 'جاهز للتسليم للعميل' : 'Ready to deliver to client'}</div>
        </Card>
        <Card className="p-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
            <Archive className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold">{counts.RETURNED_TO_CLIENT}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{isRTL ? 'تم التسليم للعميل (أرشيف)' : 'Delivered to client (archive)'}</div>
        </Card>
        <Card className="p-4">
          <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold">{total}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{isRTL ? `إجمالي المرتجعات (تصرف: ${counts.DISPOSED})` : `Total returns (disposed: ${counts.DISPOSED})`}</div>
        </Card>
      </div>

      <DataTable
        data={items}
        columns={columns}
        loading={loading}
        searchPlaceholder={isRTL ? 'بحث برقم التتبع أو العميل...' : 'Search tracking # or client...'}
        searchKeys={['trackingNumber', 'client', 'recipient', 'phone']}
        emptyMessage={isRTL ? 'لا توجد مرتجعات مكتملة بعد — المرتجع يُؤرشف هنا فقط بعد استلامه من المنديب وتسليمه للعميل' : 'No completed returns yet — a return is archived here only after receipt + delivery to client'}
        pageSize={10}
      />
    </div>
  )
}
