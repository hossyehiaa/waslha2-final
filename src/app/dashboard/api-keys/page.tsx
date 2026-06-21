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
import { useLanguage } from '@/components/language-provider'

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
  const { dict } = useLanguage()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [newKey, setNewKey] = useState<{ name: string; scopes: string } | null>(null)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/api-keys')
      const data = await res.json()
      setKeys(data.keys || [])
    } catch {
      toast.error('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(name: string, scopes: string) {
    const res = await fetch('/api/admin/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, scopes }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Failed to create key')
      return
    }
    setCreatedKey(data.key)
    setModalOpen(false)
    toast.success('API key created')
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Revoke this API key?')) return
    const res = await fetch(`/api/admin/api-keys?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to revoke'); return }
    toast.success('Key revoked')
    load()
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        subtitle="Manage API keys for third-party integrations (Shopify, WooCommerce, etc.)"
        icon={Key}
        actions={
          <Button className="shadow-premium" onClick={() => { setNewKey({ name: '', scopes: 'shipments:read,shipments:write' }); setModalOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Generate Key
          </Button>
        }
      />

      {/* API Documentation Card */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Code className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Public API Endpoint</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Use this base URL with your API key in the Authorization header:
            </p>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 font-mono text-xs">
              <code className="flex-1">https://wsalhali.vercel.app/api/public</code>
              <Badge variant="secondary">POST/GET</Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Header: <code className="px-1 py-0.5 rounded bg-muted">Authorization: Bearer wsl_your_api_key</code>
            </div>
          </div>
        </div>
      </Card>

      {/* Created key display */}
      {createdKey && (
        <Card className="p-6 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30">
          <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2">⚠️ Save your API key now!</h3>
          <p className="text-sm text-muted-foreground mb-3">This is the only time you'll see the full key. Copy it now.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 rounded-lg bg-white dark:bg-black/30 font-mono text-sm break-all">
              {createdKey}
            </code>
            <Button size="icon" onClick={() => copyKey(createdKey)}>
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <Button variant="outline" className="mt-3" onClick={() => setCreatedKey(null)}>
            I've saved it
          </Button>
        </Card>
      )}

      {/* Keys list */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => <Card key={i} className="p-6 animate-pulse bg-muted/30 h-20" />)
        ) : keys.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No API keys yet. Generate one to get started.</p>
          </Card>
        ) : (
          keys.map((k) => (
            <Card key={k.id} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{k.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{k.key}...</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">{k.scopes}</Badge>
                  {k.lastUsedAt && (
                    <span className="text-xs text-muted-foreground">Last used: {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(k.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))
        )}
      </div>

      {/* Create modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
          </DialogHeader>
          {newKey && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Key Name</Label>
                <Input
                  value={newKey.name}
                  onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                  placeholder="e.g., Shopify Integration"
                />
              </div>
              <div className="space-y-2">
                <Label>Scopes (comma-separated)</Label>
                <Input
                  value={newKey.scopes}
                  onChange={(e) => setNewKey({ ...newKey, scopes: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Available: shipments:read, shipments:write</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button onClick={() => handleCreate(newKey.name, newKey.scopes)} disabled={!newKey.name}>
                  Generate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
