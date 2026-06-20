'use client'

import { useState, useEffect } from 'react'
import { User, Save, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react'
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
  const { user: authUser, refresh } = useAuth() as any
  const L = dict.pages.profile
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
  })
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => {
    if (authUser) {
      setForm({
        fullName: authUser.fullName || '',
        email: authUser.email || '',
        phone: authUser.phone || '',
      })
    }
  }, [authUser])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || dict.common.noData)
        return
      }
      toast.success(L.profileUpdated)
      refresh?.()
    } catch {
      toast.error(dict.common.networkError)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwd.newPassword !== pwd.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (pwd.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setChangingPassword(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || dict.common.noData)
        return
      }
      toast.success('Password changed successfully')
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      toast.error(dict.common.networkError)
    } finally {
      setChangingPassword(false)
    }
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
            <p className="text-sm text-muted-foreground">@{authUser?.username} • {authUser?.role}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{L.personalInfo}</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{L.fullName}</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
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
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPwd ? 'text' : 'password'}
                  value={pwd.currentPassword}
                  onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type={showPwd ? 'text' : 'password'}
                value={pwd.newPassword}
                onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <div className="flex gap-2">
                <Input
                  type={showPwd ? 'text' : 'password'}
                  value={pwd.confirmPassword}
                  onChange={(e) => setPwd({ ...pwd, confirmPassword: e.target.value })}
                  required
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setShowPwd(!showPwd)}>
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          <Button type="submit" disabled={changingPassword} variant="outline">
            {changingPassword ? dict.common.loading : L.changePassword}
          </Button>
        </form>
      </Card>
    </div>
  )
}
