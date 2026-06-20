'use client'

import { useEffect, useState } from 'react'
import { Building2, Plus, Users, Truck, Boxes } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

type Branch = {
  id: string
  name: string
  code: string
  phone: string | null
  address: string | null
  city: string | null
  status: string
  clients: number
  employees: number
  drivers: number
  warehouses: number
  createdAt: string
}

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/branches')
      .then(r => r.json())
      .then(d => setBranches(d.branches || []))
      .catch(() => toast.error('Failed to load branches'))
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<Branch>[] = [
    {
      key: 'name',
      header: 'Branch',
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
    {
      key: 'city',
      header: 'City',
      hideOnMobile: true,
      cell: (b) => <span className="text-xs">{b.city || '-'}</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      hideOnMobile: true,
      cell: (b) => <span className="text-xs">{b.phone || '-'}</span>,
    },
    {
      key: 'clients',
      header: 'Clients',
      cell: (b) => (
        <div className="flex items-center gap-1 text-xs">
          <Users className="w-3 h-3 text-muted-foreground" />
          {b.clients}
        </div>
      ),
    },
    {
      key: 'employees',
      header: 'Staff',
      hideOnMobile: true,
      cell: (b) => (
        <div className="flex items-center gap-1 text-xs">
          <Users className="w-3 h-3 text-muted-foreground" />
          {b.employees}
        </div>
      ),
    },
    {
      key: 'drivers',
      header: 'Drivers',
      hideOnMobile: true,
      cell: (b) => (
        <div className="flex items-center gap-1 text-xs">
          <Truck className="w-3 h-3 text-muted-foreground" />
          {b.drivers}
        </div>
      ),
    },
    {
      key: 'warehouses',
      header: 'Storage',
      hideOnMobile: true,
      cell: (b) => (
        <div className="flex items-center gap-1 text-xs">
          <Boxes className="w-3 h-3 text-muted-foreground" />
          {b.warehouses}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (b) => <StatusBadge status={b.status} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        subtitle={`${branches.length} operational branches`}
        icon={Building2}
        actions={<Button className="shadow-premium"><Plus className="w-4 h-4 mr-2" />New Branch</Button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Branches', value: branches.length, icon: Building2, color: 'bg-teal-100 text-teal-700' },
          { label: 'Total Clients', value: branches.reduce((s, b) => s + b.clients, 0), icon: Users, color: 'bg-purple-100 text-purple-700' },
          { label: 'Total Drivers', value: branches.reduce((s, b) => s + b.drivers, 0), icon: Truck, color: 'bg-cyan-100 text-cyan-700' },
          { label: 'Warehouses', value: branches.reduce((s, b) => s + b.warehouses, 0), icon: Boxes, color: 'bg-emerald-100 text-emerald-700' },
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
        searchPlaceholder="Search branches..."
        searchKeys={['name', 'code', 'city']}
        pageSize={10}
      />
    </div>
  )
}
