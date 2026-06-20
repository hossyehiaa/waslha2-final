'use client'

import { useEffect, useState } from 'react'
import { TrendingDown } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { Card } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

type Expense = {
  id: string
  category: string
  description: string
  amount: number
  branch: string | null
  date: string
}

const CATEGORY_COLORS: Record<string, string> = {
  SALARIES: 'bg-purple-100 text-purple-700',
  FUEL: 'bg-amber-100 text-amber-700',
  MAINTENANCE: 'bg-blue-100 text-blue-700',
  RENT: 'bg-cyan-100 text-cyan-700',
  UTILITIES: 'bg-teal-100 text-teal-700',
  OTHER: 'bg-zinc-100 text-zinc-700',
}

export default function AdminExpensesPage() {
  const { dict } = useLanguage()
  const L = dict.pages.expenses
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/expenses')
      .then(r => r.json())
      .then(d => setExpenses(d.expenses || []))
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [dict])

  const columns: Column<Expense>[] = [
    { key: 'category', header: L.category, sortable: true, cell: (e) => <span className={`text-xs px-2 py-1 rounded font-medium ${CATEGORY_COLORS[e.category] || CATEGORY_COLORS.OTHER}`}>{dict.expenseCategories[e.category as keyof typeof dict.expenseCategories] || e.category}</span> },
    { key: 'description', header: L.description, cell: (e) => <span className="text-sm">{e.description}</span> },
    { key: 'branch', header: L.branch, hideOnMobile: true, cell: (e) => <span className="text-xs text-muted-foreground">{e.branch || '-'}</span> },
    { key: 'amount', header: L.amount, sortable: true, cell: (e) => <span className="font-bold text-rose-600">{formatCurrency(e.amount)}</span> },
    { key: 'date', header: L.date, sortable: true, hideOnMobile: true, cell: (e) => <span className="text-xs text-muted-foreground">{formatDate(e.date)}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={L.title} subtitle={L.subtitle} icon={TrendingDown} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: L.totalExpenses, value: formatCurrency(expenses.reduce((s, e) => s + e.amount, 0)), color: 'bg-rose-100 text-rose-700' },
          { label: L.salaries, value: formatCurrency(expenses.filter(e => e.category === 'SALARIES').reduce((s, e) => s + e.amount, 0)), color: 'bg-purple-100 text-purple-700' },
          { label: L.fuel, value: formatCurrency(expenses.filter(e => e.category === 'FUEL').reduce((s, e) => s + e.amount, 0)), color: 'bg-amber-100 text-amber-700' },
          { label: L.other, value: formatCurrency(expenses.filter(e => !['SALARIES', 'FUEL'].includes(e.category)).reduce((s, e) => s + e.amount, 0)), color: 'bg-zinc-100 text-zinc-700' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>
      <DataTable data={expenses} columns={columns} loading={loading} searchPlaceholder={`${dict.common.search}...`} searchKeys={['description', 'category']} pageSize={10} />
    </div>
  )
}
