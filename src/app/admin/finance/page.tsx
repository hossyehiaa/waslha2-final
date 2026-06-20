'use client'

import { useEffect, useState } from 'react'
import { Wallet, CheckCircle2, Clock, TrendingUp, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'

type Settlement = {
  id: string
  reference: string
  client: string
  clientId: string
  period: string
  totalAmount: number
  fees: number
  netAmount: number
  shipmentCount: number
  status: string
  paidAt: string | null
  createdAt: string
}

export default function AdminFinancePage() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({ pending: 0, paid: 0 })
  const [statusFilter, setStatusFilter] = useState('all')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/finance?status=${statusFilter}`)
      const data = await res.json()
      setSettlements(data.settlements || [])
      setTotals(data.totals || { pending: 0, paid: 0 })
    } catch {
      toast.error('Failed to load settlements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter])

  async function handleAction(id: string, action: 'approve' | 'pay') {
    try {
      const res = await fetch('/api/admin/finance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || 'Action failed')
        return
      }
      toast.success(action === 'approve' ? 'Settlement approved' : 'Settlement paid to client')
      load()
    } catch {
      toast.error('Network error')
    }
  }

  const columns: Column<Settlement>[] = [
    {
      key: 'reference',
      header: 'Reference',
      sortable: true,
      cell: (s) => <span className="font-mono font-medium text-xs">{s.reference}</span>,
    },
    {
      key: 'client',
      header: 'Client',
      sortable: true,
      cell: (s) => <span className="font-medium">{s.client}</span>,
    },
    {
      key: 'period',
      header: 'Period',
      hideOnMobile: true,
      cell: (s) => <span className="text-xs">{s.period}</span>,
    },
    {
      key: 'shipmentCount',
      header: 'Shipments',
      sortable: true,
      cell: (s) => <span className="font-medium">{s.shipmentCount}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Total COD',
      sortable: true,
      cell: (s) => <span className="font-medium text-xs">{formatCurrency(s.totalAmount)}</span>,
    },
    {
      key: 'fees',
      header: 'Fees',
      hideOnMobile: true,
      cell: (s) => <span className="text-xs text-rose-600">-{formatCurrency(s.fees)}</span>,
    },
    {
      key: 'netAmount',
      header: 'Net Payable',
      sortable: true,
      cell: (s) => <span className="font-bold text-emerald-600">{formatCurrency(s.netAmount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (s) => (
        <div className="flex items-center gap-2">
          {s.status === 'PENDING' && (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleAction(s.id, 'approve') }}>
              Approve
            </Button>
          )}
          {(s.status === 'PENDING' || s.status === 'APPROVED') && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAction(s.id, 'pay') }} className="bg-emerald-600 hover:bg-emerald-700">
              <DollarSign className="w-3.5 h-3.5 mr-1" />
              Pay
            </Button>
          )}
          {s.status === 'PAID' && s.paidAt && (
            <span className="text-xs text-muted-foreground">{formatDate(s.paidAt)}</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="COD Settlements"
        subtitle="Cash on Delivery settlements for clients"
        icon={Wallet}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Settlements', value: formatCurrency(totals.pending), icon: Clock, color: 'bg-amber-100 text-amber-700' },
          { label: 'Total Paid', value: formatCurrency(totals.paid), icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Total Settlements', value: settlements.length, icon: Wallet, color: 'bg-purple-100 text-purple-700' },
          { label: 'Avg Settlement', value: formatCurrency(settlements.length > 0 ? (totals.pending + totals.paid) / settlements.length : 0), icon: TrendingUp, color: 'bg-cyan-100 text-cyan-700' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <DataTable
        data={settlements}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search settlements..."
        searchKeys={['reference', 'client', 'period']}
        filters={[
          {
            label: 'Status',
            value: statusFilter,
            options: [
              { label: 'Pending', value: 'PENDING' },
              { label: 'Approved', value: 'APPROVED' },
              { label: 'Paid', value: 'PAID' },
            ],
            onChange: (v) => setStatusFilter(v),
          },
        ]}
        pageSize={10}
      />
    </div>
  )
}
