'use client'

import { useEffect, useState } from 'react'
import { Banknote } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatTimeAgo } from '@/lib/format'

export default function Page() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/cash-orders?type=CASH_IN')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="إذن قبض نقدية" subtitle="إنشاء وإدارة أذونات قبض النقدية" icon={Banknote} />
      
      {data?.orders && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">إجمالي الأذونات</div>
            <div className="text-xl font-bold mt-1">{data.orders.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">إجمالي المبلغ</div>
            <div className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(data.orders.reduce((s: number, o: any) => s + o.amount, 0))}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">بانتظار الموافقة</div>
            <div className="text-xl font-bold text-rose-600 mt-1">{data.orders.filter((o: any) => o.status === 'PENDING').length}</div>
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
                  <th className="text-right py-3 px-4 font-medium">المرجع</th>
                  <th className="text-right py-3 px-4 font-medium">المبلغ</th>
                  <th className="text-right py-3 px-4 font-medium">السبب</th>
                  <th className="text-right py-3 px-4 font-medium">المستلم</th>
                  <th className="text-right py-3 px-4 font-medium">الحساب</th>
                  <th className="text-right py-3 px-4 font-medium">الحالة</th>
                  <th className="text-right py-3 px-4 font-medium hidden md:table-cell">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {(data?.orders || []).map((o: any) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-medium">{o.reference}</td>
                    <td className="py-3 px-4 font-bold">{formatCurrency(o.amount)}</td>
                    <td className="py-3 px-4 text-xs">{o.reason}</td>
                    <td className="py-3 px-4 text-xs">{o.recipient}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{o.account}</td>
                    <td className="py-3 px-4"><span className={'text-xs px-2 py-1 rounded ' + (o.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : o.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')}>{o.status === 'APPROVED' ? 'معتمد' : o.status === 'PENDING' ? 'معلق' : 'مرفوض'}</span></td>
                    <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell">{formatTimeAgo(o.createdAt)}</td>
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
