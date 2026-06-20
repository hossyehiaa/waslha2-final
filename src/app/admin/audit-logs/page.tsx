'use client'

import { useEffect, useState } from 'react'
import { ScrollText, Plus, Edit, Trash2, LogIn, LogOut } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { Card } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

type Log = {
  id: string
  userId: string | null
  userName: string
  action: string
  entity: string
  entityId: string | null
  beforeData: string | null
  afterData: string | null
  ipAddress: string | null
  createdAt: string
}

const ACTION_ICONS: Record<string, any> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  LOGIN: LogIn,
  LOGOUT: LogOut,
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-rose-100 text-rose-700',
  LOGIN: 'bg-cyan-100 text-cyan-700',
  LOGOUT: 'bg-zinc-100 text-zinc-700',
}

export default function AdminAuditLogsPage() {
  const { dict } = useLanguage()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/audit-logs')
      .then(r => r.json())
      .then(d => setLogs(d.logs || []))
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [dict])

  const columns: Column<Log>[] = [
    {
      key: 'createdAt',
      header: dict.common.date,
      sortable: true,
      cell: (l) => <span className="text-xs text-muted-foreground">{formatDateTime(l.createdAt)}</span>,
    },
    {
      key: 'userName',
      header: dict.common.profile,
      sortable: true,
      cell: (l) => <span className="font-medium text-sm">{l.userName}</span>,
    },
    {
      key: 'action',
      header: dict.common.actions,
      sortable: true,
      cell: (l) => {
        const Icon = ACTION_ICONS[l.action] || ScrollText
        return (
          <span className={`text-xs px-2 py-1 rounded font-medium inline-flex items-center gap-1 ${ACTION_COLORS[l.action] || 'bg-zinc-100 text-zinc-700'}`}>
            <Icon className="w-3 h-3" />
            {l.action}
          </span>
        )
      },
    },
    {
      key: 'entity',
      header: dict.common.status,
      cell: (l) => (
        <div>
          <div className="text-xs font-medium">{l.entity}</div>
          {l.entityId && <div className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">{l.entityId}</div>}
        </div>
      ),
    },
    {
      key: 'afterData',
      header: dict.common.details || 'Details',
      hideOnMobile: true,
      cell: (l) => {
        let data = ''
        try {
          if (l.afterData) data = l.afterData
          else if (l.beforeData) data = l.beforeData
        } catch {}
        return <span className="text-xs text-muted-foreground font-mono truncate max-w-[300px] block">{data}</span>
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" subtitle={`${logs.length} system actions`} icon={ScrollText} />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'].map((action) => {
          const count = logs.filter(l => l.action === action).length
          const Icon = ACTION_ICONS[action] || ScrollText
          return (
            <Card key={action} className="p-4">
              <div className={`w-9 h-9 rounded-lg ${ACTION_COLORS[action]} flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-xl font-bold">{count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{action}</div>
            </Card>
          )
        })}
      </div>
      <DataTable data={logs} columns={columns} loading={loading} searchPlaceholder={`${dict.common.search}...`} searchKeys={['userName', 'entity', 'action']} pageSize={15} />
    </div>
  )
}
