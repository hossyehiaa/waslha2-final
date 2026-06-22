'use client'

import { useEffect, useState } from 'react'
import { PackageCheck, Plus, Check, UserCheck, Truck, X } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { EntityFormModal } from '@/components/dashboard/entity-form-modal'
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

type Pickup = {
  id: string
  clientId: string
  clientName: string
  pickupAddress: string
  contactName: string
  contactPhone: string
  packagesCount: number
  totalWeight: number
  status: string
  requestedDate: string
  scheduledDate: string | null
  completedDate: string | null
  notes: string | null
  driverId: string | null
  driverName?: string
  driverCode?: string
}

export default function AdminPickupsPage() {
  const { dict } = useLanguage()
  const L = dict.pages.pickups
  const [pickups, setPickups] = useState<Pickup[]>([])
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<{label: string, value: string}[]>([])
  const [drivers, setDrivers] = useState<{label: string, value: string}[]>([])
  const [cities, setCities] = useState<{label: string, value: string}[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState<Pickup | null>(null)
  const [selectedDriver, setSelectedDriver] = useState('')
  const [confirmTarget, setConfirmTarget] = useState<Pickup | null>(null)
  const [pickupTarget, setPickupTarget] = useState<Pickup | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Pickup | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/pickups')
      const data = await res.json()
      setPickups(data.pickups || [])
    } catch {
      toast.error(dict.common.noData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    fetch('/api/admin/clients').then(r => r.json()).then(d => setClients((d.clients || []).map((c: any) => ({ label: c.companyName, value: c.id }))))
    fetch('/api/admin/drivers').then(r => r.json()).then(d => setDrivers((d.drivers || []).map((d: any) => ({ label: `${d.fullName} (${d.driverCode})`, value: d.id }))))
    fetch('/api/admin/cities').then(r => r.json()).then(d => setCities((d.cities || []).map((c: any) => ({ label: c.name, value: c.id }))))
  }, [dict])

  const formFields = [
    { key: 'clientId', label: dict.nav.clients, type: 'select' as const, options: clients, required: true },
    { key: 'pickupAddress', label: L.address, type: 'textarea' as const, placeholder: 'Pickup address', required: true },
    { key: 'contactName', label: dict.common.fullName, type: 'text' as const, placeholder: 'Contact name', required: true },
    { key: 'contactPhone', label: L.packages, type: 'text' as const, placeholder: '+20 1XX XXX XXXX', required: true },
    { key: 'pickupCityId', label: dict.pages.branches.city, type: 'select' as const, options: cities, required: true },
    { key: 'packagesCount', label: L.packages, type: 'number' as const, placeholder: '1', defaultValue: 1 },
    { key: 'totalWeight', label: L.weight, type: 'number' as const, placeholder: '0.5', defaultValue: 0.5 },
    { key: 'requestedDate', label: L.requested, type: 'text' as const, placeholder: new Date().toISOString().split('T')[0], defaultValue: new Date().toISOString().split('T')[0] },
    { key: 'notes', label: dict.common.actions, type: 'textarea' as const, placeholder: 'Additional notes' },
  ]

  async function handleSubmit(data: Record<string, any>) {
    const res = await fetch('/api/admin/pickups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        requestedDate: data.requestedDate ? new Date(data.requestedDate).toISOString() : new Date().toISOString(),
        packagesCount: Number(data.packagesCount) || 1,
        totalWeight: Number(data.totalWeight) || 0,
      }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || dict.common.noData)
    toast.success(dict.common.create)
    load()
  }

  async function handleAction(pickup: Pickup, action: string) {
    const body: any = { id: pickup.id, action }
    if (action === 'assign') {
      if (!selectedDriver) {
        toast.error(dict.common.required)
        return
      }
      body.driverId = selectedDriver
    }
    const res = await fetch('/api/admin/pickups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error || dict.common.noData)
    }
    toast.success(dict.common.confirm)
    load()
  }

  const columns: Column<Pickup>[] = [
    { key: 'clientName', header: L.client, sortable: true, cell: (p) => <span className="font-medium">{p.clientName}</span> },
    { key: 'pickupAddress', header: L.address, hideOnMobile: true, cell: (p) => <span className="text-xs text-muted-foreground">{p.pickupAddress}</span> },
    { key: 'packagesCount', header: L.packages, sortable: true, cell: (p) => <span className="font-medium">{p.packagesCount}</span> },
    { key: 'totalWeight', header: L.weight, hideOnMobile: true, cell: (p) => <span className="text-xs">{p.totalWeight} kg</span> },
    { key: 'requestedDate', header: L.requested, sortable: true, cell: (p) => <span className="text-xs text-muted-foreground">{formatDateTime(p.requestedDate)}</span> },
    { key: 'driverName', header: dict.nav.drivers, hideOnMobile: true, cell: (p) => <span className="text-xs">{p.driverName || '-'}</span> },
    { key: 'status', header: dict.common.status, cell: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'actions',
      header: dict.common.actions,
      cell: (p) => (
        <div className="flex gap-1 flex-wrap">
          {p.status === 'PENDING' && (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setConfirmTarget(p) }}>
              <Check className="w-3 h-3 mr-1" />{dict.common.confirm}
            </Button>
          )}
          {p.status === 'CONFIRMED' && (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setAssignTarget(p); setSelectedDriver('') }}>
              <UserCheck className="w-3 h-3 mr-1" />{dict.common.actions}
            </Button>
          )}
          {p.status === 'ASSIGNED' && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); setPickupTarget(p) }} className="bg-emerald-600 hover:bg-emerald-700">
              <Truck className="w-3 h-3 mr-1" />{dict.statuses.PICKED_UP}
            </Button>
          )}
          {(p.status === 'PENDING' || p.status === 'CONFIRMED') && (
            <Button size="sm" variant="outline" className="text-destructive" onClick={(e) => { e.stopPropagation(); setCancelTarget(p) }}>
              <X className="w-3 h-3 mr-1" />{dict.statuses.CANCELLED}
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.nav.pickups}
        subtitle={`${pickups.length} ${L.subtitle}`}
        icon={PackageCheck}
        actions={
          <Button className="shadow-premium" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />{L.newPickup}
          </Button>
        }
      />
      <DataTable data={pickups} columns={columns} loading={loading} searchPlaceholder={`${dict.common.search}...`} searchKeys={['clientName', 'pickupAddress']} pageSize={10} />

      <EntityFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={L.newPickup}
        fields={formFields}
        onSubmit={handleSubmit}
      />

      {/* Assign driver dialog */}
      {assignTarget && (
        <EntityFormModal
          open={true}
          onOpenChange={(v) => !v && setAssignTarget(null)}
          title={`${dict.common.actions} - ${assignTarget.clientName}`}
          fields={[
            { key: 'driverId', label: dict.nav.drivers, type: 'select' as const, options: drivers, required: true },
          ]}
          onSubmit={async (data) => {
            await handleAction(assignTarget, 'assign')
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(v) => !v && setConfirmTarget(null)}
        title={dict.common.confirm}
        description={`${dict.common.confirm} ${confirmTarget?.clientName}?`}
        onConfirm={() => handleAction(confirmTarget!, 'confirm')}
        confirmLabel={dict.common.confirm}
      />

      <ConfirmDialog
        open={!!pickupTarget}
        onOpenChange={(v) => !v && setPickupTarget(null)}
        title={dict.statuses.PICKED_UP}
        description={`${dict.statuses.PICKED_UP} ${pickupTarget?.clientName}?`}
        onConfirm={() => handleAction(pickupTarget!, 'pickup')}
        confirmLabel={dict.statuses.PICKED_UP}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        title={dict.statuses.CANCELLED}
        description={`${dict.statuses.CANCELLED} ${cancelTarget?.clientName}?`}
        onConfirm={() => handleAction(cancelTarget!, 'cancel')}
        destructive
        confirmLabel={dict.statuses.CANCELLED}
      />
    </div>
  )
}
