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
    fetch('/api/admin/dashboard')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="كشف حساب مندوب" subtitle="كشف حساب تفصيلي لكل مندوب" icon={FileText} />
      
      {loading ? (
        <Card className="p-6"><Skeleton className="h-64 w-full" /></Card>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4"><div className="text-2xl font-bold">{data.stats.totalShipments}</div><div className="text-xs text-muted-foreground mt-1">إجمالي الشحنات</div></Card>
            <Card className="p-4"><div className="text-2xl font-bold">{data.stats.totalClients}</div><div className="text-xs text-muted-foreground mt-1">العملاء</div></Card>
            <Card className="p-4"><div className="text-2xl font-bold">{data.stats.activeDrivers}</div><div className="text-xs text-muted-foreground mt-1">المناديب</div></Card>
            <Card className="p-4"><div className="text-2xl font-bold">{data.stats.totalBranches}</div><div className="text-xs text-muted-foreground mt-1">الفروع</div></Card>
          </div>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">كشف حساب مندوب</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30"><tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right py-3 px-4 font-medium">#</th>
                  <th className="text-right py-3 px-4 font-medium">رقم التتبع</th>
                  <th className="text-right py-3 px-4 font-medium">العميل</th>
                  <th className="text-right py-3 px-4 font-medium">الحالة</th>
                  <th className="text-right py-3 px-4 font-medium">COD</th>
                </tr></thead>
                <tbody>
                  {(data.recentShipments || []).slice(0, 20).map((s: any, i: number) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                      <td className="py-3 px-4 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="py-3 px-4 font-mono text-xs font-medium">{s.trackingNumber}</td>
                      <td className="py-3 px-4">{s.client}</td>
                      <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(s.codAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">لا توجد بيانات</p>
        </Card>
      )}
    </div>
  )
}
