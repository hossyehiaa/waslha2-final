'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Save, X } from 'lucide-react'
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

export default function NewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [cities, setCities] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [form, setForm] = useState({
    username: '', email: '', fullName: '', phone: '', password: '',
    companyName: '', address: '', cityId: '', branchId: '',
    creditLimit: '100000', taxNumber: '', commercialReg: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/cities').then(r => r.json()),
      fetch('/api/admin/branches').then(r => r.json()),
    ]).then(([c, b]) => {
      setCities(c.cities || [])
      setBranches(b.branches || [])
    })
  }, [])

  function set(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.username || !form.companyName || !form.password) {
      toast.error('Username, company name, and password are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to create client')
        return
      }
      toast.success(`Client ${form.companyName} created successfully`)
      router.push('/admin/clients')
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Create Client"
        subtitle="Onboard a new merchant to the platform"
        icon={UserPlus}
        breadcrumb={[{ label: 'Clients', href: '/admin/clients' }, { label: 'New' }]}
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Account Credentials</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input value={form.username} onChange={(e) => set('username', e.target.value.toLowerCase())} placeholder="e.g., johndoe" required />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Set a secure password" required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="client@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+20 1XX XXX XXXX" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Company Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="e.g., ABC Store" required />
            </div>
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Primary contact person" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Select value={form.cityId} onValueChange={(v) => set('cityId', v)}>
                <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={form.branchId} onValueChange={(v) => set('branchId', v)}>
                <SelectTrigger><SelectValue placeholder="Assign branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Business address" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Tax Number</Label>
              <Input value={form.taxNumber} onChange={(e) => set('taxNumber', e.target.value)} placeholder="Tax ID" />
            </div>
            <div className="space-y-2">
              <Label>Commercial Registration</Label>
              <Input value={form.commercialReg} onChange={(e) => set('commercialReg', e.target.value)} placeholder="CR number" />
            </div>
            <div className="space-y-2">
              <Label>Credit Limit (EGP)</Label>
              <Input type="number" value={form.creditLimit} onChange={(e) => set('creditLimit', e.target.value)} />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}><X className="w-4 h-4 mr-2" />Cancel</Button>
          <Button type="submit" disabled={saving} className="shadow-premium">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Creating...' : 'Create Client'}
          </Button>
        </div>
      </form>
    </div>
  )
}
