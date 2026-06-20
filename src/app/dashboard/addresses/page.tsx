'use client'

import { useEffect, useState } from 'react'
import { MapPin, Plus, Trash2, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

type Address = {
  id: string
  label: string
  contactName: string
  phone: string
  cityId: string
  city: string | null
  address: string
  isDefault: boolean
}

export default function ClientAddressesPage() {
  const { dict } = useLanguage()
  const L = dict.pages.addresses
  const [addresses, setAddresses] = useState<Address[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ label: '', contactName: '', phone: '', cityId: '', address: '', isDefault: false })

  useEffect(() => {
    load()
    fetch('/api/admin/cities').then(r => r.json()).then(d => setCities(d.cities || []))
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/client/addresses')
      const data = await res.json()
      setAddresses(data.addresses || [])
    } catch {
      toast.error(dict.common.noData)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.label || !form.contactName || !form.phone || !form.cityId || !form.address) {
      toast.error(dict.common.required)
      return
    }
    try {
      const res = await fetch('/api/client/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || dict.common.noData)
        return
      }
      toast.success(L.saveAddress)
      setForm({ label: '', contactName: '', phone: '', cityId: '', address: '', isDefault: false })
      setOpen(false)
      load()
    } catch {
      toast.error(dict.common.networkError)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(dict.common.confirm)) return
    try {
      await fetch(`/api/client/addresses?id=${id}`, { method: 'DELETE' })
      toast.success(dict.common.delete)
      load()
    } catch {
      toast.error(dict.common.noData)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={L.title}
        subtitle={`${addresses.length} ${L.subtitle}`}
        icon={MapPin}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-premium"><Plus className="w-4 h-4 mr-2" />{L.addAddress}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{L.addNew}</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>{L.label}</Label>
                  <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>{L.contactName}</Label>
                  <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>{L.phone}</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>{L.city}</Label>
                  <Select value={form.cityId} onValueChange={(v) => setForm({ ...form, cityId: v })}>
                    <SelectTrigger><SelectValue placeholder={L.selectCity} /></SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{L.address}</Label>
                  <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} required />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="rounded" />
                  {L.setAsDefault}
                </label>
                <Button type="submit" className="w-full">{L.saveAddress}</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => <Card key={i} className="p-6 animate-pulse bg-muted/30 h-48" />)
        ) : addresses.length === 0 ? (
          <Card className="p-12 text-center md:col-span-2 lg:col-span-3">
            <MapPin className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{L.noSavedAddresses}</p>
          </Card>
        ) : (
          addresses.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5 hover:shadow-premium transition-all relative group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">{a.label}</div>
                      {a.isDefault && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-500" />
                          {L.default}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="font-medium">{a.contactName}</div>
                  <div className="text-xs text-muted-foreground">{a.phone}</div>
                  <div className="text-xs text-muted-foreground">{a.address}</div>
                  <div className="text-xs text-muted-foreground">{a.city}</div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
