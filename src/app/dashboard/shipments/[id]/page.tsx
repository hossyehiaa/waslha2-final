'use client'

import { useEffect, useState } from 'react'
import { Package, ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { useLanguage } from '@/components/language-provider'
import { useParams, useRouter } from 'next/navigation'

export default function ClientShipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { dict } = useLanguage()
  const L = dict.pages.shipments
  const [shipment, setShipment] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/shipments/${id}`)
      .then(r => r.json())
      .then(d => setShipment(d.shipment || d))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="space-y-6"><Skeleton className="h-12 w-64" /><Skeleton className="h-96 rounded-2xl" /></div>
  if (!shipment) return <div className="text-center py-20 text-muted-foreground">{dict.common.noData}</div>

  return (
    <div className="space-y-6">
      <PageHeader
        title={shipment.trackingNumber}
        subtitle={`${dict.dashboard.admin.created} ${formatDateTime(shipment.createdAt)}`}
        icon={Package}
        breadcrumb={[{ label: dict.nav.myShipments, href: '/dashboard/shipments' }, { label: shipment.trackingNumber }]}
        actions={<Button variant="outline" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />{dict.common.back}</Button>}
      />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-lg font-semibold mb-4">{L.timeline}</h3>
          <div className="space-y-3">
            {(shipment.statusHistory || []).slice().reverse().map((h: any, i: number) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                <div className={`w-2 h-2 rounded-full mt-2 ${i === 0 ? 'bg-primary animate-pulse' : 'bg-emerald-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={h.status} />
                    <span className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</span>
                  </div>
                  {h.note && <p className="text-xs text-muted-foreground mt-1">{h.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{L.details}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{dict.common.status}</span><StatusBadge status={shipment.status} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{dict.pages.tracking.from}</span><span className="font-medium">{shipment.senderCity?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{dict.pages.tracking.to}</span><span className="font-medium">{shipment.recipientCity?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{L.recipient}</span><span className="font-medium">{shipment.recipientName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{dict.pages.shipments.paymentStatus}</span><span className="font-medium text-xs">{shipment.recipientPhone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{L.weight}</span><span className="font-medium">{shipment.weight} kg</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{L.pieces}</span><span className="font-medium">{shipment.pieces}</span></div>
            <div className="pt-3 border-t flex justify-between"><span className="text-muted-foreground">{dict.dashboard.admin.cod}</span><span className="font-bold">{formatCurrency(shipment.codAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{L.shippingCost}</span><span className="font-medium">{formatCurrency(shipment.shippingCost)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{L.codFee}</span><span className="font-medium">{formatCurrency(shipment.codFee)}</span></div>
            <div className="pt-3 border-t flex justify-between"><span className="font-medium">{dict.common.total}</span><span className="font-bold text-primary">{formatCurrency(shipment.totalCost)}</span></div>
          </div>
        </Card>
      </div>
    </div>
  )
}
