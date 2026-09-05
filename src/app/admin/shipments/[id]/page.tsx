'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Package, MapPin, User, Phone, Weight, ArrowRight,
  Truck, Wallet, Clock, CheckCircle2, Printer, Edit,
  Save, Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDateTime, formatTimeAgo } from '@/lib/format'
import { useLanguage } from '@/components/language-provider'
import { toast } from 'sonner'

// City display: "governorate - city" (e.g. الجيزة - ٦ أكتوبر)
function cityLabel(city: { name: string; governorate?: string | null } | null | undefined): string {
  if (!city) return '-'
  return city.governorate && city.governorate !== city.name
    ? `${city.governorate} - ${city.name}`
    : city.name
}

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { isRTL } = useLanguage()
  const t = (ar: string, en: string) => (isRTL ? ar : en)
  const [shipment, setShipment] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cities, setCities] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)

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

  // ── Print: single shipping label (same layout as bulk print) ──
  function handlePrint() {
    if (!shipment) return
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      toast.error(t('اسمح بالنوافذ المنبثقة للطباعة', 'Please allow popups to print labels'))
      return
    }

    const from = cityLabel(shipment.senderCity)
    const to = cityLabel(shipment.recipientCity)

    // Simple SVG barcode pattern from the tracking number characters
    let bars = ''
    const tn = String(shipment.trackingNumber)
    for (let i = 0; i < tn.length; i++) {
      const pattern = (tn.charCodeAt(i) % 8).toString(2).padStart(3, '0')
      for (let j = 0; j < 3; j++) {
        const width = pattern[j] === '1' ? 3 : 1
        if (j % 2 === 0) bars += `<rect x="${i * 12 + j * 4}" y="0" width="${width}" height="40" fill="black"/>`
      }
    }
    const barcode = `<svg xmlns="http://www.w3.org/2000/svg" width="${tn.length * 12}" height="40" viewBox="0 0 ${tn.length * 12} 40">${bars}</svg>`

    printWindow.document.write(`
      <html>
        <head>
          <title>Label - ${shipment.trackingNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .label {
              border: 2px solid #000; padding: 16px; margin: 0 auto;
              width: 4in; height: 6in; display: flex; flex-direction: column;
            }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
            .logo { font-size: 24px; font-weight: bold; color: #0d9488; }
            .tracking { font-size: 14px; font-family: monospace; font-weight: bold; }
            .barcode { text-align: center; margin: 12px 0; }
            .barcode svg { max-width: 100%; height: 60px; }
            .tracking-text { text-align: center; font-family: monospace; font-size: 18px; font-weight: bold; margin-bottom: 12px; letter-spacing: 3px; }
            .info { flex: 1; }
            .row { font-size: 13px; margin-bottom: 4px; padding: 2px 0; border-bottom: 1px dotted #ccc; }
            .row span { font-weight: bold; display: inline-block; width: 84px; }
            .row.cod { font-size: 16px; font-weight: bold; background: #fef3c7; padding: 4px; margin-top: 8px; }
            .client { margin-top: 12px; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 8px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">
              <div class="logo">Wslahali</div>
              <div class="tracking">${shipment.trackingNumber}</div>
            </div>
            <div class="barcode">${barcode}</div>
            <div class="tracking-text">${shipment.trackingNumber}</div>
            <div class="info">
              <div class="row"><span>From:</span> ${from}</div>
              <div class="row"><span>To:</span> ${to}</div>
              <div class="row"><span>Sender:</span> ${shipment.senderName || '-'}</div>
              <div class="row"><span>Phone:</span> ${shipment.senderPhone || '-'}</div>
              <div class="row"><span>Recipient:</span> ${shipment.recipientName}</div>
              <div class="row"><span>Phone:</span> ${shipment.recipientPhone}</div>
              <div class="row"><span>Address:</span> ${shipment.recipientAddress || '-'}</div>
              <div class="row"><span>Weight:</span> ${shipment.weight} kg</div>
              <div class="row"><span>Pieces:</span> ${shipment.pieces}</div>
              <div class="row cod"><span>COD:</span> ${shipment.codAmount} EGP</div>
            </div>
            <div class="client">Client: ${shipment.client?.companyName || '-'}</div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 400)
  }

  // ── Edit dialog ──
  async function openEdit() {
    if (!shipment) return
    // Load cities & drivers once (governorate shown in the dropdown labels)
    if (cities.length === 0) {
      try {
        const [c, d] = await Promise.all([
          fetch('/api/admin/cities').then(r => r.json()),
          fetch('/api/admin/drivers').then(r => r.json()),
        ])
        setCities(c.cities || [])
        setDrivers(d.drivers || [])
      } catch {
        toast.error(t('فشل تحميل البيانات', 'Failed to load data'))
        return
      }
    }
    setEdit({
      senderName: shipment.senderName || '',
      senderPhone: shipment.senderPhone || '',
      senderAddress: shipment.senderAddress || '',
      senderCityId: shipment.senderCityId || '',
      recipientName: shipment.recipientName || '',
      recipientPhone: shipment.recipientPhone || '',
      recipientAddress: shipment.recipientAddress || '',
      recipientCityId: shipment.recipientCityId || '',
      weight: String(shipment.weight ?? ''),
      pieces: String(shipment.pieces ?? ''),
      codAmount: String(shipment.codAmount ?? ''),
      description: shipment.description || '',
      priority: shipment.priority || 'NORMAL',
      driverId: shipment.driverId || '',
    })
    setEditOpen(true)
  }

  function setEditField(k: string, v: string) {
    setEdit((prev: any) => ({ ...prev, [k]: v }))
  }

  async function saveEdit() {
    if (!edit) return
    setSaving(true)
    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: edit.senderName,
          senderPhone: edit.senderPhone,
          senderAddress: edit.senderAddress,
          senderCityId: edit.senderCityId || undefined,
          recipientName: edit.recipientName,
          recipientPhone: edit.recipientPhone,
          recipientAddress: edit.recipientAddress,
          recipientCityId: edit.recipientCityId || undefined,
          weight: Number(edit.weight) || undefined,
          pieces: Number(edit.pieces) || undefined,
          codAmount: Number(edit.codAmount) || 0,
          description: edit.description || undefined,
          priority: edit.priority,
          driverId: edit.driverId || undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error || t('فشل حفظ التعديلات', 'Failed to save changes'))
        return
      }
      toast.success(t('تم حفظ التعديلات', 'Changes saved successfully'))
      setEditOpen(false)
      // Reload full shipment with city/governorate data
      const fresh = await fetch(`/api/shipments/${id}`).then(r => r.json())
      setShipment(fresh.shipment || fresh)
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
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

  const cityOption = (c: any) => (
    c.governorate && c.governorate !== c.name ? `${c.governorate} - ${c.name}` : c.name
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={shipment.trackingNumber}
        subtitle={`Created ${formatTimeAgo(shipment.createdAt)}`}
        icon={Package}
        breadcrumb={[{ label: 'Shipments', href: '/admin/shipments' }, { label: shipment.trackingNumber }]}
        actions={
          <>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              {t('طباعة الليبل', 'Print Label')}
            </Button>
            <Button variant="outline" onClick={openEdit}>
              <Edit className="w-4 h-4 mr-2" />
              {t('تعديل', 'Edit')}
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
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('المرسل', 'Sender')}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium">{shipment.senderName}</div>
                    <div className="text-xs text-muted-foreground">{t('المرسل', 'Sender')}</div>
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
                  <span className="text-sm">
                    {cityLabel(shipment.senderCity)}{shipment.senderAddress ? ` — ${shipment.senderAddress}` : ''}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('المستلم', 'Recipient')}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium">{shipment.recipientName}</div>
                    <div className="text-xs text-muted-foreground">{t('المستلم', 'Recipient')}</div>
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
                  <span className="text-sm">
                    {shipment.recipientAddress ? `${shipment.recipientAddress} — ` : ''}{cityLabel(shipment.recipientCity)}
                  </span>
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
                {['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'FAILED', 'CANCELLED'].map((s) => (
                  <Button
                    key={s}
                    variant={shipment.status === s ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs ${s === 'CANCELLED' || s === 'FAILED' ? 'text-destructive border-destructive/40 hover:bg-destructive/5' : ''}`}
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

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('تعديل الشحنة', 'Edit Shipment')} — {shipment.trackingNumber}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-5">
              {/* Sender */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-emerald-600 dark:text-emerald-400">{t('بيانات المرسل', 'Sender')}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t('الاسم', 'Name')}</Label>
                    <Input value={edit.senderName} onChange={(e) => setEditField('senderName', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('الهاتف', 'Phone')}</Label>
                    <Input value={edit.senderPhone} onChange={(e) => setEditField('senderPhone', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('المحافظة - المدينة', 'Governorate - City')}</Label>
                    <Select value={edit.senderCityId} onValueChange={(v) => setEditField('senderCityId', v)}>
                      <SelectTrigger><SelectValue placeholder={t('اختر', 'Select...')} /></SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{cityOption(c)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('العنوان', 'Address')}</Label>
                    <Input value={edit.senderAddress} onChange={(e) => setEditField('senderAddress', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Recipient */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-purple-600 dark:text-purple-400">{t('بيانات المستلم', 'Recipient')}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t('الاسم', 'Name')}</Label>
                    <Input value={edit.recipientName} onChange={(e) => setEditField('recipientName', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('الهاتف', 'Phone')}</Label>
                    <Input value={edit.recipientPhone} onChange={(e) => setEditField('recipientPhone', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('المحافظة - المدينة', 'Governorate - City')}</Label>
                    <Select value={edit.recipientCityId} onValueChange={(v) => setEditField('recipientCityId', v)}>
                      <SelectTrigger><SelectValue placeholder={t('اختر', 'Select...')} /></SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{cityOption(c)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('العنوان', 'Address')}</Label>
                    <Input value={edit.recipientAddress} onChange={(e) => setEditField('recipientAddress', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Shipment details */}
              <div>
                <h4 className="text-sm font-semibold mb-3">{t('تفاصيل الشحنة', 'Shipment Details')}</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t('الوزن (كجم)', 'Weight (kg)')}</Label>
                    <Input type="number" step="0.1" min="0.1" value={edit.weight} onChange={(e) => setEditField('weight', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('القطع', 'Pieces')}</Label>
                    <Input type="number" min="1" value={edit.pieces} onChange={(e) => setEditField('pieces', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('المبلغ COD', 'COD Amount')}</Label>
                    <Input type="number" min="0" value={edit.codAmount} onChange={(e) => setEditField('codAmount', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('الأولوية', 'Priority')}</Label>
                    <Select value={edit.priority} onValueChange={(v) => setEditField('priority', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMAL">{t('عادي', 'Normal')}</SelectItem>
                        <SelectItem value="HIGH">{t('عالي', 'High')}</SelectItem>
                        <SelectItem value="URGENT">{t('عاجل', 'Urgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>{t('المندوب', 'Driver')}</Label>
                    <Select value={edit.driverId || 'none'} onValueChange={(v) => setEditField('driverId', v === 'none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder={t('بدون', 'None')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('بدون مندوب', 'No driver')}</SelectItem>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.user?.fullName} ({d.driverCode})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-3">
                    <Label>{t('الوصف / محتوى الطرد', 'Description')}</Label>
                    <Input value={edit.description} onChange={(e) => setEditField('description', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
                <Button onClick={saveEdit} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {t('حفظ التعديلات', 'Save Changes')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
