'use client'

import { useEffect, useState } from 'react'
import { UserCog, Plus, Briefcase, Wallet, Star, MoreHorizontal, Edit, Trash2, Ban, CheckCircle } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency, formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { EntityFormModal } from '@/components/dashboard/entity-form-modal'
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

type Employee = {
  id: string
  fullName: string
  username: string
  email: string | null
  phone: string | null
  employeeCode: string
  position: string
  salary: number
  status: string
  branch: string | null
  branchId: string | null
  hireDate: string
  lastLoginAt: string | null
}

export default function AdminEmployeesPage() {
  const { dict } = useLanguage()
  const L = dict.pages.employees
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState<{label: string, value: string}[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<Employee | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/employees')
      const data = await res.json()
      setEmployees(data.employees || [])
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

  const positionOptions = [
    { label: dict.positions.MANAGER, value: 'MANAGER' },
    { label: dict.positions.SUPERVISOR, value: 'SUPERVISOR' },
    { label: dict.positions.CLERK, value: 'CLERK' },
    { label: dict.positions.AGENT, value: 'AGENT' },
  ]

  const formFields = [
    { key: 'fullName', label: L.employee, type: 'text' as const, placeholder: dict.common.fullName, required: true },
    { key: 'username', label: L.employee, type: 'text' as const, placeholder: '@username', required: true },
    { key: 'password', label: dict.common.password, type: 'password' as const, placeholder: '••••••••', required: !editingEmployee },
    { key: 'email', label: dict.common.email, type: 'email' as const, placeholder: 'employee@wsalhali.com' },
    { key: 'phone', label: L.contact, type: 'text' as const, placeholder: '+20 1XX XXX XXXX' },
    { key: 'position', label: L.position, type: 'select' as const, options: positionOptions, required: true, defaultValue: 'CLERK' },
    { key: 'branchId', label: L.branch, type: 'select' as const, options: branches },
    { key: 'salary', label: L.salary, type: 'number' as const, placeholder: '0', defaultValue: 0 },
  ]

  async function handleSubmit(data: Record<string, any>) {
    const isEditing = !!editingEmployee
    const url = isEditing ? `/api/admin/employees/${editingEmployee.id}` : '/api/admin/employees'
    const method = isEditing ? 'PATCH' : 'POST'
    // Don't send empty password on edit
    if (isEditing && !data.password) delete data.password
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || dict.common.noData)
    toast.success(isEditing ? dict.common.edit : dict.common.create)
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/employees/${deleteTarget.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error || dict.common.noData)
    }
    toast.success(dict.common.delete)
    load()
  }

  async function handleSuspend() {
    if (!suspendTarget) return
    const newStatus = suspendTarget.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    const res = await fetch(`/api/admin/employees/${suspendTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error || dict.common.noData)
    }
    toast.success(newStatus === 'ACTIVE' ? dict.common.active : dict.common.signOut)
    load()
  }

  const columns: Column<Employee>[] = [
    {
      key: 'fullName',
      header: L.employee,
      sortable: true,
      cell: (e) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center font-bold text-sm shrink-0">
            {(e.fullName || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
          </div>
          <div>
            <div className="font-medium">{e.fullName || '-'}</div>
            <div className="text-xs text-muted-foreground font-mono">{e.employeeCode}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'position',
      header: L.position,
      sortable: true,
      cell: (e) => <span className="text-xs px-2 py-1 rounded bg-muted font-medium">{dict.positions[e.position as keyof typeof dict.positions] || e.position}</span>,
    },
    {
      key: 'contact',
      header: L.contact,
      hideOnMobile: true,
      cell: (e) => (
        <div>
          <div className="text-xs">{e.email || '-'}</div>
          <div className="text-xs text-muted-foreground">{e.phone || '-'}</div>
        </div>
      ),
    },
    {
      key: 'branch',
      header: L.branch,
      hideOnMobile: true,
      cell: (e) => <span className="text-xs">{e.branch || '-'}</span>,
    },
    {
      key: 'salary',
      header: L.salary,
      sortable: true,
      cell: (e) => <span className="font-medium text-xs">{formatCurrency(e.salary)}</span>,
    },
    {
      key: 'status',
      header: dict.common.status,
      cell: (e) => <StatusBadge status={e.status} />,
    },
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
            <DropdownMenuItem onClick={() => { setEditingEmployee(e); setModalOpen(true) }}>
              <Edit className="w-4 h-4 mr-2" />
              {dict.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSuspendTarget(e)}>
              <Ban className="w-4 h-4 mr-2" />
              {e.status === 'ACTIVE' ? dict.common.signOut : dict.common.active}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
        title={dict.nav.employees}
        subtitle={`${employees.length} ${L.subtitle}`}
        icon={UserCog}
        actions={
          <Button className="shadow-premium" onClick={() => { setEditingEmployee(null); setModalOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />{L.newEmployee}
          </Button>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: L.totalEmployees, value: employees.length, icon: UserCog, color: 'bg-emerald-100 text-emerald-700' },
          { label: L.managers, value: employees.filter(e => e.position === 'MANAGER').length, icon: Briefcase, color: 'bg-purple-100 text-purple-700' },
          { label: L.totalSalaries, value: formatCurrency(employees.reduce((s, e) => s + e.salary, 0)), icon: Wallet, color: 'bg-amber-100 text-amber-700' },
          { label: L.active, value: employees.filter(e => e.status === 'ACTIVE').length, icon: Star, color: 'bg-teal-100 text-teal-700' },
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
      <DataTable
        data={employees}
        columns={columns}
        loading={loading}
        searchPlaceholder={`${dict.common.search}...`}
        searchKeys={['fullName', 'username', 'employeeCode']}
        pageSize={10}
      />

      <EntityFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingEmployee ? `${dict.common.edit} - ${editingEmployee.fullName}` : L.newEmployee}
        fields={formFields}
        initialData={editingEmployee || undefined}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={`${dict.common.delete} ${deleteTarget?.fullName || ''}`}
        description={`${dict.common.delete} ${deleteTarget?.employeeCode}?`}
        onConfirm={handleDelete}
        destructive
        confirmLabel={dict.common.delete}
      />

      <ConfirmDialog
        open={!!suspendTarget}
        onOpenChange={(v) => !v && setSuspendTarget(null)}
        title={suspendTarget?.status === 'ACTIVE' ? dict.common.signOut : dict.common.active}
        description={`${suspendTarget?.status === 'ACTIVE' ? dict.common.signOut : dict.common.active} ${suspendTarget?.fullName}?`}
        onConfirm={handleSuspend}
        confirmLabel={suspendTarget?.status === 'ACTIVE' ? dict.common.signOut : dict.common.active}
      />
    </div>
  )
}
