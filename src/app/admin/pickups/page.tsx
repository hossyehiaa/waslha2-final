'use client'

import { useEffect, useState } from 'react'
import { PackageCheck, Plus } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'

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
  notes: string | null
}

export default function AdminPickupsPage() {
  const [pickups, setPickups] = useState<Pickup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/pickups')
      .then(r => r.json())
      .then(d => setPickups(d.pickups || []))
      .catch(() => toast.error('Failed to load pickups'))
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<Pickup>[] = [
    { key: 'clientName', header: 'Client', sortable: true, cell: (p) => <span className="font-medium">{p.clientName}</span> },
    { key: 'pickupAddress', header: 'Address', hideOnMobile: true, cell: (p) => <span className="text-xs text-muted-foreground">{p.pickupAddress}</span> },
    { key: 'packagesCount', header: 'Packages', sortable: true, cell: (p) => <span className="font-medium">{p.packagesCount}</span> },
    { key: 'totalWeight', header: 'Weight', hideOnMobile: true, cell: (p) => <span className="text-xs">{p.totalWeight} kg</span> },
    { key: 'requestedDate', header: 'Requested', sortable: true, cell: (p) => <span className="text-xs text-muted-foreground">{formatDateTime(p.requestedDate)}</span> },
    { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Pickup Requests" subtitle={`${pickups.length} pickup requests`} icon={PackageCheck} actions={<Button className="shadow-premium"><Plus className="w-4 h-4 mr-2" />New Pickup</Button>} />
      <DataTable data={pickups} columns={columns} loading={loading} searchPlaceholder="Search pickups..." searchKeys={['clientName', 'pickupAddress']} pageSize={10} />
    </div>
  )
}
