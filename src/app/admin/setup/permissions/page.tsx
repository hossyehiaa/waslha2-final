'use client'

import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatTimeAgo } from '@/lib/format'

export default function Page() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/setup?resource=permissions')
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
      <PageHeader title="قوالب الصلاحيات" subtitle="إدارة قوالب وصلاحيات المستخدمين" icon={Shield} />
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد بيانات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right py-3 px-4 font-medium">الاسم</th>
                  <th className="text-right py-3 px-4 font-medium">الوصف</th>
                  <th className="text-right py-3 px-4 font-medium">الصلاحيات</th>
                  <th className="text-right py-3 px-4 font-medium">افتراضي</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="py-3 px-4">{getValue(row, 'name') || '-'}</td>
                    <td className="py-3 px-4">{getValue(row, 'description') || '-'}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{String(getValue(row, 'permissions') ?? '').substring(0, 50)}</td>
                    <td className="py-3 px-4">{getValue(row, 'isDefault') || '-'}</td>
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
