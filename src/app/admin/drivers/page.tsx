'use client'

import { useEffect, useState } from 'react'
import { Truck, Plus, Star, Package, Wallet, MoreHorizontal, Edit, Trash2, Ban } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { EntityFormModal } from '@/components/dashboard/entity-form-modal'
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

type Driver = {
  id: string
  fullName: string
  username: string
  email: string | null
  phone: string | null
  driverCode: string
  vehicleType: string
  vehiclePlate: string | null
  status: string
  rating: number
  totalDeliveries: number
  totalEarnings: number
  pendingEarnings: number
  branch: string | null
  branchId: string | null
  zone: string | null
  zoneId: string | null
  joinDate: string
  lastLoginAt: string | null
}

export default function AdminDriversPage() {
  const { dict } = useLanguage()
  const L = dict.pages.drivers
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState<{label: string, value: string}[]>([])
  const [zones, setZones] = useState<{label: string, value: string}[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<Driver | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/drivers')
      const data = await res.json()
      setDrivers(data.drivers || [])
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
    fetch('/api/admin/zones').then(r => r.json()).then(d => {
      setZones((d.zones || []).map((z: any) => ({ label: z.name, value: z.id })))
    })
  }, [dict])

  const vehicleOptions = Object.entries(dict.vehicles).map(([k, v]) => ({ label: v, value: k }))

  const formFields = [
    { key: 'fullName', label: dict.common.fullName, type: 'text' as const, placeholder: 'Mohamed Ali', required: true },
    { key: 'username', label: dict.common.username, type: 'text' as const, placeholder: '@username', required: true },
    { key: 'password', label: dict.common.password, type: 'password' as const, placeholder: '••••••••', required: !editingDriver },
    { key: 'email', label: dict.common.email, type: 'email' as const, placeholder: 'driver@wsalhali.com' },
    { key: 'phone', label: L.phone, type: 'text' as const, placeholder: '+20 1XX XXX XXXX' },
    { key: 'vehicleType', label: L.vehicle, type: 'select' as const, options: vehicleOptions, required: true, defaultValue: 'MOTORCYCLE' },
    { key: 'vehiclePlate', label: L.vehicle, type: 'text' as const, placeholder: 'CA-1234-X' },
    { key: 'branchId', label: L.branch, type: 'select' as const, options: branches },
    { key: 'zoneId', label: L.zone, type: 'select' as const, options: zones },
  ]

  async function handleSubmit(data: Record<string, any>) {
    const isEditing = !!editingDriver
    const url = isEditing ? `/api/admin/drivers/${editingDriver.id}` : '/api/admin/drivers'
    const method = isEditing ? 'PATCH' : 'POST'
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
    const res = await fetch(`/api/admin/drivers/${deleteTarget.id}`, { method: 'DELETE' })
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
    const res = await fetch(`/api/admin/drivers/${suspendTarget.id}`, {
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

  const columns: Column<Driver>[] = [
    {
      key: 'fullName',
      header: L.driver,
      sortable: true,
      cell: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center font-bold text-sm shrink-0">
            {(d.fullName || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
          </div>
          <div>
            <div className="font-medium">{d.fullName || '-'}</div>
            <div className="text-xs text-muted-foreground font-mono">{d.driverCode}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'vehicleType',
      header: L.vehicle,
      hideOnMobile: true,
      cell: (d) => (
        <div>
          <div className="text-xs font-medium">{dict.vehicles[d.vehicleType as keyof typeof dict.vehicles] || d.vehicleType}</div>
          {d.vehiclePlate && <div className="text-xs text-muted-foreground font-mono">{d.vehiclePlate}</div>}
        </div>
      ),
    },
    { key: 'phone', header: L.phone, hideOnMobile: true, cell: (d) => <span className="text-xs">{d.phone || '-'}</span> },
    { key: 'zone', header: L.zone, hideOnMobile: true, cell: (d) => <span className="text-xs">{d.zone ? `${d.zone}${d.branch ? ` / ${d.branch}` : ''}` : '-'}</span> },
    { key: 'totalDeliveries', header: L.deliveries, sortable: true, cell: (d) => <span className="font-medium">{d.totalDeliveries}</span> },
    { key: 'pendingEarnings', header: L.pending, sortable: true, cell: (d) => <span className="font-medium text-xs text-amber-600">{formatCurrency(d.pendingEarnings)}</span> },
    {
      key: 'rating',
      header: L.rating,
      sortable: true,
      cell: (d) => (
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-medium">{d.rating.toFixed(1)}</span>
        </div>
      ),
    },
    { key: 'status', header: dict.common.status, cell: (d) => <StatusBadge status={d.status} /> },
    {
      key: 'actions',
      header: dict.common.actions,
      cell: (d) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditingDriver(d); setModalOpen(true) }}>
              <Edit className="w-4 h-4 mr-2" />
              {dict.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSuspendTarget(d)}>
              <Ban className="w-4 h-4 mr-2" />
              {d.status === 'ACTIVE' ? dict.common.signOut : dict.common.active}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(d)}>
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
        title={dict.nav.drivers}
        subtitle={`${drivers.length} ${L.subtitle}`}
        icon={Truck}
        actions={
          <Button className="shadow-premium" onClick={() => { setEditingDriver(null); setModalOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />{L.newDriver}
          </Button>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: L.totalDrivers, value: drivers.length, icon: Truck, color: 'bg-cyan-100 text-cyan-700' },
          { label: L.activeNow, value: drivers.filter(d => d.status === 'ACTIVE').length, icon: Star, color: 'bg-emerald-100 text-emerald-700' },
          { label: L.totalDeliveries, value: drivers.reduce((s, d) => s + d.totalDeliveries, 0), icon: Package, color: 'bg-purple-100 text-purple-700' },
          { label: L.pendingEarnings, value: formatCurrency(drivers.reduce((s, d) => s + d.pendingEarnings, 0)), icon: Wallet, color: 'bg-amber-100 text-amber-700' },
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
        data={drivers}
        columns={columns}
        loading={loading}
        searchPlaceholder={`${dict.common.search}...`}
        searchKeys={['fullName', 'username', 'driverCode', 'vehiclePlate']}
        pageSize={10}
      />

      <EntityFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingDriver ? `${dict.common.edit} - ${editingDriver.fullName}` : L.newDriver}
        fields={formFields}
        initialData={editingDriver || undefined}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={`${dict.common.delete} ${deleteTarget?.fullName || ''}`}
        description={`${dict.common.delete} ${deleteTarget?.driverCode}?`}
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
