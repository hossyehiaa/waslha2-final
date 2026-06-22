'use client'

import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { formatCurrency, formatTimeAgo } from '@/lib/format'

export default function Page() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/shipments?status=CANCELLED&limit=50')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="الشحنات المحذوفة" subtitle="استعادة ومراجعة الشحنات المحذوفة" icon={FileText} />
      
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4"><div className="text-xs text-muted-foreground">العدد الإجمالي</div><div className="text-xl font-bold mt-1">{data.total || 0}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">إجمالي COD</div><div className="text-xl font-bold text-amber-600 mt-1">{formatCurrency((data.shipments || []).reduce((s: number, x: any) => s + x.codAmount, 0))}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">في الصفحة</div><div className="text-xl font-bold mt-1">{(data.shipments || []).length}</div></Card>
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (data?.shipments || []).length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد شحنات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30"><tr className="border-b text-xs text-muted-foreground">
                <th className="text-right py-3 px-4 font-medium">رقم التتبع</th>
                <th className="text-right py-3 px-4 font-medium">العميل</th>
                <th className="text-right py-3 px-4 font-medium hidden md:table-cell">المسار</th>
                <th className="text-right py-3 px-4 font-medium">الحالة</th>
                <th className="text-right py-3 px-4 font-medium">COD</th>
                <th className="text-right py-3 px-4 font-medium hidden md:table-cell">التاريخ</th>
              </tr></thead>
              <tbody>
                {(data?.shipments || []).map((s: any) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-medium">{s.trackingNumber}</td>
                    <td className="py-3 px-4">{s.client}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell">{s.senderCity} {' -> '} {s.recipientCity}</td>
                    <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                    <td className="py-3 px-4 font-medium">{formatCurrency(s.codAmount)}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell">{formatTimeAgo(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
