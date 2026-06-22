'use client'

import { useEffect, useState } from 'react'
import { TrendingDown, Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { EntityFormModal } from '@/components/dashboard/entity-form-modal'
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Expense = {
  id: string
  category: string
  description: string
  amount: number
  branch: string | null
  branchId: string | null
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
  const [branches, setBranches] = useState<{label: string, value: string}[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/expenses')
      const data = await res.json()
      setExpenses(data.expenses || [])
    } catch {
      toast.error(dict.common.noData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    fetch('/api/admin/branches').then(r => r.json()).then(d => {
      setBranches((d.branches || []).map((b: any) => ({ label: b.name, value: b.id })))
    })
  }, [dict])

  const categoryOptions = Object.entries(dict.expenseCategories).map(([k, v]) => ({ label: v, value: k }))

  const formFields = [
    { key: 'category', label: L.category, type: 'select' as const, options: categoryOptions, required: true, defaultValue: 'OTHER' },
    { key: 'description', label: L.description, type: 'text' as const, placeholder: 'Office supplies', required: true },
    { key: 'amount', label: L.amount, type: 'number' as const, placeholder: '500', required: true, defaultValue: 0 },
    { key: 'branchId', label: L.branch, type: 'select' as const, options: branches },
    { key: 'date', label: L.date, type: 'text' as const, placeholder: new Date().toISOString().split('T')[0], defaultValue: new Date().toISOString().split('T')[0] },
  ]

  async function handleSubmit(data: Record<string, any>) {
    const isEditing = !!editingExpense
    const url = isEditing ? `/api/admin/expenses/${editingExpense.id}` : '/api/admin/expenses'
    const method = isEditing ? 'PATCH' : 'POST'
    const payload = {
      ...data,
      amount: Number(data.amount) || 0,
      date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
    }
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || dict.common.noData)
    toast.success(isEditing ? dict.common.edit : dict.common.create)
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/expenses/${deleteTarget.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error || dict.common.noData)
    }
    toast.success(dict.common.delete)
    load()
  }

  const columns: Column<Expense>[] = [
    {
      key: 'category',
      header: L.category,
      sortable: true,
      cell: (e) => <span className={`text-xs px-2 py-1 rounded font-medium ${CATEGORY_COLORS[e.category] || CATEGORY_COLORS.OTHER}`}>{dict.expenseCategories[e.category as keyof typeof dict.expenseCategories] || e.category}</span>,
    },
    { key: 'description', header: L.description, cell: (e) => <span className="text-sm">{e.description}</span> },
    { key: 'branch', header: L.branch, hideOnMobile: true, cell: (e) => <span className="text-xs text-muted-foreground">{e.branch || '-'}</span> },
    { key: 'amount', header: L.amount, sortable: true, cell: (e) => <span className="font-bold text-rose-600">{formatCurrency(e.amount)}</span> },
    { key: 'date', header: L.date, sortable: true, hideOnMobile: true, cell: (e) => <span className="text-xs text-muted-foreground">{formatDate(e.date)}</span> },
    {
      key: 'actions',
      header: dict.common.actions,
      cell: (e) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditingExpense(e); setModalOpen(true) }}>
              <Edit className="w-4 h-4 mr-2" />
              {dict.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(e)}>
              <Trash2 className="w-4 h-4 mr-2" />
              {dict.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={L.title}
        subtitle={L.subtitle}
        icon={TrendingDown}
        actions={
          <Button className="shadow-premium" onClick={() => { setEditingExpense(null); setModalOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />{dict.common.create}
          </Button>
        }
      />
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
      <DataTable
        data={expenses}
        columns={columns}
        loading={loading}
        searchPlaceholder={`${dict.common.search}...`}
        searchKeys={['description', 'category']}
        pageSize={10}
      />

      <EntityFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingExpense ? `${dict.common.edit}` : dict.common.create}
        fields={formFields}
        initialData={editingExpense || undefined}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={dict.common.delete}
        description={`${dict.common.delete} ${deleteTarget?.description}?`}
        onConfirm={handleDelete}
        destructive
        confirmLabel={dict.common.delete}
      />
    </div>
  )
}
