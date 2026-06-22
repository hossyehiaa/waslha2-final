'use client'

import { useEffect, useState } from 'react'
import { Star, Award, TrendingUp, Gift } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

export default function ClientLoyaltyPage() {
  const { dict } = useLanguage()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/loyalty')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return <div className="space-y-6"><PageHeader title="Loyalty Program" icon={Star} /><Card className="p-12 animate-pulse bg-muted/30" /></div>
  }

  const { totalPoints, currentTier, nextTier, pointsToNextTier, history, tiers } = data

  return (
    <div className="space-y-6">
      <PageHeader title="My Loyalty" subtitle="Your points and rewards" icon={Star} />

      {/* Current tier card */}
      <Card className="p-8 bg-gradient-to-br from-primary to-emerald-700 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5" />
            <span className="text-sm font-medium text-white/80">Your Tier</span>
          </div>
          <div className="text-4xl font-bold mb-2">{currentTier?.name || 'Bronze'}</div>
          <div className="text-6xl font-bold mb-4">{totalPoints} <span className="text-2xl font-normal text-white/70">points</span></div>
          {nextTier && (
            <div>
              <div className="text-sm text-white/70 mb-2">
                {pointsToNextTier} points to {nextTier.name}
              </div>
              <Progress value={((totalPoints - (currentTier?.minPoints || 0)) / (nextTier.minPoints - (currentTier?.minPoints || 0))) * 100} className="h-2" />
            </div>
          )}
        </div>
      </Card>

      {/* Tier benefits */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(tiers.length > 0 ? tiers : [
          { name: 'Bronze', minPoints: 0, color: '#cd7f32', discountPercent: 0 },
          { name: 'Silver', minPoints: 500, color: '#c0c0c0', discountPercent: 5 },
          { name: 'Gold', minPoints: 2000, color: '#ffd700', discountPercent: 10 },
          { name: 'Platinum', minPoints: 5000, color: '#e5e4e2', discountPercent: 15 },
        ]).map((tier) => (
          <Card key={tier.name} className={`p-4 ${currentTier?.name === tier.name ? 'border-2' : ''}`} style={{ borderColor: currentTier?.name === tier.name ? tier.color : undefined }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: tier.color + '30' }}>
              <Award className="w-5 h-5" style={{ color: tier.color }} />
            </div>
            <div className="font-bold" style={{ color: tier.color }}>{tier.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{tier.minPoints}+ points</div>
            <div className="text-xs font-medium mt-1">{tier.discountPercent}% discount</div>
          </Card>
        ))}
      </div>

      {/* Points history */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Points History</h3>
        {history && history.length > 0 ? (
          <div className="space-y-2">
            {history.map((h: any) => (
              <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/30">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${h.points > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {h.points > 0 ? '+' : ''}{h.points}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{h.reason}</div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</div>
                </div>
                <div className={`font-bold ${h.points > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {h.points > 0 ? '+' : ''}{h.points}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No points yet. Ship more to earn rewards!</p>
          </div>
        )}
      </Card>
    </div>
  )
}
