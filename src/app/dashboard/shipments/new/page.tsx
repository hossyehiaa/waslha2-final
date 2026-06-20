'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PackageCheck, Save, X, ArrowRight, ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-context'
import { useLanguage } from '@/components/language-provider'

export default function ClientNewShipmentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { dict, isRTL } = useLanguage()
  const L = dict.pages.shipments.new
  const [loading, setLoading] = useState(false)
  const [cities, setCities] = useState<any[]>([])
  const [addresses, setAddresses] = useState<any[]>([])
  const [form, setForm] = useState({
    clientId: '', senderName: '', senderPhone: '', senderAddress: '', senderCityId: '',
    recipientName: '', recipientPhone: '', recipientAddress: '', recipientCityId: '',
    type: 'DELIVERY', serviceType: 'STANDARD', priority: 'NORMAL',
    weight: '0.5', pieces: '1', description: '',
    codAmount: '0', shippingCost: '25',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/cities').then(r => r.json()),
      fetch('/api/client/addresses').then(r => r.json()),
    ]).then(([c, a]) => {
      setCities(c.cities || [])
      setAddresses(a.addresses || [])
      const def = (a.addresses || []).find((x: any) => x.isDefault) || (a.addresses || [])[0]
      if (def) {
        setForm(prev => ({ ...prev, senderName: def.contactName, senderPhone: def.phone, senderAddress: def.address, senderCityId: def.cityId }))
      }
    })
  }, [])

  useEffect(() => {
    if (user?.clientId) setForm(prev => ({ ...prev, clientId: user.clientId }))
  }, [user])

  function set(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.recipientName || !form.recipientPhone || !form.recipientAddress || !form.recipientCityId) {
      toast.error(L.fillAllRequired)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || dict.common.noData)
        return
      }
      toast.success(`${L.createShipment}: ${data.trackingNumber}`)
      router.push('/dashboard/shipments')
    } catch {
      toast.error(dict.common.networkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={L.title}
        subtitle={L.subtitle}
        icon={PackageCheck}
        breadcrumb={[{ label: dict.nav.myShipments, href: '/dashboard/shipments' }, { label: dict.common.new }]}
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{L.serviceOptions}</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{L.serviceType}</Label>
              <Select value={form.serviceType} onValueChange={(v) => set('serviceType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">{L.standard}</SelectItem>
                  <SelectItem value="EXPRESS">{L.express}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{L.priority}</Label>
              <Select value={form.priority} onValueChange={(v) => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">{L.normal}</SelectItem>
                  <SelectItem value="HIGH">{L.high}</SelectItem>
                  <SelectItem value="URGENT">{L.urgent}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{L.shipmentType}</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DELIVERY">{L.delivery}</SelectItem>
                  <SelectItem value="RETURN">{L.return}</SelectItem>
                  <SelectItem value="EXCHANGE">{L.exchange}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="mb-5">
              <h3 className="text-lg font-semibold">{L.pickup}</h3>
              <p className="text-sm text-muted-foreground">{L.pickupDesc}</p>
            </div>
            <div className="space-y-4">
              {addresses.length > 0 && (
                <div className="space-y-2">
                  <Label>{L.useSavedAddress}</Label>
                  <Select onValueChange={(v) => {
                    const a = addresses.find(x => x.id === v)
                    if (a) setForm(prev => ({ ...prev, senderName: a.contactName, senderPhone: a.phone, senderAddress: a.address, senderCityId: a.cityId }))
                  }}>
                    <SelectTrigger><SelectValue placeholder={L.selectSavedAddress} /></SelectTrigger>
                    <SelectContent>
                      {addresses.map((a) => <SelectItem key={a.id} value={a.id}>{a.label} - {a.address}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>{L.senderName} *</Label>
                <Input value={form.senderName} onChange={(e) => set('senderName', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{L.senderPhone} *</Label>
                <Input value={form.senderPhone} onChange={(e) => set('senderPhone', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{L.senderCity} *</Label>
                <Select value={form.senderCityId} onValueChange={(v) => set('senderCityId', v)}>
                  <SelectTrigger><SelectValue placeholder={dict.pages.addresses.selectCity} /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{L.senderAddress}</Label>
                <Textarea value={form.senderAddress} onChange={(e) => set('senderAddress', e.target.value)} rows={2} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-5">
              <h3 className="text-lg font-semibold">{L.delivery2}</h3>
              <p className="text-sm text-muted-foreground">{L.deliveryDesc}</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{L.recipientName} *</Label>
                <Input value={form.recipientName} onChange={(e) => set('recipientName', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{L.recipientPhone} *</Label>
                <Input value={form.recipientPhone} onChange={(e) => set('recipientPhone', e.target.value)} placeholder="+20 1XX XXX XXXX" required />
              </div>
              <div className="space-y-2">
                <Label>{L.recipientCity} *</Label>
                <Select value={form.recipientCityId} onValueChange={(v) => set('recipientCityId', v)}>
                  <SelectTrigger><SelectValue placeholder={dict.pages.addresses.selectCity} /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{L.recipientAddress} *</Label>
                <Textarea value={form.recipientAddress} onChange={(e) => set('recipientAddress', e.target.value)} rows={2} required />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{L.packagePricing}</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{L.weight}</Label>
              <Input type="number" step="0.1" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{L.pieces}</Label>
              <Input type="number" value={form.pieces} onChange={(e) => set('pieces', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{L.codAmount}</Label>
              <Input type="number" value={form.codAmount} onChange={(e) => set('codAmount', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{L.description}</Label>
              <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={L.packageContents} />
            </div>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-muted/40 flex items-center justify-between text-sm">
            <div>
              <div className="text-muted-foreground">{L.codFee2}</div>
              <div className="font-bold">{Math.round(Number(form.codAmount) * 0.02 * 100) / 100} {dict.common.currency}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{dict.common.total}</div>
              <div className="font-bold text-primary text-lg">
                {Number(form.serviceType === 'EXPRESS' ? 50 : 25) + Math.round(Number(form.codAmount) * 0.02 * 100) / 100} {dict.common.currency}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}><X className="w-4 h-4 mr-2" />{dict.common.cancel}</Button>
          <Button type="submit" disabled={loading} className="shadow-premium">
            <Save className="w-4 h-4 mr-2" />{loading ? dict.common.loading : L.createShipment}
          </Button>
        </div>
      </form>
    </div>
  )
}
