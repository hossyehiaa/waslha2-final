'use client'

import { useEffect, useState } from 'react'
import { Copy, Plus, RefreshCw, Trash2, Webhook } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const EVENTS = ['shipment.created', 'shipment.status_changed', 'shipment.picked_up', 'shipment.in_transit', 'shipment.out_for_delivery', 'shipment.delivered', 'shipment.failed', 'shipment.returned', 'shipment.cancelled']
type Client = { id: string; companyName: string; username: string }
type WebhookItem = { id: string; url: string; name: string | null; description: string | null; events: string[]; secretPrefix: string; isActive: boolean; lastSuccessAt: string | null; lastFailureAt: string | null; deliveries: Array<{ id: string; event: string; status: string; responseStatus: number | null; attemptNumber: number; createdAt: string }> }

export default function AdminWebhooksPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [items, setItems] = useState<WebhookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [form, setForm] = useState({ url: '', name: '', description: '', events: ['shipment.created', 'shipment.status_changed'] })

  async function loadClients() {
    const response = await fetch('/api/admin/clients')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to load clients')
    const nextClients = (data.clients || []).map((client: Client) => ({ id: client.id, companyName: client.companyName, username: client.username }))
    setClients(nextClients)
    setClientId((current) => current || nextClients[0]?.id || '')
  }

  async function loadWebhooks(selectedClientId = clientId) {
    if (!selectedClientId) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/webhooks?clientId=${encodeURIComponent(selectedClientId)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load webhooks')
      setItems(data.webhooks || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load webhooks')
    } finally { setLoading(false) }
  }

  useEffect(() => { void loadClients().catch((error) => { toast.error(error instanceof Error ? error.message : 'Failed to load clients'); setLoading(false) }) }, [])
  useEffect(() => { if (clientId) void loadWebhooks(clientId) }, [clientId])
  function toggleEvent(event: string, checked: boolean) { setForm((current) => ({ ...current, events: checked ? [...current.events, event] : current.events.filter((item) => item !== event) })) }

  async function createWebhook() {
    const response = await fetch('/api/admin/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, clientId }) })
    const data = await response.json()
    if (!response.ok) { toast.error(data.error || 'Failed to create webhook'); return }
    setCreatedSecret(data.secret); setOpen(false); setForm({ url: '', name: '', description: '', events: ['shipment.created', 'shipment.status_changed'] }); toast.success('Webhook created'); void loadWebhooks(clientId)
  }
  async function disableWebhook(id: string) { const response = await fetch(`/api/admin/webhooks/${id}`, { method: 'DELETE' }); if (!response.ok) { toast.error('Failed to disable webhook'); return }; toast.success('Webhook disabled'); void loadWebhooks(clientId) }
  async function retry(id: string, deliveryId: string) { const response = await fetch(`/api/admin/webhooks/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryId }) }); if (!response.ok) { toast.error('Retry failed'); return }; toast.success('Retry queued'); void loadWebhooks(clientId) }

  return <div className="space-y-6">
    <PageHeader title="Webhooks" subtitle="Manage signed shipment lifecycle events for partner clients" icon={Webhook} actions={<Button onClick={() => setOpen(true)} disabled={!clientId}><Plus className="w-4 h-4 mr-2" />Create webhook</Button>} />
    <Card className="p-4"><Label htmlFor="webhook-client">Client account</Label><select id="webhook-client" value={clientId} onChange={(event) => setClientId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">No client accounts found</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.companyName} ({client.username})</option>)}</select></Card>
    {createdSecret && <Card className="p-5 border-amber-500 bg-amber-50 dark:bg-amber-950/30"><h3 className="font-semibold text-amber-700 dark:text-amber-300">Save this webhook secret now</h3><p className="text-sm text-muted-foreground mt-1 mb-3">It is shown only once and is required to verify HMAC signatures.</p><div className="flex gap-2"><code className="flex-1 p-3 rounded bg-background font-mono text-sm break-all">{createdSecret}</code><Button size="icon" onClick={() => void navigator.clipboard.writeText(createdSecret)}><Copy className="w-4 h-4" /></Button></div><Button variant="outline" className="mt-3" onClick={() => setCreatedSecret(null)}>I saved it</Button></Card>}
    {loading ? <Card className="h-32 animate-pulse" /> : items.length === 0 ? <Card className="p-12 text-center text-muted-foreground">No webhook endpoints have been configured for this client.</Card> : items.map((item) => <Card key={item.id} className="p-5 space-y-4"><div className="flex items-start gap-4"><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h3 className="font-semibold">{item.name || 'Webhook endpoint'}</h3><span className={item.isActive ? 'text-emerald-600 text-xs' : 'text-muted-foreground text-xs'}>{item.isActive ? 'Active' : 'Disabled'}</span></div><p className="font-mono text-sm break-all text-muted-foreground">{item.url}</p><p className="text-xs text-muted-foreground mt-1">Secret: {item.secretPrefix}... · Events: {item.events.join(', ')}</p></div><Button variant="ghost" size="icon" className="text-destructive" onClick={() => void disableWebhook(item.id)}><Trash2 className="w-4 h-4" /></Button></div><div className="flex items-center justify-between border-t pt-3"><span className="text-xs text-muted-foreground">Last success: {item.lastSuccessAt ? new Date(item.lastSuccessAt).toLocaleString() : 'Never'}</span>{item.deliveries?.some((delivery) => delivery.status !== 'SUCCESS') && <Button variant="outline" size="sm" onClick={() => { const delivery = item.deliveries.find((candidate) => candidate.status !== 'SUCCESS'); if (delivery) void retry(item.id, delivery.id) }}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Retry failed</Button>}</div></Card>)}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Create webhook endpoint</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Endpoint URL</Label><Input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://brand.example.com/webhooks/wsalhali" /></div><div><Label>Name</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Shopify integration" /></div><div><Label>Description</Label><Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div><div><Label>Events</Label><div className="grid grid-cols-1 gap-2 mt-2">{EVENTS.map((event) => <label key={event} className="flex items-center gap-2 text-sm"><Checkbox checked={form.events.includes(event)} onCheckedChange={(checked) => toggleEvent(event, checked === true)} />{event}</label>)}</div></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!form.url || !form.events.length || !clientId} onClick={() => void createWebhook()}>Create</Button></div></div></DialogContent></Dialog>
  </div>
}
