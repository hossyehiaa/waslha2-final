'use client'

import { useEffect, useState } from 'react'
import { DollarSign } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/format'

export default function Page() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/drivers')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="سداد المناديب" subtitle="إدارة مدفوعات ومستحقات المناديب" icon={DollarSign} />
      
      {data?.drivers && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">إجمالي المستحقات</div>
            <div className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(data.drivers.reduce((s: number, d: any) => s + d.pendingEarnings, 0))}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">إجمالي المدفوع</div>
            <div className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(data.drivers.reduce((s: number, d: any) => s + d.totalEarnings, 0))}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">عدد المناديب</div>
            <div className="text-xl font-bold mt-1">{data.drivers.length}</div>
          </Card>
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right py-3 px-4 font-medium">المندوب</th>
                  <th className="text-right py-3 px-4 font-medium">الكود</th>
                  <th className="text-right py-3 px-4 font-medium">التوصيلات</th>
                  <th className="text-right py-3 px-4 font-medium">المستحقات</th>
                  <th className="text-right py-3 px-4 font-medium">الإجمالي</th>
                  <th className="text-right py-3 px-4 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {(data?.drivers || []).map((d: any) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="py-3 px-4 font-medium">{d.fullName}</td>
                    <td className="py-3 px-4 text-xs font-mono text-muted-foreground">{d.driverCode}</td>
                    <td className="py-3 px-4">{d.totalDeliveries}</td>
                    <td className="py-3 px-4 font-medium text-amber-600">{formatCurrency(d.pendingEarnings)}</td>
                    <td className="py-3 px-4 font-medium text-emerald-600">{formatCurrency(d.totalEarnings)}</td>
                    <td className="py-3 px-4"><span className={'text-xs px-2 py-1 rounded ' + (d.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>{d.status === 'ACTIVE' ? 'نشط' : 'موقوف'}</span></td>
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
