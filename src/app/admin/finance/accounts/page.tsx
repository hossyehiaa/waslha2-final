'use client'

import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/format'

export default function Page() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/accounts')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  const TYPE_LABELS: Record<string, string> = { BANK: 'بنك', CASH: 'نقدي', WALLET: 'محفظة' }
  const TYPE_COLORS: Record<string, string> = { BANK: 'bg-blue-100 text-blue-700', CASH: 'bg-emerald-100 text-emerald-700', WALLET: 'bg-purple-100 text-purple-700' }

  return (
    <div className="space-y-6">
      <PageHeader title="بيانات الحسابات" subtitle="بيانات الحسابات المالية" icon={Wallet} />
      
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : data?.stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'إجمالي الأرصدة', value: formatCurrency(data.stats.totalBalance), color: 'bg-primary/10 text-primary' },
            { label: 'حسابات البنوك', value: formatCurrency(data.stats.bankBalance), color: 'bg-blue-100 text-blue-700' },
            { label: 'الصناديق النقدية', value: formatCurrency(data.stats.cashBalance), color: 'bg-emerald-100 text-emerald-700' },
            { label: 'المحافظ الإلكترونية', value: formatCurrency(data.stats.walletBalance), color: 'bg-purple-100 text-purple-700' },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <div className={'w-9 h-9 rounded-lg ' + s.color + ' flex items-center justify-center mb-3'}>
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right py-3 px-4 font-medium">اسم الحساب</th>
                  <th className="text-right py-3 px-4 font-medium">النوع</th>
                  <th className="text-right py-3 px-4 font-medium">الرصيد</th>
                  <th className="text-right py-3 px-4 font-medium hidden md:table-cell">الفرع</th>
                  <th className="text-right py-3 px-4 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {(data?.accounts || []).map((a: any) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="py-3 px-4 font-medium">{a.name}</td>
                    <td className="py-3 px-4"><span className={'text-xs px-2 py-1 rounded ' + (TYPE_COLORS[a.type] || '')}>{TYPE_LABELS[a.type] || a.type}</span></td>
                    <td className="py-3 px-4 font-bold">{formatCurrency(a.balance)}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell">{a.branch || '-'}</td>
                    <td className="py-3 px-4"><span className={'text-xs px-2 py-1 rounded ' + (a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>{a.isActive ? 'نشط' : 'موقوف'}</span></td>
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
