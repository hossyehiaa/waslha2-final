'use client'

import { useEffect, useState } from 'react'
import { Shield, Plus } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { EntityFormModal } from '@/components/dashboard/entity-form-modal'

type Claim = {
  id: string
  claimNumber: string
  shipment: string
  shipmentId: string
  type: string
  description: string
  claimedAmount: number
  approvedAmount: number | null
  status: string
  notes: string | null
  createdAt: string
}

export default function ClientInsuranceClaimsPage() {
  const { dict } = useLanguage()
  const [claims, setClaims] = useState<Claim[]>([])
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/insurance-claims')
      const data = await res.json()
      setClaims(data.claims || [])
      // Load shipments for dropdown
      const shipRes = await fetch('/api/shipments?limit=100')
      const shipData = await shipRes.json()
      setShipments(shipData.shipments || [])
    } catch {
      toast.error('Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const columns: Column<Claim>[] = [
    { key: 'claimNumber', header: 'Claim #', sortable: true, cell: (c) => <span className="font-mono font-medium text-xs">{c.claimNumber}</span> },
    { key: 'shipment', header: 'Shipment', hideOnMobile: true, cell: (c) => <span className="font-mono text-xs">{c.shipment}</span> },
    { key: 'type', header: 'Type', cell: (c) => <span className="text-xs px-2 py-1 rounded bg-muted">{c.type.replace(/_/g, ' ')}</span> },
    { key: 'claimedAmount', header: 'Claimed', sortable: true, cell: (c) => <span className="font-medium text-xs">{formatCurrency(c.claimedAmount)}</span> },
    { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    { key: 'createdAt', header: 'Filed', sortable: true, hideOnMobile: true, cell: (c) => <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span> },
  ]

  async function handleSubmit(data: Record<string, any>) {
    const res = await fetch('/api/admin/insurance-claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shipmentId: data.shipmentId,
        type: data.type,
        description: data.description,
        claimedAmount: Number(data.claimedAmount),
      }),
    })
    if (!res.ok) { toast.error('Failed to file claim'); return }
    toast.success('Insurance claim filed')
    load()
  }

  const formFields = [
    {
      key: 'shipmentId',
      label: 'Shipment',
      type: 'select' as const,
      options: shipments.map(s => ({ label: `${s.trackingNumber} - ${s.recipientName}`, value: s.id })),
      required: true,
    },
    {
      key: 'type',
      label: 'Claim Type',
      type: 'select' as const,
      options: [
        { label: 'Damaged', value: 'DAMAGED' },
        { label: 'Lost', value: 'LOST' },
        { label: 'Partial Damage', value: 'PARTIAL_DAMAGE' },
      ],
      required: true,
      defaultValue: 'DAMAGED',
    },
    { key: 'description', label: 'Description', type: 'textarea' as const, required: true, placeholder: 'Describe the damage or issue...' },
    { key: 'claimedAmount', label: 'Claimed Amount (EGP)', type: 'number' as const, required: true, defaultValue: 0 },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance Claims"
        subtitle="File claims for damaged or lost shipments"
        icon={Shield}
        actions={
          <Button className="shadow-premium" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            File New Claim
          </Button>
        }
      />
      <DataTable
        data={claims}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search claims..."
        searchKeys={['claimNumber', 'shipment']}
        exportFilename="insurance_claims"
        pageSize={10}
      />
      <EntityFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="File Insurance Claim"
        fields={formFields}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
