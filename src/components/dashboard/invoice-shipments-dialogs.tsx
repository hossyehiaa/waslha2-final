'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilePlus2, Loader2, Search, Package } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { cn } from '@/lib/utils'

type ClientSummary = { id: string; companyName: string }

type Shipment = {
  id: string
  trackingNumber: string
  senderCity?: string
  recipientCity?: string
  route?: string
  codAmount: number
  shippingCost: number
}

/**
 * Dialog for creating a new invoice by selecting a client's uninvoiced orders.
 * The invoice total = sum(shippingCost + codFee) of selected shipments.
 */
export function CreateInvoiceDialog({
  open,
  onOpenChange,
  clients,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  clients: ClientSummary[]
  onCreated?: () => void
}) {
  const { isRTL } = useLanguage()
  const [clientId, setClientId] = useState('')
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!open) {
      setClientId(''); setShipments([]); setSearch(''); setSelected([])
      return
    }
  }, [open])

  useEffect(() => {
    if (!clientId) { setShipments([]); return }
    setLoading(true)
    fetch(`/api/shipments?clientId=${clientId}&uninvoiced=1&limit=100`)
      .then(r => r.json())
      .then(d => setShipments(d.shipments || []))
      .catch(() => toast.error(isRTL ? 'فشل تحميل الشحنات' : 'Failed to load shipments'))
      .finally(() => setLoading(false))
  }, [clientId, isRTL])

  const filtered = useMemo(() => {
    if (!search) return shipments
    const q = search.toLowerCase()
    return shipments.filter(s =>
      s.trackingNumber.toLowerCase().includes(q) ||
      s.senderCity.toLowerCase().includes(q) ||
      s.recipientCity.toLowerCase().includes(q)
    )
  }, [shipments, search])

  const selectedShipments = shipments.filter(s => selected.includes(s.id))
  const total = selectedShipments.reduce((sum, s) => sum + (s.shippingCost || 0), 0)

  function toggleAll() {
    if (filtered.length > 0 && filtered.every(s => selected.includes(s.id))) {
      setSelected(prev => prev.filter(id => !filtered.map(s => s.id).includes(id)))
    } else {
      setSelected(prev => Array.from(new Set([...prev, ...filtered.map(s => s.id)])))
    }
  }

  async function create() {
    if (!clientId || selected.length === 0) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, shipmentIds: selected }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || (isRTL ? 'فشل الإنشاء' : 'Failed')); return }
      toast.success(isRTL ? `تم إنشاء فاتورة ${d.invoiceNumber} بـ ${d.shipmentCount} أوردر` : `Created invoice ${d.invoiceNumber} with ${d.shipmentCount} order(s)`)
      onOpenChange(false)
      onCreated?.()
    } catch {
      toast.error(isRTL ? 'خطأ في الشبكة' : 'Network error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="w-4 h-4 text-primary" />
            {isRTL ? 'فاتورة جديدة من أوردرات' : 'New invoice from orders'}
          </DialogTitle>
          <DialogDescription>
            {isRTL ? 'اختر العميل ثم الأوردرات — الإجمالي = مجموع رسوم الشحن' : 'Pick the client then the orders — total = sum of shipping fees'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{isRTL ? 'العميل' : 'Client'} *</Label>
            <Select value={clientId} onValueChange={(v) => { setClientId(v); setSelected([]) }}>
              <SelectTrigger><SelectValue placeholder={isRTL ? 'اختر العميل' : 'Choose client'} /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {clientId && (
            <>
              <div className="relative">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isRTL ? 'بحث برقم التتبع أو المدينة...' : 'Search tracking # or city...'}
                  className={`h-9 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {isRTL ? `${shipments.length} أوردر متاح` : `${shipments.length} order(s) available`}
                </span>
                {filtered.length > 0 && (
                  <button onClick={toggleAll} className="text-primary hover:underline">
                    {filtered.every(s => selected.includes(s.id)) ? (isRTL ? 'إلغاء تحديد الكل' : 'Clear all') : (isRTL ? 'تحديد الكل' : 'Select all')}
                  </button>
                )}
              </div>
              <ScrollArea className="h-[280px] rounded-xl border">
                {loading ? (
                  <div className="p-3 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{isRTL ? 'لا توجد أوردرات غير مفوترة لهذا العميل' : 'No uninvoiced orders for this client'}</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filtered.map(s => {
                      const checked = selected.includes(s.id)
                      return (
                        <label key={s.id} className="flex items-center gap-3 p-3 hover:bg-accent/40 cursor-pointer">
                          <Checkbox checked={checked} onCheckedChange={() => setSelected(prev => checked ? prev.filter(x => x !== s.id) : [...prev, s.id])} />
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs font-medium truncate">{s.trackingNumber}</div>
                            <div className="text-xs text-muted-foreground">{s.senderCity} → {s.recipientCity}</div>
                          </div>
                          <div className="text-xs font-bold text-amber-600 whitespace-nowrap">
                            {formatCurrency(s.shippingCost + s.codAmount)}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm">
            <span className="text-muted-foreground">{isRTL ? 'محدد:' : 'Selected:'} </span>
            <span className="font-bold mx-1">{selected.length}</span>
            <span className="text-muted-foreground">{isRTL ? 'أوردر بإجمالي' : 'orders • total'}</span>
            <span className="font-bold text-emerald-600 mx-1">{formatCurrency(total)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={create} disabled={!clientId || selected.length === 0 || creating} className="shadow-premium">
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isRTL ? 'إنشاء الفاتورة' : 'Create invoice'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Edit which orders are inside an existing invoice.
 * Body: two lists — current shipments (with remove checkbox) + available shipments (with add checkbox).
 */
export function EditInvoiceShipmentsDialog({
  open,
  onOpenChange,
  invoiceId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  invoiceId: string | null
  onSaved?: () => void
}) {
  const { isRTL } = useLanguage()
  const [current, setCurrent] = useState<Shipment[]>([])
  const [available, setAvailable] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removeSet, setRemoveSet] = useState<string[]>([])
  const [addSet, setAddSet] = useState<string[]>([])

  useEffect(() => {
    if (!open || !invoiceId) return
    setLoading(true); setRemoveSet([]); setAddSet([])
    fetch(`/api/admin/invoices/${invoiceId}`)
      .then(r => r.json())
      .then(d => {
        setCurrent((d.invoice?.shipments || []).map((s: any) => ({
          id: s.id, trackingNumber: s.trackingNumber, route: s.route || '',
          senderCity: '', recipientCity: '', codAmount: s.codAmount, shippingCost: s.shippingCost,
        })))
        const cid = d.invoice?.clientId
        if (cid) {
          return fetch(`/api/shipments?clientId=${cid}&uninvoiced=1&limit=100`).then(r => r.json())
        }
        return { shipments: [] }
      })
      .then(d => setAvailable((d.shipments || []).map((s: any) => ({
        id: s.id, trackingNumber: s.trackingNumber,
        route: `${s.senderCity || ''} → ${s.recipientCity || ''}`,
        senderCity: s.senderCity, recipientCity: s.recipientCity,
        codAmount: s.codAmount, shippingCost: s.shippingCost,
      }))))
      .catch(() => toast.error(isRTL ? 'فشل التحميل' : 'Failed'))
      .finally(() => setLoading(false))
  }, [open, invoiceId, isRTL])

  async function save() {
    if (!invoiceId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addShipmentIds: addSet, removeShipmentIds: removeSet }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || (isRTL ? 'فشل الحفظ' : 'Failed')); return }
      toast.success(isRTL ? `تم تحديث الفاتورة — أُضيف ${d.added} وأُزيل ${d.removed}` : `Invoice updated — added ${d.added}, removed ${d.removed}`)
      onOpenChange(false)
      onSaved?.()
    } catch {
      toast.error(isRTL ? 'خطأ في الشبكة' : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            {isRTL ? 'تحرير أوردرات الفاتورة' : 'Edit invoice orders'}
          </DialogTitle>
          <DialogDescription>
            {isRTL ? 'أضف أو أزِل الأوردر من الفاتورة — الإجمالي يُعاد حسابه تلقائياً' : 'Add or remove orders — total recomputed automatically'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Current (in invoice) */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground">
              {isRTL ? `بداخل الفاتورة (${current.length})` : `In invoice (${current.length})`}
            </div>
            <ScrollArea className="h-[300px] rounded-xl border">
              {loading ? (
                <div className="p-3 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : current.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">{isRTL ? 'لا توجد أوردرات بعد' : 'No orders yet'}</div>
              ) : (
                <div className="divide-y">
                  {current.map(s => {
                    const checked = removeSet.includes(s.id)
                    return (
                      <label key={s.id} className={cn('flex items-center gap-2 p-2.5 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/20', checked && 'opacity-60')}>
                        <Checkbox checked={checked} onCheckedChange={() => setRemoveSet(prev => checked ? prev.filter(x => x !== s.id) : [...prev, s.id])} />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs font-medium truncate">{s.trackingNumber}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.route}</div>
                        </div>
                        <div className="text-xs font-bold whitespace-nowrap">{formatCurrency(s.shippingCost + s.codAmount)}</div>
                      </label>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
            <p className="text-xs text-rose-600">{isRTL ? 'علّم لإزالته من الفاتورة' : 'Check to remove from invoice'}</p>
          </div>

          {/* Available */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground">
              {isRTL ? `أوردرات متاحة (${available.length})` : `Available (${available.length})`}
            </div>
            <ScrollArea className="h-[300px] rounded-xl border">
              {loading ? (
                <div className="p-3 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : available.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">{isRTL ? 'لا توجد أوردرات غير مفوترة' : 'No uninvoiced orders'}</div>
              ) : (
                <div className="divide-y">
                  {available.map(s => {
                    const checked = addSet.includes(s.id)
                    return (
                      <label key={s.id} className={cn('flex items-center gap-2 p-2.5 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20', checked && 'opacity-100')}>
                        <Checkbox checked={checked} onCheckedChange={() => setAddSet(prev => checked ? prev.filter(x => x !== s.id) : [...prev, s.id])} />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs font-medium truncate">{s.trackingNumber}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.route}</div>
                        </div>
                        <div className="text-xs font-bold whitespace-nowrap">{formatCurrency(s.shippingCost + s.codAmount)}</div>
                      </label>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
            <p className="text-xs text-emerald-600">{isRTL ? 'علّم لإضافته للفاتورة' : 'Check to add to invoice'}</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {isRTL ? 'تغييرات:' : 'Changes:'} <span className="text-emerald-600 font-bold">+{addSet.length}</span> <span className="text-rose-600 font-bold">-{removeSet.length}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={save} disabled={(addSet.length === 0 && removeSet.length === 0) || saving} className="shadow-premium">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isRTL ? 'حفظ التغييرات' : 'Save changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
