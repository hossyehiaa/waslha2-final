'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Package, MapPin, User, Phone, Weight, ArrowRight,
  Truck, Wallet, Clock, CheckCircle2, Printer, Edit,
  ChevronRight,
} from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDateTime, formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [shipment, setShipment] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/shipments/${id}`)
      .then(r => r.json())
      .then(d => setShipment(d.shipment || d))
      .finally(() => setLoading(false))
  }, [id])

  async function updateStatus(newStatus: string) {
    try {
      const res = await fetch(`/api/shipments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || 'Failed to update status')
        return
      }
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`)
      setShipment((prev: any) => ({ ...prev, status: newStatus }))
    } catch {
      toast.error('Network error')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  if (!shipment) {
    return <div className="text-center py-20 text-muted-foreground">Shipment not found</div>
  }

  const timeline = [
    { status: 'PENDING', label: 'Shipment Created', icon: Package, done: true },
    { status: 'PICKED_UP', label: 'Picked Up', icon: Truck, done: ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'].includes(shipment.status) },
    { status: 'IN_TRANSIT', label: 'In Transit', icon: MapPin, done: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'].includes(shipment.status) },
    { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck, done: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'].includes(shipment.status) },
    { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle2, done: shipment.status === 'DELIVERED' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={shipment.trackingNumber}
        subtitle={`Created ${formatTimeAgo(shipment.createdAt)}`}
        icon={Package}
        breadcrumb={[{ label: 'Shipments', href: '/admin/shipments' }, { label: shipment.trackingNumber }]}
        actions={
          <>
            <Button variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print Label
            </Button>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-5">Shipment Timeline</h3>
            <div className="space-y-1">
              {timeline.map((step, i) => (
                <motion.div
                  key={step.status}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      step.done
                        ? 'bg-emerald-500 text-white shadow-glow'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <step.icon className="w-5 h-5" />
                    </div>
                    {i < timeline.length - 1 && (
                      <div className={`w-0.5 h-12 ${step.done ? 'bg-emerald-500' : 'bg-border'}`} />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{step.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {step.done && shipment.statusHistory?.find((h: any) => h.status === step.status)
                            ? formatDateTime(shipment.statusHistory.find((h: any) => h.status === step.status).createdAt)
                            : 'Pending'}
                        </div>
                      </div>
                      {step.done && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Sender & Recipient */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Sender</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium">{shipment.senderName}</div>
                    <div className="text-xs text-muted-foreground">Sender</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span className="text-sm">{shipment.senderPhone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-sm">{shipment.senderAddress || shipment.senderCity?.name}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recipient</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium">{shipment.recipientName}</div>
                    <div className="text-xs text-muted-foreground">Recipient</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span className="text-sm">{shipment.recipientPhone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-sm">{shipment.recipientAddress}, {shipment.recipientCity?.name}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Status History */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Status History</h3>
            <div className="space-y-3">
              {(shipment.statusHistory || []).slice().reverse().map((h: any, i: number) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full mt-2 ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Status</h3>
              <StatusBadge status={shipment.status} size="md" />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Quick Update</div>
              <div className="grid grid-cols-2 gap-2">
                {['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'].map((s) => (
                  <Button
                    key={s}
                    variant={shipment.status === s ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => updateStatus(s)}
                    disabled={shipment.status === s}
                  >
                    {s.replace(/_/g, ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Pricing</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping Cost</span>
                <span className="font-medium">{formatCurrency(shipment.shippingCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">COD Amount</span>
                <span className="font-medium">{formatCurrency(shipment.codAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">COD Fee (2%)</span>
                <span className="font-medium">{formatCurrency(shipment.codFee)}</span>
              </div>
              <div className="pt-3 border-t flex justify-between">
                <span className="font-medium">Total</span>
                <span className="font-bold text-primary">{formatCurrency(shipment.totalCost)}</span>
              </div>
              <div className="pt-3 border-t flex justify-between items-center">
                <span className="text-muted-foreground">Payment Status</span>
                <StatusBadge status={shipment.paymentStatus} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Weight className="w-3.5 h-3.5" /> Weight</span>
                <span className="font-medium">{shipment.weight} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Pieces</span>
                <span className="font-medium">{shipment.pieces}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Service</span>
                <span className="font-medium">{shipment.serviceType}</span>
              </div>
              {shipment.driver && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Driver</span>
                  <span className="font-medium">{shipment.driver.user?.fullName || 'N/A'}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Created</span>
                <span className="font-medium text-xs">{formatDateTime(shipment.createdAt)}</span>
              </div>
              {shipment.deliveredAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Delivered</span>
                  <span className="font-medium text-xs">{formatDateTime(shipment.deliveredAt)}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
