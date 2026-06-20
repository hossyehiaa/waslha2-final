'use client'

import { useEffect, useState } from 'react'
import { Wallet, CheckCircle2, Clock, X } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'

type Payout = {
  id: string
  client: string
  amount: number
  method: string
  bankAccount: string | null
  status: string
  notes: string | null
  createdAt: string
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/payouts')
      .then(r => r.json())
      .then(d => setPayouts(d.payouts || []))
      .catch(() => toast.error('Failed to load payouts'))
      .finally(() => setLoading(false))
  }, [])

  async function handleAction(id: string, action: 'approve' | 'reject') {
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || 'Action failed')
        return
      }
      toast.success(action === 'approve' ? 'Payout approved' : 'Payout rejected')
      setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: action === 'approve' ? 'APPROVED' : 'REJECTED' } : p))
    } catch {
      toast.error('Network error')
    }
  }

  const columns: Column<Payout>[] = [
    { key: 'client', header: 'Client', sortable: true, cell: (p) => <span className="font-medium">{p.client}</span> },
    { key: 'amount', header: 'Amount', sortable: true, cell: (p) => <span className="font-bold">{formatCurrency(p.amount)}</span> },
    { key: 'method', header: 'Method', hideOnMobile: true, cell: (p) => <span className="text-xs">{p.method.replace(/_/g, ' ')}</span> },
    { key: 'bankAccount', header: 'Account', hideOnMobile: true, cell: (p) => <span className="text-xs font-mono">{p.bankAccount || '-'}</span> },
    { key: 'createdAt', header: 'Requested', sortable: true, hideOnMobile: true, cell: (p) => <span className="text-xs text-muted-foreground">{formatTimeAgo(p.createdAt)}</span> },
    { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'actions', header: 'Actions',
      cell: (p) => p.status === 'PENDING' ? (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleAction(p.id, 'approve') }}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleAction(p.id, 'reject') }}>
            <X className="w-3.5 h-3.5 mr-1" />Reject
          </Button>
        </div>
      ) : <span className="text-xs text-muted-foreground">—</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Payout Requests" subtitle="Client withdrawal requests" icon={Wallet} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Pending Requests', value: payouts.filter(p => p.status === 'PENDING').length, icon: Clock, color: 'bg-amber-100 text-amber-700' },
          { label: 'Total Pending Value', value: formatCurrency(payouts.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0)), icon: Wallet, color: 'bg-purple-100 text-purple-700' },
          { label: 'Approved', value: payouts.filter(p => p.status === 'APPROVED').length, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>
      <DataTable data={payouts} columns={columns} loading={loading} searchPlaceholder="Search payouts..." searchKeys={['client', 'bankAccount']} pageSize={10} />
    </div>
  )
}
