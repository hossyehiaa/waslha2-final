'use client'

import { useEffect, useState } from 'react'
import { PackageCheck, Plus } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

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
  const { dict } = useLanguage()
  const L = dict.pages.pickups
  const [pickups, setPickups] = useState<Pickup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/pickups')
      .then(r => r.json())
      .then(d => setPickups(d.pickups || []))
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [dict])

  const columns: Column<Pickup>[] = [
    { key: 'pickupAddress', header: L.address, cell: (p) => <span className="text-sm">{p.pickupAddress}</span> },
    { key: 'packagesCount', header: L.packages, sortable: true, cell: (p) => <span className="font-medium">{p.packagesCount}</span> },
    { key: 'totalWeight', header: L.weight, hideOnMobile: true, cell: (p) => <span className="text-xs">{p.totalWeight} kg</span> },
    { key: 'requestedDate', header: L.requested, sortable: true, cell: (p) => <span className="text-xs">{formatDateTime(p.requestedDate)}</span> },
    { key: 'status', header: dict.common.status, cell: (p) => <StatusBadge status={p.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={dict.nav.pickups} subtitle={`${pickups.length} ${L.subtitle}`} icon={PackageCheck} actions={<Button className="shadow-premium"><Plus className="w-4 h-4 mr-2" />{L.newPickup}</Button>} />
      <DataTable data={pickups} columns={columns} loading={loading} searchPlaceholder={`${dict.common.search}...`} searchKeys={['pickupAddress']} pageSize={10} />
    </div>
  )
}
