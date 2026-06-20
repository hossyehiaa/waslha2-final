'use client'

import { User, Save, Mail, Phone, MapPin, Building2 } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/components/auth-context'
import { toast } from 'sonner'

export default function ClientProfilePage() {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.username || '',
    phone: '',
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    toast.success('Profile updated successfully')
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="My Profile" subtitle="Manage your account information" icon={User} />
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl font-bold">
            {user?.fullName?.[0] || 'U'}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{user?.fullName}</h2>
            <p className="text-sm text-muted-foreground">Client Account • @{user?.username}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={user?.username || ''} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+20 1XX XXX XXXX" />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="shadow-premium">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Security</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
            <div>
              <div className="font-medium">Password</div>
              <div className="text-xs text-muted-foreground">Last changed 30 days ago</div>
            </div>
            <Button variant="outline">Change Password</Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
            <div>
              <div className="font-medium">Two-Factor Authentication</div>
              <div className="text-xs text-muted-foreground">Add an extra layer of security</div>
            </div>
            <Button variant="outline">Enable 2FA</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
