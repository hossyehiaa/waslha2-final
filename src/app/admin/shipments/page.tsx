'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Plus, Download, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { BulkStatusDialog } from '@/components/dashboard/bulk-status-dialog'
import { useBulkStatus } from '@/components/dashboard/use-bulk-status'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatTimeAgo } from '@/lib/format'
import { downloadExcel } from '@/lib/export-utils'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

type Shipment = {
  id: string
  trackingNumber: string
  client: string
  clientId: string
  senderCity: string
  recipientCity: string
  recipientName: string
  recipientPhone: string
  status: string
  paymentStatus: string
  serviceType: string
  priority: string
  weight: number
  pieces: number
  codAmount: number
  shippingCost: number
  description: string | null
  driver: { name: string; code: string } | null
  createdAt: string
  deliveredAt: string | null
}

export default function AdminShipmentsPage() {
  const router = useRouter()
  const { dict, isRTL } = useLanguage()
  const L = dict.pages.shipments
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/shipments?status=${statusFilter}&limit=200`)
      .then(r => r.json())
      .then(d => setShipments(d.shipments || []))
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [statusFilter, dict])

  useEffect(() => { load() }, [load])

  const { selectedIds, setSelectedIds, dialogOpen, setDialogOpen, loading: applying, applyStatus } = useBulkStatus(load)

  function exportShipments() {
    const rows = selectedIds.length > 0
      ? shipments.filter((shipment) => selectedIds.includes(shipment.id))
      : shipments
    const exportRows = rows.map((shipment) => ({
      [isRTL ? 'رقم التتبع' : 'Tracking #']: shipment.trackingNumber,
      [isRTL ? 'العميل' : 'Client']: shipment.client,
      [isRTL ? 'المسار' : 'Route']: `${shipment.senderCity} → ${shipment.recipientCity}`,
      [isRTL ? 'المستلم' : 'Recipient']: shipment.recipientName,
      [isRTL ? 'هاتف المستلم' : 'Recipient phone']: shipment.recipientPhone,
      [isRTL ? 'الحالة' : 'Status']: shipment.status,
      [isRTL ? 'حالة التحصيل' : 'Payment status']: shipment.paymentStatus,
      [isRTL ? 'التحصيل' : 'COD']: shipment.codAmount,
      [isRTL ? 'سعر الشحن' : 'Shipping cost']: shipment.shippingCost,
      [isRTL ? 'تاريخ الإنشاء' : 'Created at']: shipment.createdAt,
    }))
    downloadExcel(exportRows, 'shipments')
  }

  const columns: Column<Shipment>[] = [
    {
      key: 'trackingNumber',
      header: L.tracking || 'Tracking #',
      sortable: true,
      cell: (s) => <span className="font-mono font-medium text-xs">{s.trackingNumber}</span>,
    },
    {
      key: 'client',
      header: L.client || 'Client',
      sortable: true,
      cell: (s) => <span className="font-medium">{s.client}</span>,
    },
    {
      key: 'route',
      header: L.route || 'Route',
      hideOnMobile: true,
      cell: (s) => <span className="text-xs text-muted-foreground">{s.senderCity} → {s.recipientCity}</span>,
    },
    {
      key: 'recipient',
      header: L.recipient || 'Recipient',
      hideOnMobile: true,
      cell: (s) => (
        <div>
          <div className="text-xs font-medium">{s.recipientName}</div>
          <div className="text-xs text-muted-foreground">{s.recipientPhone}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: dict.common.status,
      cell: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: 'paymentStatus',
      header: dict.pages.shipments.paymentStatus,
      hideOnMobile: true,
      cell: (s) => <StatusBadge status={s.paymentStatus} />,
    },
    {
      key: 'codAmount',
      header: L.cod || 'COD',
      sortable: true,
      cell: (s) => <span className="font-medium text-xs">{formatCurrency(s.codAmount)}</span>,
    },
    {
      key: 'createdAt',
      header: L.created || 'Created',
      sortable: true,
      hideOnMobile: true,
      cell: (s) => <span className="text-xs text-muted-foreground">{formatTimeAgo(s.createdAt)}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.nav.shipments}
        subtitle={`${shipments.length} ${L.listSubtitle}`}
        icon={Package}
        actions={
          <>
            <Button variant="outline" onClick={exportShipments} disabled={loading || shipments.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              {dict.common.export}
            </Button>
            <Button onClick={() => router.push('/admin/shipments/new')} className="shadow-premium">
              <Plus className="w-4 h-4 mr-2" />
              {L.newShipment}
            </Button>
          </>
        }
      />
      <DataTable
        data={shipments}
        columns={columns}
        loading={loading}
        searchPlaceholder={L.searchPlaceholder}
        searchKeys={['trackingNumber', 'recipientName', 'recipientPhone']}
        enableSelection
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        selectionLabel={isRTL ? 'شحنة محددة' : 'selected'}
        bulkBar={
          <Button size="sm" className="shadow-premium" onClick={() => setDialogOpen(true)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            {isRTL ? 'تغيير الحالة' : 'Change status'}
          </Button>
        }
        filters={[
          {
            label: dict.common.status,
            value: statusFilter,
            options: [
              { label: dict.statuses.PENDING, value: 'PENDING' },
              { label: dict.statuses.PICKED_UP, value: 'PICKED_UP' },
              { label: dict.statuses.IN_TRANSIT, value: 'IN_TRANSIT' },
              { label: dict.statuses.OUT_FOR_DELIVERY, value: 'OUT_FOR_DELIVERY' },
              { label: dict.statuses.DELIVERED, value: 'DELIVERED' },
              { label: dict.statuses.RETURNED, value: 'RETURNED' },
              { label: dict.statuses.FAILED, value: 'FAILED' },
              { label: dict.statuses.CANCELLED, value: 'CANCELLED' },
            ],
            onChange: (v) => setStatusFilter(v),
          },
        ]}
        onRowClick={(s) => router.push(`/admin/shipments/${s.id}`)}
        pageSize={12}
      />

      <BulkStatusDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        count={selectedIds.length}
        onConfirm={applyStatus}
        loading={applying}
      />
    </div>
  )
}
