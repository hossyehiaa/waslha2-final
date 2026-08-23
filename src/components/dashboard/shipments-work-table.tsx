'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Package, Clock, Banknote, Layers, FileText, CalendarClock, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { BulkStatusDialog } from '@/components/dashboard/bulk-status-dialog'
import { useBulkStatus } from '@/components/dashboard/use-bulk-status'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency, formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

type Shipment = {
  id: string
  trackingNumber: string
  client: string
  senderCity: string
  recipientCity: string
  recipientName: string
  recipientPhone: string
  status: string
  codAmount: number
  createdAt: string
}

/**
 * Shared, selection-enabled shipments table used by every shipments sub-page
 * (movement, deleted, pending, pending-api, delivery, postponed, collection).
 * Staff can select any subset (or all) and force any lifecycle status.
 */
export function ShipmentsWorkTable({
  title,
  subtitle,
  icon,
  apiStatus,
  limit = 200,
}: {
  title: string
  subtitle: string
  icon: 'movement' | 'deleted' | 'pending' | 'pending-api' | 'delivery' | 'postponed' | 'collection'
  apiStatus: string
  limit?: number
}) {
  const router = useRouter()
  const { dict, isRTL } = useLanguage()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/shipments?status=${apiStatus}&limit=${limit}`)
      .then((r) => r.json())
      .then((d) => {
        setShipments(d.shipments || [])
        setTotal(d.total || 0)
      })
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [apiStatus, limit, dict])

  useEffect(() => {
    load()
  }, [load])

  const { selectedIds, setSelectedIds, dialogOpen, setDialogOpen, loading: applying, applyStatus } = useBulkStatus(load)

  const icons: Record<string, LucideIcon> = {
    movement: RefreshCw,
    deleted: FileText,
    pending: Clock,
    'pending-api': Layers,
    delivery: Truck,
    postponed: CalendarClock,
    collection: Banknote,
  }
  const Icon = icons[icon] || Package

  const columns: Column<Shipment>[] = [
    {
      key: 'trackingNumber',
      header: isRTL ? 'رقم التتبع' : 'Tracking #',
      sortable: true,
      cell: (s) => <span className="font-mono font-medium text-xs">{s.trackingNumber}</span>,
    },
    {
      key: 'client',
      header: isRTL ? 'العميل' : 'Client',
      sortable: true,
      cell: (s) => <span className="font-medium text-xs">{s.client}</span>,
    },
    {
      key: 'route',
      header: isRTL ? 'المسار' : 'Route',
      hideOnMobile: true,
      cell: (s) => <span className="text-xs text-muted-foreground">{s.senderCity} → {s.recipientCity}</span>,
    },
    {
      key: 'recipient',
      header: isRTL ? 'المستلم' : 'Recipient',
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
      key: 'codAmount',
      header: 'COD',
      sortable: true,
      cell: (s) => <span className="font-medium text-xs">{formatCurrency(s.codAmount)}</span>,
    },
    {
      key: 'createdAt',
      header: isRTL ? 'التاريخ' : 'Date',
      sortable: true,
      hideOnMobile: true,
      cell: (s) => <span className="text-xs text-muted-foreground">{formatTimeAgo(s.createdAt)}</span>,
    },
  ]

  const totalCod = shipments.reduce((s, x) => s + x.codAmount, 0)

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} icon={Icon} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{isRTL ? 'العدد الإجمالي' : 'Total'}</div>
          <div className="text-xl font-bold mt-1">{total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{isRTL ? 'إجمالي COD' : 'Total COD'}</div>
          <div className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(totalCod)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{isRTL ? 'في الصفحة' : 'In page'}</div>
          <div className="text-xl font-bold mt-1">{shipments.length}</div>
        </Card>
      </div>

      <DataTable
        data={shipments}
        columns={columns}
        loading={loading}
        searchPlaceholder={isRTL ? 'بحث برقم التتبع أو العميل...' : 'Search tracking # or client...'}
        searchKeys={['trackingNumber', 'client', 'recipientName', 'recipientPhone']}
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
