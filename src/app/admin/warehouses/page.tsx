'use client'

import { useEffect, useState } from 'react'
import { Boxes, Plus } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { toast } from 'sonner'

type Warehouse = {
  id: string
  name: string
  code: string
  branchId: string | null
  capacity: number
  currentLoad: number
  address: string | null
  status: string
}

export default function AdminWarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/warehouses')
      .then(r => r.json())
      .then(d => setWarehouses(d.warehouses || []))
      .catch(() => toast.error('Failed to load warehouses'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses"
        subtitle={`${warehouses.length} storage facilities`}
        icon={Boxes}
        actions={<Button className="shadow-premium"><Plus className="w-4 h-4 mr-2" />New Warehouse</Button>}
      />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(loading ? [...Array(4)] : warehouses).map((w, i) => (
          <Card key={w?.id || i} className="p-6 hover:shadow-premium transition-all">
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
                  <StatusBadge status={w.status} />
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Capacity Used</span>
                      <span className="font-medium">{w.currentLoad} / {w.capacity}</span>
                    </div>
                    <Progress value={(w.currentLoad / w.capacity) * 100} className="h-2" />
                  </div>
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
    </div>
  )
}
