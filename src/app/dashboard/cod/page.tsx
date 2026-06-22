'use client'

import { useEffect, useState } from 'react'
import { Wallet, Plus, CheckCircle2, Clock } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

type Settlement = {
  id: string
  reference: string
  period: string
  totalAmount: number
  fees: number
  netAmount: number
  shipmentCount: number
  status: string
  paidAt: string | null
  createdAt: string
}

export default function ClientCodPage() {
  const { dict } = useLanguage()
  const L = dict.pages.finance
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [totals, setTotals] = useState({ pending: 0, paid: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/finance')
      .then(r => r.json())
      .then(d => {
        setSettlements(d.settlements || [])
        setTotals(d.totals || { pending: 0, paid: 0 })
      })
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [dict])

  const columns: Column<Settlement>[] = [
    { key: 'reference', header: L.reference, sortable: true, cell: (s) => <span className="font-mono font-medium text-xs">{s.reference}</span> },
    { key: 'period', header: L.period, cell: (s) => <span className="text-xs">{s.period}</span> },
    { key: 'shipmentCount', header: L.shipments, sortable: true, cell: (s) => <span className="font-medium">{s.shipmentCount}</span> },
    { key: 'totalAmount', header: L.totalCod, sortable: true, cell: (s) => <span className="font-medium text-xs">{formatCurrency(s.totalAmount)}</span> },
    { key: 'fees', header: L.fees, hideOnMobile: true, cell: (s) => <span className="text-xs text-rose-600">-{formatCurrency(s.fees)}</span> },
    { key: 'netAmount', header: L.netPayable, sortable: true, cell: (s) => <span className="font-bold text-emerald-600">{formatCurrency(s.netAmount)}</span> },
    { key: 'status', header: dict.common.status, cell: (s) => <StatusBadge status={s.status} /> },
    { key: 'paidAt', header: L.paidDate, hideOnMobile: true, cell: (s) => <span className="text-xs">{s.paidAt ? formatDate(s.paidAt) : '-'}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.nav.cod}
        icon={Wallet}
        actions={<Button className="shadow-premium"><Plus className="w-4 h-4 mr-2" />{dict.dashboard.client.requestPayout}</Button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: L.pendingSettlements, value: formatCurrency(totals.pending), icon: Clock, color: 'bg-amber-100 text-amber-700' },
          { label: L.totalPaid, value: formatCurrency(totals.paid), icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
          { label: L.totalSettlements, value: settlements.length, icon: Wallet, color: 'bg-purple-100 text-purple-700' },
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
      <DataTable data={settlements} columns={columns} loading={loading} searchPlaceholder={`${dict.common.search}...`} searchKeys={['reference', 'period']} pageSize={10} />
    </div>
  )
}
