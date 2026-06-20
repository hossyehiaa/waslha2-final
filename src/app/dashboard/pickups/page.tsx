'use client'

import { PackageCheck, Plus } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type Pickup = {
  id: string
  clientName: string
  pickupAddress: string
  packagesCount: number
  totalWeight: number
  status: string
  requestedDate: string
}

export default function ClientPickupsPage() {
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
    { key: 'pickupAddress', header: 'Address', cell: (p) => <span className="text-sm">{p.pickupAddress}</span> },
    { key: 'packagesCount', header: 'Packages', sortable: true, cell: (p) => <span className="font-medium">{p.packagesCount}</span> },
    { key: 'totalWeight', header: 'Weight', hideOnMobile: true, cell: (p) => <span className="text-xs">{p.totalWeight} kg</span> },
    { key: 'requestedDate', header: 'Requested For', sortable: true, cell: (p) => <span className="text-xs">{formatDateTime(p.requestedDate)}</span> },
    { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Pickup Requests" subtitle={`${pickups.length} pickup requests`} icon={PackageCheck} actions={<Button className="shadow-premium"><Plus className="w-4 h-4 mr-2" />New Pickup</Button>} />
      <DataTable data={pickups} columns={columns} loading={loading} searchPlaceholder="Search pickups..." searchKeys={['pickupAddress']} pageSize={10} />
    </div>
  )
}
