'use client'

import { useEffect, useState } from 'react'
import { Building2, Plus, Users, Truck, Boxes, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { EntityFormModal } from '@/components/dashboard/entity-form-modal'
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

type Branch = {
  id: string
  name: string
  code: string
  phone: string | null
  address: string | null
  cityId: string | null
  city: string | null
  status: string
  clients: number
  employees: number
  drivers: number
  warehouses: number
  createdAt: string
}

export default function AdminBranchesPage() {
  const { dict } = useLanguage()
  const L = dict.pages.branches
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [cities, setCities] = useState<{label: string, value: string}[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/branches')
      const data = await res.json()
      setBranches(data.branches || [])
    } catch {
      toast.error(dict.common.noData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    fetch('/api/admin/cities').then(r => r.json()).then(d => {
      setCities((d.cities || []).map((c: any) => ({ label: c.name, value: c.id })))
    })
  }, [dict])

  const formFields = [
    { key: 'name', label: L.branch, type: 'text' as const, placeholder: 'Cairo Main Hub', required: true },
    { key: 'code', label: 'Code', type: 'text' as const, placeholder: 'CAI-01', required: true },
    { key: 'phone', label: L.phone, type: 'text' as const, placeholder: '+20 2 2345 6789' },
    { key: 'cityId', label: L.city, type: 'select' as const, options: cities },
    { key: 'address', label: dict.pages.addresses.address, type: 'textarea' as const, placeholder: 'Nasr City, Cairo' },
  ]

  async function handleSubmit(data: Record<string, any>) {
    const isEditing = !!editingBranch
    const url = isEditing ? `/api/admin/branches/${editingBranch.id}` : '/api/admin/branches'
    const method = isEditing ? 'PATCH' : 'POST'
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
    const res = await fetch(`/api/admin/branches/${deleteTarget.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error || dict.common.noData)
    }
    toast.success(dict.common.delete)
    load()
  }

  const columns: Column<Branch>[] = [
    {
      key: 'name',
      header: L.branch,
      sortable: true,
      cell: (b) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <div className="font-medium">{b.name}</div>
            <div className="text-xs text-muted-foreground font-mono">{b.code}</div>
          </div>
        </div>
      ),
    },
    { key: 'city', header: L.city, hideOnMobile: true, cell: (b) => <span className="text-xs">{b.city || '-'}</span> },
    { key: 'phone', header: L.phone, hideOnMobile: true, cell: (b) => <span className="text-xs">{b.phone || '-'}</span> },
    { key: 'clients', header: L.clients, cell: (b) => <div className="flex items-center gap-1 text-xs"><Users className="w-3 h-3 text-muted-foreground" />{b.clients}</div> },
    { key: 'employees', header: L.staff, hideOnMobile: true, cell: (b) => <div className="flex items-center gap-1 text-xs"><Users className="w-3 h-3 text-muted-foreground" />{b.employees}</div> },
    { key: 'drivers', header: L.drivers, hideOnMobile: true, cell: (b) => <div className="flex items-center gap-1 text-xs"><Truck className="w-3 h-3 text-muted-foreground" />{b.drivers}</div> },
    { key: 'warehouses', header: L.storage, hideOnMobile: true, cell: (b) => <div className="flex items-center gap-1 text-xs"><Boxes className="w-3 h-3 text-muted-foreground" />{b.warehouses}</div> },
    { key: 'status', header: dict.common.status, cell: (b) => <StatusBadge status={b.status} /> },
    {
      key: 'actions',
      header: dict.common.actions,
      cell: (b) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditingBranch(b); setModalOpen(true) }}>
              <Edit className="w-4 h-4 mr-2" />
              {dict.common.edit}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(b)}>
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
        title={dict.nav.branches}
        subtitle={`${branches.length} ${L.subtitle}`}
        icon={Building2}
        actions={
          <Button className="shadow-premium" onClick={() => { setEditingBranch(null); setModalOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />{L.newBranch}
          </Button>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: L.totalBranches, value: branches.length, icon: Building2, color: 'bg-teal-100 text-teal-700' },
          { label: L.totalClients, value: branches.reduce((s, b) => s + b.clients, 0), icon: Users, color: 'bg-purple-100 text-purple-700' },
          { label: L.totalDrivers, value: branches.reduce((s, b) => s + b.drivers, 0), icon: Truck, color: 'bg-cyan-100 text-cyan-700' },
          { label: L.warehouses, value: branches.reduce((s, b) => s + b.warehouses, 0), icon: Boxes, color: 'bg-emerald-100 text-emerald-700' },
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
        data={branches}
        columns={columns}
        loading={loading}
        searchPlaceholder={`${dict.common.search}...`}
        searchKeys={['name', 'code', 'city']}
        pageSize={10}
      />

      <EntityFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingBranch ? `${dict.common.edit} - ${editingBranch.name}` : L.newBranch}
        fields={formFields}
        initialData={editingBranch || undefined}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={`${dict.common.delete} ${deleteTarget?.name || ''}`}
        description={`${dict.common.delete} ${deleteTarget?.code}?`}
        onConfirm={handleDelete}
        destructive
        confirmLabel={dict.common.delete}
      />
    </div>
  )
}
