'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Plus } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

type Pricing = {
  id: string
  name: string
  serviceType: string
  baseWeight: number
  basePrice: number
  perKgPrice: number
  codFeePercent: number
  insuranceFeePercent: number
  status: string
}

export default function AdminPricingPage() {
  const { dict } = useLanguage()
  const L = dict.pages.pricing
  const [rules, setRules] = useState<Pricing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/pricing')
      .then(r => r.json())
      .then(d => setRules(d.rules || []))
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [dict])

  return (
    <div className="space-y-6">
      <PageHeader title={L.title} subtitle={L.subtitle} icon={CreditCard} actions={<Button className="shadow-premium"><Plus className="w-4 h-4 mr-2" />{L.newRule}</Button>} />
      <div className="grid md:grid-cols-2 gap-4">
        {(loading ? [...Array(2)] : rules).map((r, i) => (
          <Card key={r?.id || i} className="p-6">
            {r ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.serviceType}</div>
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-xs text-muted-foreground">{L.basePrice}</div>
                    <div className="font-bold text-lg">{formatCurrency(r.basePrice)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.baseWeight} {L.kgIncluded}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-xs text-muted-foreground">{L.perKg}</div>
                    <div className="font-bold text-lg">{formatCurrency(r.perKgPrice)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{L.additionalWeight}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-xs text-muted-foreground">{L.codFee}</div>
                    <div className="font-bold text-lg">{r.codFeePercent}%</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{L.ofCodAmount}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-xs text-muted-foreground">{L.insurance}</div>
                    <div className="font-bold text-lg">{r.insuranceFeePercent}%</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{L.optional}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="animate-pulse">
                <div className="h-10 bg-muted rounded-xl mb-4" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-20 bg-muted rounded-lg" />
                  <div className="h-20 bg-muted rounded-lg" />
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
