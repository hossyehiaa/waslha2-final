'use client'

import { useEffect, useState } from 'react'
import { Settings, Save, Building2, DollarSign, Shield } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

export default function AdminSettingsPage() {
  const { dict } = useLanguage()
  const L = dict.pages.settings
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = {}
        (d.settings || []).forEach((s: any) => map[s.key] = s.value)
        setSettings(map)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      if (!res.ok) {
        toast.error(dict.common.noData)
        return
      }
      toast.success(L.settingsSaved)
    } catch {
      toast.error(dict.common.networkError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={L.title}
        subtitle={L.subtitle}
        icon={Settings}
        actions={<Button onClick={handleSave} disabled={saving} className="shadow-premium"><Save className="w-4 h-4 mr-2" />{saving ? L.saving : L.saveChanges}</Button>}
      />

      {loading ? (
        <Card className="p-12"><div className="animate-pulse space-y-4"><div className="h-6 bg-muted rounded w-1/3" /><div className="h-10 bg-muted rounded" /><div className="h-10 bg-muted rounded" /></div></Card>
      ) : (
        <>
          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{L.general}</h3>
                <p className="text-sm text-muted-foreground">{L.generalDesc}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{L.companyName}</Label>
                <Input value={settings.company_name || ''} onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{L.currency}</Label>
                <Input value={settings.currency || ''} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{L.timezone}</Label>
                <Input value={settings.timezone || ''} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{L.pricingConfig}</h3>
                <p className="text-sm text-muted-foreground">{L.pricingDesc}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{L.codFeePercent}</Label>
                <Input type="number" value={settings.cod_fee_percent || ''} onChange={(e) => setSettings({ ...settings, cod_fee_percent: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{L.insuranceFeePercent}</Label>
                <Input type="number" value={settings.insurance_fee_percent || ''} onChange={(e) => setSettings({ ...settings, insurance_fee_percent: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{L.maxCodAmount}</Label>
                <Input type="number" value={settings.max_cod_amount || ''} onChange={(e) => setSettings({ ...settings, max_cod_amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{L.minCodAmount}</Label>
                <Input type="number" value={settings.min_cod_amount || ''} onChange={(e) => setSettings({ ...settings, min_cod_amount: e.target.value })} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{L.security}</h3>
                <p className="text-sm text-muted-foreground">{L.securityDesc}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <div className="text-sm font-medium">{L.twoFactor}</div>
                  <div className="text-xs text-muted-foreground">{L.twoFactorDesc}</div>
                </div>
                <Button variant="outline" size="sm">{L.enable}</Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <div className="text-sm font-medium">{L.sessionTimeout}</div>
                  <div className="text-xs text-muted-foreground">{L.sessionTimeoutDesc}</div>
                </div>
                <Button variant="outline" size="sm">{L.configure}</Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <div className="text-sm font-medium">{L.ipWhitelist}</div>
                  <div className="text-xs text-muted-foreground">{L.ipWhitelistDesc}</div>
                </div>
                <Button variant="outline" size="sm">{L.configure}</Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
