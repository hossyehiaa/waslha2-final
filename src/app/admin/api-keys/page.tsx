'use client'

import { useEffect, useState } from 'react'
import { Key, Plus, Trash2, Copy, Check, Code } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

type Client = { id: string; companyName: string; username: string }
type ApiKey = {
  id: string
  key: string
  name: string
  scopes: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

export default function AdminApiKeysPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [newKey, setNewKey] = useState({ name: '', scopes: 'shipments:read,shipments:write' })
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function loadClients() {
    const response = await fetch('/api/admin/clients')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to load clients')
    const nextClients = (data.clients || []).map((client: Client) => ({ id: client.id, companyName: client.companyName, username: client.username }))
    setClients(nextClients)
    setClientId((current) => current || nextClients[0]?.id || '')
  }

  async function loadKeys(selectedClientId = clientId) {
    if (!selectedClientId) { setKeys([]); setLoading(false); return }
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/api-keys?clientId=${encodeURIComponent(selectedClientId)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load API keys')
      setKeys(data.keys || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadClients().catch((error) => { toast.error(error instanceof Error ? error.message : 'Failed to load clients'); setLoading(false) })
  }, [])

  useEffect(() => { if (clientId) void loadKeys(clientId) }, [clientId])

  async function handleCreate() {
    if (!clientId || !newKey.name.trim()) return
    const response = await fetch('/api/admin/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newKey, clientId }),
    })
    const data = await response.json()
    if (!response.ok) { toast.error(data.error || 'Failed to create key'); return }
    setCreatedKey(data.key)
    setModalOpen(false)
    setNewKey({ name: '', scopes: 'shipments:read,shipments:write' })
    toast.success('API key created')
    void loadKeys(clientId)
  }

  async function handleDelete(id: string) {
    if (!confirm('Revoke this API key?')) return
    const response = await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' })
    if (!response.ok) { toast.error('Failed to revoke'); return }
    toast.success('Key revoked')
    void loadKeys(clientId)
  }

  function copyKey(key: string) {
    void navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        subtitle="Manage API keys for third-party integrations (Shopify, WooCommerce, etc.)"
        icon={Key}
        actions={<Button className="shadow-premium" onClick={() => setModalOpen(true)} disabled={!clientId}><Plus className="w-4 h-4 mr-2" />Generate Key</Button>}
      />
      <Card className="p-4">
        <Label htmlFor="api-key-client">Client account</Label>
        <select id="api-key-client" value={clientId} onChange={(event) => setClientId(event.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
          {clients.length === 0 && <option value="">No client accounts found</option>}
          {clients.map((client) => <option key={client.id} value={client.id}>{client.companyName} ({client.username})</option>)}
        </select>
      </Card>
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-start gap-4"><div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Code className="w-6 h-6" /></div><div className="flex-1"><h3 className="font-semibold mb-1">Partner API Endpoint</h3><p className="text-sm text-muted-foreground mb-2">Use this base URL with the selected client’s API key in the Authorization header:</p><div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 font-mono text-xs"><code className="flex-1">https://wsalhali.vercel.app/api/integrations/v1</code><Badge variant="secondary">v1</Badge></div><div className="mt-2 text-xs text-muted-foreground">Headers: <code className="px-1 py-0.5 rounded bg-muted">Authorization: Bearer wsl_... or X-API-Key: wsl_...</code></div></div></div>
      </Card>
      {createdKey && <Card className="p-6 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"><h3 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Save your API key now</h3><p className="text-sm text-muted-foreground mb-3">This is the only time you will see the full key. Copy it now.</p><div className="flex items-center gap-2"><code className="flex-1 p-3 rounded-lg bg-white dark:bg-black/30 font-mono text-sm break-all">{createdKey}</code><Button size="icon" onClick={() => copyKey(createdKey)}>{copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}</Button></div><Button variant="outline" className="mt-3" onClick={() => setCreatedKey(null)}>I have saved it</Button></Card>}
      <div className="space-y-3">
        {loading ? [...Array(2)].map((_, index) => <Card key={index} className="p-6 animate-pulse bg-muted/30 h-20" />) : keys.length === 0 ? <Card className="p-12 text-center text-muted-foreground"><Key className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No API keys found for this client.</p></Card> : keys.map((key) => <Card key={key.id} className="p-4 flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Key className="w-5 h-5" /></div><div className="flex-1 min-w-0"><div className="font-medium">{key.name}</div><div className="text-xs text-muted-foreground font-mono">{key.key}</div><div className="flex items-center gap-2 mt-1"><Badge variant="secondary" className="text-xs">{key.scopes}</Badge>{key.lastUsedAt && <span className="text-xs text-muted-foreground">Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>}</div></div><Button variant="ghost" size="icon" className="text-destructive" onClick={() => void handleDelete(key.id)}><Trash2 className="w-4 h-4" /></Button></Card>)}
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}><DialogContent><DialogHeader><DialogTitle>Generate New API Key</DialogTitle></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Key Name</Label><Input value={newKey.name} onChange={(event) => setNewKey({ ...newKey, name: event.target.value })} placeholder="e.g., Shopify Integration" /></div><div className="space-y-2"><Label>Scopes (comma-separated)</Label><Input value={newKey.scopes} onChange={(event) => setNewKey({ ...newKey, scopes: event.target.value })} /><p className="text-xs text-muted-foreground">Available: shipments:read, shipments:write</p></div><div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => void handleCreate()} disabled={!newKey.name.trim() || !clientId}>Generate</Button></div></div></DialogContent></Dialog>
    </div>
  )
}
