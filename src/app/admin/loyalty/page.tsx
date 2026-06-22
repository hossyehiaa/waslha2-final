'use client'

import { useEffect, useState } from 'react'
import { Star, Award, TrendingUp, Gift, Plus } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { EntityFormModal } from '@/components/dashboard/entity-form-modal'
import { DataTable, Column } from '@/components/dashboard/data-table'

type Client = {
  id: string
  companyName: string
  totalShipments: number
  totalPoints: number
  tier: string
  tierColor: string
  recentPoints: any[]
}

export default function AdminLoyaltyPage() {
  const { dict } = useLanguage()
  const [clients, setClients] = useState<Client[]>([])
  const [tiers, setTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [awardModal, setAwardModal] = useState(false)
  const [awardTarget, setAwardTarget] = useState<Client | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/loyalty')
      const data = await res.json()
      setClients(data.clients || [])
      setTiers(data.tiers || [])
    } catch {
      toast.error('Failed to load loyalty data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const columns: Column<Client>[] = [
    {
      key: 'companyName',
      header: 'Client',
      sortable: true,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: c.tierColor + '30', color: c.tierColor }}>
            {c.companyName[0]}
          </div>
          <div>
            <div className="font-medium">{c.companyName}</div>
            <div className="text-xs text-muted-foreground">{c.totalShipments} shipments</div>
          </div>
        </div>
      ),
    },
    {
      key: 'totalPoints',
      header: 'Points',
      sortable: true,
      cell: (c) => <span className="font-bold text-lg">{c.totalPoints}</span>,
    },
    {
      key: 'tier',
      header: 'Tier',
      cell: (c) => (
        <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: c.tierColor + '30', color: c.tierColor }}>
          {c.tier}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (c) => (
        <Button size="sm" variant="outline" onClick={() => { setAwardTarget(c); setAwardModal(true) }}>
          <Gift className="w-3.5 h-3.5 mr-1.5" />
          Award Points
        </Button>
      ),
    },
  ]

  async function handleAward(data: Record<string, any>) {
    if (!awardTarget) return
    const res = await fetch('/api/admin/loyalty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: awardTarget.id,
        points: Number(data.points),
        reason: data.reason,
      }),
    })
    if (!res.ok) { toast.error('Failed to award points'); return }
    toast.success(`Awarded ${data.points} points to ${awardTarget.companyName}`)
    load()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Loyalty Program" subtitle="Client points and reward tiers" icon={Star} />

      {/* Tier cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(tiers.length > 0 ? tiers : [
          { name: 'Bronze', minPoints: 0, color: '#cd7f32', discountPercent: 0 },
          { name: 'Silver', minPoints: 500, color: '#c0c0c0', discountPercent: 5 },
          { name: 'Gold', minPoints: 2000, color: '#ffd700', discountPercent: 10 },
          { name: 'Platinum', minPoints: 5000, color: '#e5e4e2', discountPercent: 15 },
        ]).map((tier) => (
          <Card key={tier.name} className="p-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: tier.color + '30' }}>
              <Award className="w-5 h-5" style={{ color: tier.color }} />
            </div>
            <div className="font-bold" style={{ color: tier.color }}>{tier.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{tier.minPoints}+ points</div>
            <div className="text-xs font-medium mt-1">{tier.discountPercent}% discount</div>
          </Card>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
            <Star className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold">{clients.reduce((s, c) => s + c.totalPoints, 0)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Total Points Awarded</div>
        </Card>
        <Card className="p-4">
          <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold">{clients.filter(c => c.totalPoints > 0).length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Clients with Points</div>
        </Card>
        <Card className="p-4">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
            <Award className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold">{clients.filter(c => c.tier !== 'None' && c.tier !== 'Bronze').length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Silver+ Members</div>
        </Card>
      </div>

      <DataTable
        data={clients}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search clients..."
        searchKeys={['companyName']}
        exportFilename="loyalty_clients"
        pageSize={10}
      />

      <EntityFormModal
        open={awardModal}
        onOpenChange={setAwardModal}
        title={`Award Points - ${awardTarget?.companyName || ''}`}
        fields={[
          { key: 'points', label: 'Points', type: 'number' as const, required: true, defaultValue: 10 },
          { key: 'reason', label: 'Reason', type: 'text' as const, required: true, placeholder: 'e.g., Bonus for 100th shipment' },
        ]}
        onSubmit={handleAward}
      />
    </div>
  )
}
