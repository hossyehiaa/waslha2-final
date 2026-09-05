'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PackageCheck, Save, X, Send, ChevronDown, Sparkles, User, MapPin, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

type Option = { id: string; name: string }

export default function NewShipmentPage() {
  const router = useRouter()
  const { isRTL } = useLanguage()
  const t = (ar: string, en: string) => (isRTL ? ar : en)

  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Option[]>([])
  const [cities, setCities] = useState<Option[]>([])
  const [branches, setBranches] = useState<Option[]>([])
  const [drivers, setDrivers] = useState<Option[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [priceTouched, setPriceTouched] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null)

  const [form, setForm] = useState({
    clientId: '', senderName: '', senderPhone: '', senderAddress: '', senderCityId: '', fromBranchId: '',
    recipientName: '', recipientPhone: '', recipientAddress: '', recipientCityId: '', toBranchId: '',
    type: 'DELIVERY', serviceType: 'STANDARD', priority: 'NORMAL',
    weight: '0.5', pieces: '1', description: '',
    codAmount: '0', shippingCost: '', driverId: '',
    returnReason: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/clients').then(r => r.json()),
      fetch('/api/admin/cities').then(r => r.json()),
      fetch('/api/admin/branches').then(r => r.json()),
      fetch('/api/admin/drivers').then(r => r.json()),
    ]).then(([c, ci, b, d]) => {
      setClients(c.clients?.map((x: any) => ({ id: x.id, name: x.companyName })) || [])
      setCities(ci.cities?.map((x: any) => ({ id: x.id, name: x.governorate && x.governorate !== x.name ? `${x.governorate} - ${x.name}` : x.name })) || [])
      setBranches(b.branches?.map((x: any) => ({ id: x.id, name: x.name })) || [])
      setDrivers(d.drivers?.map((x: any) => ({ id: x.id, name: `${x.user.fullName} (${x.driverCode})` })) || [])
    })
  }, [])

  function setField(k: string, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  // ── Auto price suggestion: whenever route/service/weight changes and the
  // admin hasn't typed a manual price yet, fetch the suggested tariff price.
  const quoteAbort = useRef<AbortController | null>(null)
  const fetchSuggestion = useCallback(async () => {
    if (!form.senderCityId || !form.recipientCityId) return
    quoteAbort.current?.abort()
    const ctrl = new AbortController()
    quoteAbort.current = ctrl
    setSuggesting(true)
    try {
      const params = new URLSearchParams({
        senderCityId: form.senderCityId,
        recipientCityId: form.recipientCityId,
        serviceType: form.serviceType,
        priority: form.priority,
        weight: String(Number(form.weight) || 0.5),
      })
      const res = await fetch(`/api/admin/quote?${params}`, { signal: ctrl.signal })
      const data = await res.json()
      if (!res.ok) {
        setSuggestedPrice(null)
        return
      }
      setSuggestedPrice(data.shippingCost)
      if (!priceTouched) setField('shippingCost', String(data.shippingCost))
    } catch {
      /* aborted or network — ignore */
    } finally {
      if (quoteAbort.current === ctrl) setSuggesting(false)
    }
  }, [form.senderCityId, form.recipientCityId, form.serviceType, form.priority, form.weight, priceTouched])

  useEffect(() => {
    const id = setTimeout(fetchSuggestion, 250)
    return () => clearTimeout(id)
  }, [fetchSuggestion])

  function applySuggested() {
    if (suggestedPrice === null) return
    setPriceTouched(false)
    setField('shippingCost', String(suggestedPrice))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientId || !form.senderName || !form.senderPhone || !form.senderCityId ||
        !form.recipientName || !form.recipientPhone || !form.recipientAddress || !form.recipientCityId) {
      toast.error(t('املأ كل الحقول المطلوبة (المطلوبة فقط بعلامة *)', 'Please fill all required fields'))
      return
    }
    if (form.type === 'RETURN' && !form.returnReason.trim()) {
      toast.error(t('اكتب سبب الإرجاع', 'Return reason is required'))
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, shippingCost: form.shippingCost || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to create shipment')
        return
      }
      toast.success(`${t('تم إنشاء الشحنة', 'Shipment created')}: ${data.trackingNumber}`)
      router.push(`/admin/shipments/${data.shipment.id}`)
    } catch {
      toast.error(t('خطأ في الشبكة', 'Network error'))
    } finally {
      setLoading(false)
    }
  }

  const cod = Number(form.codAmount) || 0
  const ship = Number(form.shippingCost) || 0
  const total = ship + cod

  const field = 'space-y-1.5'
  const label = 'text-xs font-medium text-muted-foreground'

  return (
    <div className="space-y-4 max-w-6xl">
      <PageHeader
        title={t('إنشاء شحنة', 'Create Shipment')}
        subtitle={t('أضف شحنة جديدة في أقل من دقيقة', 'Add a new shipment in under a minute')}
        icon={PackageCheck}
        breadcrumb={[{ label: t('الشحنات', 'Shipments'), href: '/admin/shipments' }, { label: t('جديدة', 'New') }]}
      />

      <form onSubmit={handleSubmit} className="space-y-4 pb-24">
        {/* ── Row 1: Client & service (compact) ── */}
        <Card className="p-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div className={field}>
              <Label className={label}>{t('العميل *', 'Client *')}</Label>
              <Select value={form.clientId} onValueChange={(v) => setField('clientId', v)}>
                <SelectTrigger className="h-10"><SelectValue placeholder={t('اختر العميل', 'Select client')} /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className={field}>
              <Label className={label}>{t('نوع الشحنة', 'Type')}</Label>
              <Select value={form.type} onValueChange={(v) => setField('type', v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DELIVERY">{t('توصيل', 'Delivery')}</SelectItem>
                  <SelectItem value="RETURN">{t('مرتجع', 'Return')}</SelectItem>
                  <SelectItem value="EXCHANGE">{t('استبدال', 'Exchange')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={field}>
              <Label className={label}>{t('نوع الخدمة', 'Service')}</Label>
              <Select value={form.serviceType} onValueChange={(v) => setField('serviceType', v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">{t('عادي (1-3 أيام)', 'Standard (1-3 days)')}</SelectItem>
                  <SelectItem value="EXPRESS">{t('سريع (نفس اليوم)', 'Express (Same day)')}</SelectItem>
                  <SelectItem value="SAME_DAY">{t('في نفس اليوم', 'Same Day')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={field}>
              <Label className={label}>{t('الأولوية', 'Priority')}</Label>
              <Select value={form.priority} onValueChange={(v) => setField('priority', v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">{t('منخفضة', 'Low')}</SelectItem>
                  <SelectItem value="NORMAL">{t('عادية', 'Normal')}</SelectItem>
                  <SelectItem value="HIGH">{t('عالية', 'High')}</SelectItem>
                  <SelectItem value="URGENT">{t('عاجلة', 'Urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === 'RETURN' && (
              <div className={`${field} md:col-span-4`}>
                <Label className={label}>{t('سبب الإرجاع *', 'Return Reason *')}</Label>
                <Textarea
                  value={form.returnReason}
                  onChange={(e) => setField('returnReason', e.target.value)}
                  placeholder={t('مثال: العميل رفض الاستلام، عنوان خاطئ...', 'e.g., Customer refused...')}
                  rows={2}
                  required
                />
              </div>
            )}
          </div>
        </Card>

        {/* ── Row 2: Sender | Recipient side by side (compact) ── */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 flex items-center justify-center">
                <User className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold">{t('بيانات المُرسِل', 'Sender')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={field}>
                <Label className={label}>{t('الاسم *', 'Name *')}</Label>
                <Input className="h-10" value={form.senderName} onChange={(e) => setField('senderName', e.target.value)} placeholder={t('اسم المتجر', 'Store name')} required />
              </div>
              <div className={field}>
                <Label className={label}>{t('الهاتف *', 'Phone *')}</Label>
                <Input className="h-10" dir="ltr" value={form.senderPhone} onChange={(e) => setField('senderPhone', e.target.value)} placeholder="01xxxxxxxxx" required />
              </div>
              <div className={field}>
                <Label className={label}>{t('المدينة *', 'City *')}</Label>
                <Select value={form.senderCityId} onValueChange={(v) => setField('senderCityId', v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder={t('اختر', 'Select')} /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className={field}>
                <Label className={label}>{t('العنوان', 'Address')}</Label>
                <Input className="h-10" value={form.senderAddress} onChange={(e) => setField('senderAddress', e.target.value)} placeholder={t('عنوان الاستلام', 'Pickup address')} />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-semibold">{t('بيانات المُستَلِم', 'Recipient')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={field}>
                <Label className={label}>{t('الاسم *', 'Name *')}</Label>
                <Input className="h-10" value={form.recipientName} onChange={(e) => setField('recipientName', e.target.value)} placeholder={t('اسم العميل', 'Customer name')} required />
              </div>
              <div className={field}>
                <Label className={label}>{t('الهاتف *', 'Phone *')}</Label>
                <Input className="h-10" dir="ltr" value={form.recipientPhone} onChange={(e) => setField('recipientPhone', e.target.value)} placeholder="01xxxxxxxxx" required />
              </div>
              <div className={field}>
                <Label className={label}>{t('المدينة *', 'City *')}</Label>
                <Select value={form.recipientCityId} onValueChange={(v) => setField('recipientCityId', v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder={t('اختر', 'Select')} /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className={field}>
                <Label className={label}>{t('العنوان *', 'Address *')}</Label>
                <Input className="h-10" value={form.recipientAddress} onChange={(e) => setField('recipientAddress', e.target.value)} placeholder={t('عنوان التسليم', 'Delivery address')} required />
              </div>
            </div>
          </Card>
        </div>

        {/* ── Row 3: Package & pricing (compact) ── */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-semibold">{t('الشحنة والسعر', 'Package & Pricing')}</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={field}>
              <Label className={label}>{t('الوزن (كجم)', 'Weight (kg)')}</Label>
              <Input className="h-10" type="number" step="0.1" min="0.1" value={form.weight} onChange={(e) => setField('weight', e.target.value)} />
            </div>
            <div className={field}>
              <Label className={label}>{t('عدد القطع', 'Pieces')}</Label>
              <Input className="h-10" type="number" min="1" value={form.pieces} onChange={(e) => setField('pieces', e.target.value)} />
            </div>
            <div className={field}>
              <Label className={label}>{t('مبلغ التحصيل (ج.م)', 'COD Amount (EGP)')}</Label>
              <Input className="h-10" type="number" min="0" value={form.codAmount} onChange={(e) => setField('codAmount', e.target.value)} />
            </div>
            <div className={field}>
              <Label className={label}>
                {t('سعر الشحن (ج.م)', 'Shipping Cost (EGP)')}
                {suggestedPrice !== null && (
                  <button
                    type="button"
                    onClick={applySuggested}
                    className="ms-1.5 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                    title={t('اضغط لتطبيق السعر المقترح', 'Click to apply suggested price')}
                  >
                    <Sparkles className="w-3 h-3" />
                    {suggesting ? '...' : `${t('مقترح', 'suggest')} ${suggestedPrice}`}
                  </button>
                )}
              </Label>
              <Input
                className="h-10 font-semibold"
                type="number"
                min="0"
                step="0.5"
                value={form.shippingCost}
                onChange={(e) => { setPriceTouched(true); setField('shippingCost', e.target.value) }}
                placeholder={t('يُقترح تلقائياً بعد اختيار المدن', 'Auto-suggested after choosing cities')}
              />
            </div>
          </div>
        </Card>

        {/* ── Advanced options (collapsible) ── */}
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              {t('خيارات إضافية (اختياري): الفروع، المندوب، الوصف', 'Advanced options (optional): branches, driver, description')}
            </span>
            <span className="text-xs text-muted-foreground">{t('اختياري', 'Optional')}</span>
          </button>
          {showAdvanced && (
            <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-t pt-4">
              <div className={field}>
                <Label className={label}>{t('فرع الاستلام', 'From Branch')}</Label>
                <Select value={form.fromBranchId} onValueChange={(v) => setField('fromBranchId', v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder={t('تلقائي', 'Auto')} /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className={field}>
                <Label className={label}>{t('فرع التسليم', 'To Branch')}</Label>
                <Select value={form.toBranchId} onValueChange={(v) => setField('toBranchId', v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder={t('تلقائي', 'Auto')} /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className={field}>
                <Label className={label}>{t('تعيين مندوب', 'Assign Driver')}</Label>
                <Select value={form.driverId} onValueChange={(v) => setField('driverId', v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder={t('تلقائي', 'Auto')} /></SelectTrigger>
                  <SelectContent>
                    {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className={field}>
                <Label className={label}>{t('الوصف', 'Description')}</Label>
                <Input className="h-10" value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder={t('محتوى الطرد', 'Package contents')} />
              </div>
            </div>
          )}
        </Card>

        {/* ── Sticky summary bar ── */}
        <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-5 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">{t('سعر الشحن', 'Shipping')}</div>
                <div className="font-bold">{ship.toLocaleString()} {t('ج.م', 'EGP')}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('التحصيل', 'COD')}</div>
                <div className="font-bold">{cod.toLocaleString()} {t('ج.م', 'EGP')}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('الإجمالي', 'Total')}</div>
                <div className="font-bold text-primary text-lg">{total.toLocaleString()} {t('ج.م', 'EGP')}</div>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                <X className="w-4 h-4" />
                {t('إلغاء', 'Cancel')}
              </Button>
              <Button type="submit" disabled={loading} className="shadow-premium min-w-36">
                {loading ? (
                  <><Save className="w-4 h-4 animate-pulse" />{t('جاري الإنشاء...', 'Creating...')}</>
                ) : (
                  <><Send className="w-4 h-4" />{t('إنشاء الشحنة', 'Create Shipment')}</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
