'use client'

import { useEffect, useState } from 'react'
import { Shield, Plus, CheckCircle, XCircle, Eye, DollarSign } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { EntityFormModal } from '@/components/dashboard/entity-form-modal'
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog'

type Claim = {
  id: string
  claimNumber: string
  client: string
  clientId: string
  shipment: string
  shipmentId: string
  type: string
  description: string
  claimedAmount: number
  approvedAmount: number | null
  status: string
  notes: string | null
  createdAt: string
  processedAt: string | null
}

export default function AdminInsuranceClaimsPage() {
  const { dict } = useLanguage()
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [actionTarget, setActionTarget] = useState<Claim | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'pay' | 'review'>('approve')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/insurance-claims')
      const data = await res.json()
      setClaims(data.claims || [])
    } catch {
      toast.error('Failed to load claims')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAction(action: 'approve' | 'reject' | 'pay' | 'review') {
    if (!actionTarget) return
    const res = await fetch('/api/admin/insurance-claims', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: actionTarget.id,
        action,
        approvedAmount: action === 'approve' ? actionTarget.claimedAmount : undefined,
      }),
    })
    if (!res.ok) { toast.error('Failed'); return }
    toast.success(`Claim ${action}d`)
    setActionTarget(null)
    load()
  }

  const columns: Column<Claim>[] = [
    { key: 'claimNumber', header: 'Claim #', sortable: true, cell: (c) => <span className="font-mono font-medium text-xs">{c.claimNumber}</span> },
    { key: 'client', header: 'Client', sortable: true, cell: (c) => <span className="font-medium">{c.client}</span> },
    { key: 'shipment', header: 'Shipment', hideOnMobile: true, cell: (c) => <span className="font-mono text-xs">{c.shipment}</span> },
    { key: 'type', header: 'Type', cell: (c) => <span className="text-xs px-2 py-1 rounded bg-muted">{c.type.replace(/_/g, ' ')}</span> },
    { key: 'claimedAmount', header: 'Claimed', sortable: true, cell: (c) => <span className="font-medium text-xs">{formatCurrency(c.claimedAmount)}</span> },
    { key: 'approvedAmount', header: 'Approved', hideOnMobile: true, cell: (c) => <span className="text-xs">{c.approvedAmount ? formatCurrency(c.approvedAmount) : '-'}</span> },
    { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    { key: 'createdAt', header: 'Filed', sortable: true, hideOnMobile: true, cell: (c) => <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      cell: (c) => (
        <div className="flex gap-1">
          {c.status === 'PENDING' && (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setActionTarget(c); setActionType('review'); handleAction('review') }}>
              Review
            </Button>
          )}
          {(c.status === 'PENDING' || c.status === 'UNDER_REVIEW') && (
            <>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={(e) => { e.stopPropagation(); setActionTarget(c); setActionType('approve'); handleAction('approve') }}>
                <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={(e) => { e.stopPropagation(); setActionTarget(c); setActionType('reject'); handleAction('reject') }}>
                <XCircle className="w-3.5 h-3.5 mr-1" />Reject
              </Button>
            </>
          )}
          {c.status === 'APPROVED' && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); setActionTarget(c); setActionType('pay'); handleAction('pay') }}>
              <DollarSign className="w-3.5 h-3.5 mr-1" />Pay
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Insurance Claims" subtitle="Process damage, loss, and partial damage claims" icon={Shield} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Claims', value: claims.length, color: 'bg-blue-100 text-blue-700' },
          { label: 'Pending', value: claims.filter(c => c.status === 'PENDING').length, color: 'bg-amber-100 text-amber-700' },
          { label: 'Approved', value: claims.filter(c => c.status === 'APPROVED').length, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Total Claimed', value: formatCurrency(claims.reduce((s, c) => s + c.claimedAmount, 0)), color: 'bg-purple-100 text-purple-700' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>
      <DataTable
        data={claims}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search claims..."
        searchKeys={['claimNumber', 'client', 'shipment']}
        exportFilename="insurance_claims"
        pageSize={10}
      />
    </div>
  )
}
