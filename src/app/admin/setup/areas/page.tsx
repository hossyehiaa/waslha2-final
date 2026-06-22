'use client'

import { useEffect, useState } from 'react'
import { MapPinned } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatTimeAgo } from '@/lib/format'

export default function Page() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/setup?resource=areas')
      .then(r => r.json())
      .then(d => {
        const key = Object.keys(d).find(k => Array.isArray(d[k]))
        setData(key ? d[key] : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function getValue(obj: any, path: string) {
    return path.split('.').reduce((o, k) => o?.[k], obj)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="المناطق" subtitle="إدارة المناطق داخل المدن" icon={MapPinned} />
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <MapPinned className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد بيانات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right py-3 px-4 font-medium">المنطقة</th>
                  <th className="text-right py-3 px-4 font-medium">الكود</th>
                  <th className="text-right py-3 px-4 font-medium">المدينة</th>
                  <th className="text-right py-3 px-4 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="py-3 px-4">{getValue(row, 'name') || '-'}</td>
                    <td className="py-3 px-4">{getValue(row, 'code') || '-'}</td>
                    <td className="py-3 px-4">{getValue(row, 'city.name') || '-'}</td>
                    <td className="py-3 px-4"><span className="text-xs px-2 py-1 rounded bg-muted">{String(getValue(row, 'status') ?? '-')}</span></td>
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
