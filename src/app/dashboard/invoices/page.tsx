'use client'

import { useEffect, useState } from 'react'
import { Receipt, Download } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'

type Invoice = {
  id: string
  invoiceNumber: string
  type: string
  amount: number
  tax: number
  total: number
  status: string
  dueDate: string | null
  paidAt: string | null
  createdAt: string
}

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/invoices')
      .then(r => r.json())
      .then(d => setInvoices(d.invoices || []))
      .catch(() => toast.error('Failed to load invoices'))
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<Invoice>[] = [
    { key: 'invoiceNumber', header: 'Invoice #', sortable: true, cell: (i) => <span className="font-mono font-medium text-xs">{i.invoiceNumber}</span> },
    { key: 'type', header: 'Type', cell: (i) => <span className="text-xs">{i.type.replace(/_/g, ' ')}</span> },
    { key: 'amount', header: 'Amount', sortable: true, cell: (i) => <span className="font-medium text-xs">{formatCurrency(i.amount)}</span> },
    { key: 'tax', header: 'Tax', hideOnMobile: true, cell: (i) => <span className="text-xs">{formatCurrency(i.tax)}</span> },
    { key: 'total', header: 'Total', sortable: true, cell: (i) => <span className="font-bold">{formatCurrency(i.total)}</span> },
    { key: 'dueDate', header: 'Due Date', hideOnMobile: true, cell: (i) => <span className="text-xs">{i.dueDate ? formatDate(i.dueDate) : '-'}</span> },
    { key: 'status', header: 'Status', cell: (i) => <StatusBadge status={i.status} /> },
    { key: 'actions', header: '', cell: (i) => (
      <Button variant="ghost" size="sm"><Download className="w-3.5 h-3.5" /></Button>
    )},
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" subtitle={`${invoices.length} invoices`} icon={Receipt} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Invoices', value: invoices.length, color: 'bg-purple-100 text-purple-700' },
          { label: 'Paid', value: invoices.filter(i => i.status === 'PAID').length, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Outstanding', value: formatCurrency(invoices.filter(i => i.status !== 'PAID').reduce((s, i) => s + i.total, 0)), color: 'bg-rose-100 text-rose-700' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
              <Receipt className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>
      <DataTable data={invoices} columns={columns} loading={loading} searchPlaceholder="Search invoices..." searchKeys={['invoiceNumber']} pageSize={10} />
    </div>
  )
}
