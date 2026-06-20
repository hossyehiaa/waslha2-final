'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PackageCheck, Save, X, ArrowRight, ArrowLeft } from 'lucide-react'
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

type Option = { id: string; name: string }

export default function NewShipmentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Option[]>([])
  const [cities, setCities] = useState<Option[]>([])
  const [branches, setBranches] = useState<Option[]>([])
  const [drivers, setDrivers] = useState<Option[]>([])

  const [form, setForm] = useState({
    clientId: '', senderName: '', senderPhone: '', senderAddress: '', senderCityId: '', fromBranchId: '',
    recipientName: '', recipientPhone: '', recipientAddress: '', recipientCityId: '', toBranchId: '',
    type: 'DELIVERY', serviceType: 'STANDARD', priority: 'NORMAL',
    weight: '0.5', pieces: '1', description: '',
    codAmount: '0', shippingCost: '25', driverId: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/clients').then(r => r.json()),
      fetch('/api/admin/cities').then(r => r.json()),
      fetch('/api/admin/branches').then(r => r.json()),
      fetch('/api/admin/drivers').then(r => r.json()),
    ]).then(([c, ci, b, d]) => {
      setClients(c.clients?.map((x: any) => ({ id: x.id, name: x.companyName })) || [])
      setCities(ci.cities?.map((x: any) => ({ id: x.id, name: x.name })) || [])
      setBranches(b.branches?.map((x: any) => ({ id: x.id, name: x.name })) || [])
      setDrivers(d.drivers?.map((x: any) => ({ id: x.id, name: `${x.user.fullName} (${x.driverCode})` })) || [])
    })
  }, [])

  function setField(k: string, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientId || !form.senderName || !form.senderPhone || !form.senderCityId ||
        !form.recipientName || !form.recipientPhone || !form.recipientAddress || !form.recipientCityId) {
      toast.error('Please fill all required fields')
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
        toast.error(data.error || 'Failed to create shipment')
        return
      }
      toast.success(`Shipment created: ${data.trackingNumber}`)
      router.push(`/admin/shipments/${data.shipment.id}`)
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Create Shipment"
        subtitle="Add a new shipment to the system"
        icon={PackageCheck}
        breadcrumb={[{ label: 'Shipments', href: '/admin/shipments' }, { label: 'New' }]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client & Type */}
        <Card className="p-6">
          <div className="mb-5">
            <h3 className="text-lg font-semibold">Shipment Details</h3>
            <p className="text-sm text-muted-foreground">Basic shipment information</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={form.clientId} onValueChange={(v) => setField('clientId', v)}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Shipment Type</Label>
              <Select value={form.type} onValueChange={(v) => setField('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DELIVERY">Delivery</SelectItem>
                  <SelectItem value="RETURN">Return</SelectItem>
                  <SelectItem value="EXCHANGE">Exchange</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={form.serviceType} onValueChange={(v) => setField('serviceType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">Standard (1-3 days)</SelectItem>
                  <SelectItem value="EXPRESS">Express (Same day)</SelectItem>
                  <SelectItem value="SAME_DAY">Same Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setField('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Sender */}
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Sender Information</h3>
                <p className="text-sm text-muted-foreground">Pickup details</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 flex items-center justify-center">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sender Name *</Label>
                <Input value={form.senderName} onChange={(e) => setField('senderName', e.target.value)} placeholder="e.g., ABC Store" required />
              </div>
              <div className="space-y-2">
                <Label>Sender Phone *</Label>
                <Input value={form.senderPhone} onChange={(e) => setField('senderPhone', e.target.value)} placeholder="+20 1XX XXX XXXX" required />
              </div>
              <div className="space-y-2">
                <Label>Sender City *</Label>
                <Select value={form.senderCityId} onValueChange={(v) => setField('senderCityId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sender Address</Label>
                <Textarea value={form.senderAddress} onChange={(e) => setField('senderAddress', e.target.value)} placeholder="Pickup address" rows={2} />
              </div>
              <div className="space-y-2">
                <Label>From Branch</Label>
                <Select value={form.fromBranchId} onValueChange={(v) => setField('fromBranchId', v)}>
                  <SelectTrigger><SelectValue placeholder="Auto-assigned" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Recipient */}
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Recipient Information</h3>
                <p className="text-sm text-muted-foreground">Delivery details</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient Name *</Label>
                <Input value={form.recipientName} onChange={(e) => setField('recipientName', e.target.value)} placeholder="Customer name" required />
              </div>
              <div className="space-y-2">
                <Label>Recipient Phone *</Label>
                <Input value={form.recipientPhone} onChange={(e) => setField('recipientPhone', e.target.value)} placeholder="+20 1XX XXX XXXX" required />
              </div>
              <div className="space-y-2">
                <Label>Recipient City *</Label>
                <Select value={form.recipientCityId} onValueChange={(v) => setField('recipientCityId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Recipient Address *</Label>
                <Textarea value={form.recipientAddress} onChange={(e) => setField('recipientAddress', e.target.value)} placeholder="Delivery address" rows={2} required />
              </div>
              <div className="space-y-2">
                <Label>To Branch</Label>
                <Select value={form.toBranchId} onValueChange={(v) => setField('toBranchId', v)}>
                  <SelectTrigger><SelectValue placeholder="Auto-assigned" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        {/* Package & Pricing */}
        <Card className="p-6">
          <div className="mb-5">
            <h3 className="text-lg font-semibold">Package & Pricing</h3>
            <p className="text-sm text-muted-foreground">Weight, COD amount, and fees</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.1" value={form.weight} onChange={(e) => setField('weight', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pieces</Label>
              <Input type="number" value={form.pieces} onChange={(e) => setField('pieces', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>COD Amount (EGP)</Label>
              <Input type="number" value={form.codAmount} onChange={(e) => setField('codAmount', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Shipping Cost (EGP)</Label>
              <Input type="number" value={form.shippingCost} onChange={(e) => setField('shippingCost', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assign Driver</Label>
              <Select value={form.driverId} onValueChange={(v) => setField('driverId', v)}>
                <SelectTrigger><SelectValue placeholder="Auto-assign" /></SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Package contents" />
            </div>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-muted/40 flex items-center justify-between text-sm">
            <div>
              <div className="text-muted-foreground">COD Fee (2%)</div>
              <div className="font-bold text-lg">{Math.round(Number(form.codAmount) * 0.02 * 100) / 100} EGP</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Cost</div>
              <div className="font-bold text-lg text-primary">
                {Number(form.shippingCost) + Math.round(Number(form.codAmount) * 0.02 * 100) / 100} EGP
              </div>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="shadow-premium">
            {loading ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-pulse" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Shipment
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
