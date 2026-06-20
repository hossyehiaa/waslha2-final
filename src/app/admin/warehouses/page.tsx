'use client'

import { useEffect, useState } from 'react'
import { Boxes, Plus } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { EntityFormModal } from '@/components/dashboard/entity-form-modal'
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog'
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Warehouse = {
  id: string
  name: string
  code: string
  branchId: string | null
  branch: string | null
  capacity: number
  currentLoad: number
  address: string | null
  status: string
}

export default function AdminWarehousesPage() {
  const { dict } = useLanguage()
  const L = dict.pages.warehouses
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState<{label: string, value: string}[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/warehouses')
      const data = await res.json()
      setWarehouses(data.warehouses || [])
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

  const formFields = [
    { key: 'name', label: dict.common.appName, type: 'text' as const, placeholder: 'Cairo Warehouse A', required: true },
    { key: 'code', label: 'Code', type: 'text' as const, placeholder: 'CAI-WH-A', required: true },
    { key: 'branchId', label: dict.nav.branches, type: 'select' as const, options: branches },
    { key: 'capacity', label: dict.common.total, type: 'number' as const, placeholder: '5000', required: true, defaultValue: 1000 },
    { key: 'address', label: dict.pages.addresses.address, type: 'textarea' as const, placeholder: 'Industrial Zone, Cairo' },
  ]

  async function handleSubmit(data: Record<string, any>) {
    const isEditing = !!editingWh
    const url = isEditing ? `/api/admin/warehouses/${editingWh.id}` : '/api/admin/warehouses'
    const method = isEditing ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, capacity: Number(data.capacity) || 1000 }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || dict.common.noData)
    toast.success(isEditing ? dict.common.edit : dict.common.create)
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/warehouses/${deleteTarget.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error || dict.common.noData)
    }
    toast.success(dict.common.delete)
    load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.nav.warehouses}
        subtitle={`${warehouses.length} ${L.subtitle}`}
        icon={Boxes}
        actions={
          <Button className="shadow-premium" onClick={() => { setEditingWh(null); setModalOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />{L.newWarehouse}
          </Button>
        }
      />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(loading ? [...Array(4)] : warehouses).map((w, i) => (
          <Card key={w?.id || i} className="p-6 hover:shadow-premium transition-all relative group">
            {w ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 flex items-center justify-center">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{w.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{w.code}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={w.status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingWh(w); setModalOpen(true) }}>
                          <Edit className="w-4 h-4 mr-2" />
                          {dict.common.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(w)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          {dict.common.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">{L.capacityUsed}</span>
                      <span className="font-medium">{w.currentLoad} / {w.capacity}</span>
                    </div>
                    <Progress value={w.capacity > 0 ? (w.currentLoad / w.capacity) * 100 : 0} className="h-2" />
                  </div>
                  {w.branch && <div className="text-xs text-muted-foreground">📍 {w.branch}</div>}
                  {w.address && <div className="text-xs text-muted-foreground">{w.address}</div>}
                </div>
              </>
            ) : (
              <div className="animate-pulse">
                <div className="h-10 bg-muted rounded-xl mb-4" />
                <div className="h-2 bg-muted rounded mb-2" />
                <div className="h-2 bg-muted rounded w-2/3" />
              </div>
            )}
          </Card>
        ))}
      </div>

      <EntityFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingWh ? `${dict.common.edit} - ${editingWh.name}` : L.newWarehouse}
        fields={formFields}
        initialData={editingWh || undefined}
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
