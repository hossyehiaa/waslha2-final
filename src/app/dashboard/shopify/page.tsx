'use client'

import { useEffect, useState } from 'react'
import { Store, ShieldCheck, Unplug, Save } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const initialForm = {
  shopDomain: '',
  accessToken: '',
  webhookSecret: '',
  senderName: '',
  senderPhone: '',
  senderAddress: '',
  senderCityId: '',
}

export default function ShopifyIntegrationPage() {
  const [form, setForm] = useState(initialForm)
  const [installation, setInstallation] = useState<any>(null)
  const [cities, setCities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/shopify/installation').then((response) => response.json()),
      fetch('/api/admin/cities').then((response) => response.json()),
    ]).then(([connection, cityData]) => {
      setInstallation(connection.installation || null)
      setCities(cityData.cities || [])
      if (connection.installation) {
        setForm((current) => ({
          ...current,
          shopDomain: connection.installation.shopDomain || '',
          senderName: connection.installation.senderName || '',
          senderPhone: connection.installation.senderPhone || '',
          senderAddress: connection.installation.senderAddress || '',
          senderCityId: connection.installation.senderCityId || '',
        }))
      }
    }).catch(() => toast.error('Unable to load Shopify connection'))
      .finally(() => setLoading(false))
  }, [])

  function setField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      const response = await fetch('/api/shopify/installation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Shopify connection failed')
      setInstallation(data.installation)
      setForm((current) => ({ ...current, accessToken: '', webhookSecret: '' }))
      toast.success('Shopify connected securely')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Shopify connection failed')
    } finally {
      setSaving(false)
    }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect Shopify and stop creating shipments from this store?')) return
    const response = await fetch('/api/shopify/installation', { method: 'DELETE' })
    if (!response.ok) { toast.error('Shopify disconnect failed'); return }
    setInstallation(null)
    setForm(initialForm)
    toast.success('Shopify disconnected')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Shopify Integration" subtitle="Create Wslahali shipments from new Shopify orders and sync delivery tracking" icon={Store} />
      <Card className="p-6 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Credentials are encrypted on the server and are never shown again after saving.</p>
            <p>For a new Shopify app, grant only the order and fulfillment scopes required by your Shopify plan, then copy the app access token and client secret here.</p>
          </div>
        </div>
      </Card>

      {installation && (
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{installation.shopDomain}</p>
              <p className="text-sm text-muted-foreground">Webhook: {installation.status === 'ACTIVE' ? 'orders/create active' : installation.status}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={installation.status === 'ACTIVE' ? 'default' : 'destructive'}>{installation.status}</Badge>
              <Button variant="outline" onClick={() => void disconnect()}><Unplug className="w-4 h-4 mr-2" />Disconnect</Button>
            </div>
          </div>
          {installation.lastError && <p className="text-sm text-destructive mt-3">Last sync issue: {installation.lastError}</p>}
        </Card>
      )}

      <Card className="p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold">{installation ? 'Update connection' : 'Connect a store'}</h2>
          <p className="text-sm text-muted-foreground">Use the permanent *.myshopify.com domain, not the storefront custom domain.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Shop domain</Label><Input value={form.shopDomain} onChange={(event) => setField('shopDomain', event.target.value)} placeholder="brand.myshopify.com" /></div>
          <div className="space-y-2"><Label>Admin API access token</Label><Input type="password" value={form.accessToken} onChange={(event) => setField('accessToken', event.target.value)} placeholder={installation ? 'Enter a new token to rotate' : 'Paste the Shopify token'} /></div>
          <div className="space-y-2"><Label>Shopify app client secret</Label><Input type="password" value={form.webhookSecret} onChange={(event) => setField('webhookSecret', event.target.value)} placeholder={installation ? 'Enter again to rotate' : 'Required for HMAC verification'} /></div>
        </div>
        <div className="border-t pt-5 space-y-4">
          <div><h3 className="font-semibold">Default pickup settings</h3><p className="text-sm text-muted-foreground">Every Shopify order uses these sender details. Recipient city comes from the order shipping address.</p></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Sender name</Label><Input value={form.senderName} onChange={(event) => setField('senderName', event.target.value)} /></div>
            <div className="space-y-2"><Label>Sender phone</Label><Input value={form.senderPhone} onChange={(event) => setField('senderPhone', event.target.value)} /></div>
            <div className="space-y-2"><Label>Sender city</Label><Select value={form.senderCityId} onValueChange={(value) => setField('senderCityId', value)}><SelectTrigger><SelectValue placeholder="Select a city" /></SelectTrigger><SelectContent>{cities.map((city) => <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Sender address</Label><Input value={form.senderAddress} onChange={(event) => setField('senderAddress', event.target.value)} /></div>
          </div>
        </div>
        <div className="flex justify-end"><Button onClick={() => void save()} disabled={loading || saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save and connect'}</Button></div>
      </Card>
    </div>
  )
}
