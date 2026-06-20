'use client'

import { useEffect, useState } from 'react'
import { UserCog, Plus, Briefcase, Wallet, Star } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency, formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'

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
  hireDate: string
  lastLoginAt: string | null
}

const POSITIONS: Record<string, string> = {
  MANAGER: 'Manager',
  SUPERVISOR: 'Supervisor',
  CLERK: 'Clerk',
  AGENT: 'Agent',
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/employees')
      .then(r => r.json())
      .then(d => setEmployees(d.employees || []))
      .catch(() => toast.error('Failed to load employees'))
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<Employee>[] = [
    {
      key: 'fullName',
      header: 'Employee',
      sortable: true,
      cell: (e) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center font-bold text-sm shrink-0">
            {e.fullName.split(' ').map(w => w[0]).slice(0, 2).join('')}
          </div>
          <div>
            <div className="font-medium">{e.fullName}</div>
            <div className="text-xs text-muted-foreground font-mono">{e.employeeCode}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'position',
      header: 'Position',
      sortable: true,
      cell: (e) => <span className="text-xs px-2 py-1 rounded bg-muted font-medium">{POSITIONS[e.position] || e.position}</span>,
    },
    {
      key: 'contact',
      header: 'Contact',
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
      header: 'Branch',
      hideOnMobile: true,
      cell: (e) => <span className="text-xs">{e.branch || '-'}</span>,
    },
    {
      key: 'salary',
      header: 'Salary',
      sortable: true,
      cell: (e) => <span className="font-medium text-xs">{formatCurrency(e.salary)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (e) => <StatusBadge status={e.status} />,
    },
    {
      key: 'lastLoginAt',
      header: 'Last Active',
      hideOnMobile: true,
      cell: (e) => <span className="text-xs text-muted-foreground">{e.lastLoginAt ? formatTimeAgo(e.lastLoginAt) : 'Never'}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} staff members`}
        icon={UserCog}
        actions={<Button className="shadow-premium"><Plus className="w-4 h-4 mr-2" />New Employee</Button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: employees.length, icon: UserCog, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Managers', value: employees.filter(e => e.position === 'MANAGER').length, icon: Briefcase, color: 'bg-purple-100 text-purple-700' },
          { label: 'Total Salaries', value: formatCurrency(employees.reduce((s, e) => s + e.salary, 0)), icon: Wallet, color: 'bg-amber-100 text-amber-700' },
          { label: 'Active', value: employees.filter(e => e.status === 'ACTIVE').length, icon: Star, color: 'bg-teal-100 text-teal-700' },
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
        searchPlaceholder="Search by name, code, username..."
        searchKeys={['fullName', 'username', 'employeeCode']}
        pageSize={10}
      />
    </div>
  )
}
