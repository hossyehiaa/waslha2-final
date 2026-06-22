'use client'

import { useEffect, useState } from 'react'
import { FileText, Check, X, Package } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'

type FlyerRequest = {
  id: string
  clientName: string
  quantity: number
  type: string
  notes: string | null
  status: string
  createdAt: string
}

export default function Page() {
  const [requests, setRequests] = useState<FlyerRequest[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/flyer-requests')
      const d = await res.json()
      setRequests(d.requests || [])
    } catch { toast.error('فشل تحميل البيانات') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleAction(id: string, action: string) {
    const res = await fetch('/api/admin/flyer-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    if (!res.ok) { toast.error('فشل التحديث'); return }
    toast.success('تم التحديث بنجاح')
    load()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="طلبات فلير" subtitle="إدارة طلبات الفلير من العملاء" icon={FileText} />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4"><div className="text-xl font-bold">{requests.length}</div><div className="text-xs text-muted-foreground mt-0.5">إجمالي الطلبات</div></Card>
        <Card className="p-4"><div className="text-xl font-bold text-amber-600">{requests.filter(r => r.status === 'PENDING').length}</div><div className="text-xs text-muted-foreground mt-0.5">معلقة</div></Card>
        <Card className="p-4"><div className="text-xl font-bold text-emerald-600">{requests.filter(r => r.status === 'APPROVED').length}</div><div className="text-xs text-muted-foreground mt-0.5">معتمدة</div></Card>
        <Card className="p-4"><div className="text-xl font-bold">{requests.reduce((s, r) => s + r.quantity, 0)}</div><div className="text-xs text-muted-foreground mt-0.5">إجمالي الكمية</div></Card>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد طلبات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right py-3 px-4 font-medium">العميل</th>
                  <th className="text-right py-3 px-4 font-medium">الكمية</th>
                  <th className="text-right py-3 px-4 font-medium">النوع</th>
                  <th className="text-right py-3 px-4 font-medium hidden md:table-cell">ملاحظات</th>
                  <th className="text-right py-3 px-4 font-medium">الحالة</th>
                  <th className="text-right py-3 px-4 font-medium hidden md:table-cell">التاريخ</th>
                  <th className="text-right py-3 px-4 font-medium">خيارات</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="py-3 px-4 font-medium">{r.clientName}</td>
                    <td className="py-3 px-4">{r.quantity}</td>
                    <td className="py-3 px-4"><span className="text-xs px-2 py-1 rounded bg-muted">{r.type === 'BRANDED' ? 'براند' : 'عادي'}</span></td>
                    <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell">{r.notes || '-'}</td>
                    <td className="py-3 px-4"><StatusBadge status={r.status} /></td>
                    <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell">{formatTimeAgo(r.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {r.status === 'PENDING' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleAction(r.id, 'approve')} className="text-emerald-600">
                              <Check className="w-3.5 h-3.5 mr-1" />اعتماد
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleAction(r.id, 'reject')} className="text-destructive">
                              <X className="w-3.5 h-3.5 mr-1" />رفض
                            </Button>
                          </>
                        )}
                        {r.status === 'APPROVED' && (
                          <Button size="sm" onClick={() => handleAction(r.id, 'fulfill')} className="bg-emerald-600 hover:bg-emerald-700">
                            <Package className="w-3.5 h-3.5 mr-1" />تسليم
                          </Button>
                        )}
                        {(r.status === 'REJECTED' || r.status === 'FULFILLED') && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
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
