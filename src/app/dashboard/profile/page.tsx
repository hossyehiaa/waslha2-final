'use client'

import { useState } from 'react'
import { User, Save, Mail, Phone } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/components/language-provider'
import { useAuth } from '@/components/auth-context'
import { toast } from 'sonner'

export default function ClientProfilePage() {
  const { dict } = useLanguage()
  const { user: authUser } = useAuth()
  const L = dict.pages.profile
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fullName: authUser?.fullName || '',
    email: authUser?.username || '',
    phone: '',
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    toast.success(L.profileUpdated)
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title={L.title} subtitle={L.subtitle} icon={User} />
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl font-bold">
            {authUser?.fullName?.[0] || 'U'}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{authUser?.fullName}</h2>
            <p className="text-sm text-muted-foreground">@{authUser?.username}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{L.personalInfo}</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{L.fullName}</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{L.username}</Label>
              <Input value={authUser?.username || ''} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label>{L.email}</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{L.phone}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+20 1XX XXX XXXX" />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="shadow-premium">
            <Save className="w-4 h-4 mr-2" />
            {saving ? dict.common.loading : L.saveChanges}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{L.security}</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
            <div>
              <div className="font-medium">{L.password}</div>
              <div className="text-xs text-muted-foreground">{L.lastChanged}</div>
            </div>
            <Button variant="outline">{L.changePassword}</Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
            <div>
              <div className="font-medium">{L.twoFactor}</div>
              <div className="text-xs text-muted-foreground">{L.twoFactorDesc}</div>
            </div>
            <Button variant="outline">{L.enable2fa}</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
