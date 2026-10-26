'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, MapPin, Package, RefreshCw, Search, Truck, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/format'
import { useLanguage } from '@/components/language-provider'
import { toast } from 'sonner'

type Shipment = {
  id: string
  trackingNumber: string
  client: string
  recipientName: string
  recipientPhone: string
  recipientCity: string
  status: string
  codAmount: number
  driver: { name: string; code: string } | null
  createdAt: string
}

type Driver = {
  id: string
  fullName: string
  phone: string | null
  driverCode: string
  status: string
}

async function fetchAllShipments(status: string): Promise<Shipment[]> {
  const params = new URLSearchParams({ status, limit: '100', page: '1' })
  const firstResponse = await fetch(`/api/shipments?${params}`)
  const firstData = await firstResponse.json()
  if (!firstResponse.ok) throw new Error(firstData.error || 'Failed to load shipments')

  const shipments: Shipment[] = firstData.shipments || []
  const totalPages = Number(firstData.totalPages || 1)
  if (totalPages <= 1) return shipments

  const pages = await Promise.all(Array.from({ length: totalPages - 1 }, async (_, index) => {
    const pageParams = new URLSearchParams({ status, limit: '100', page: String(index + 2) })
    const response = await fetch(`/api/shipments?${pageParams}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to load shipments')
    return (data.shipments || []) as Shipment[]
  }))
  return shipments.concat(...pages)
}

export default function AssignShipmentsPage() {
  const { isRTL } = useLanguage()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [driverId, setDriverId] = useState('')
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [inTransit, outForDelivery, driversResponse] = await Promise.all([
        fetchAllShipments('IN_TRANSIT'),
        fetchAllShipments('OUT_FOR_DELIVERY'),
        fetch('/api/admin/drivers'),
      ])
      const driversData = await driversResponse.json()
      if (!driversResponse.ok) throw new Error(driversData.error || 'Failed to load drivers')

      setShipments([...inTransit, ...outForDelivery].filter((shipment) => !shipment.driver))
      setDrivers((driversData.drivers || []).filter((driver: Driver) => driver.status === 'ACTIVE'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRTL ? 'تعذر تحميل بيانات التوزيع' : 'Could not load assignment data'))
    } finally {
      setLoading(false)
    }
  }, [isRTL])

  useEffect(() => {
    // State updates in loadData happen only after its network requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData()
  }, [loadData])

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return shipments
    return shipments.filter((shipment) => [
      shipment.trackingNumber,
      shipment.client,
      shipment.recipientName,
      shipment.recipientPhone,
      shipment.recipientCity,
    ].some((value) => (value || '').toLowerCase().includes(query)))
  }, [search, shipments])

  const allFilteredSelected = filteredShipments.length > 0 && filteredShipments.every((shipment) => selectedIds.includes(shipment.id))

  function toggleAll() {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredShipments.map((shipment) => shipment.id))
      setSelectedIds((current) => current.filter((id) => !filteredIds.has(id)))
    } else {
      setSelectedIds((current) => Array.from(new Set([...current, ...filteredShipments.map((shipment) => shipment.id)])))
    }
  }

  async function assignSelected() {
    if (!driverId || selectedIds.length === 0) return
    setAssigning(true)
    let assigned = 0
    const failures: string[] = []
    const selectedShipments = shipments.filter((shipment) => selectedIds.includes(shipment.id))
    const chosenDriver = drivers.find((driver) => driver.id === driverId)

    try {
      for (const shipment of selectedShipments) {
        try {
          const isAlreadyOutForDelivery = shipment.status === 'OUT_FOR_DELIVERY'
          const response = await fetch(isAlreadyOutForDelivery
            ? `/api/shipments/${shipment.id}`
            : `/api/shipments/${shipment.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(isAlreadyOutForDelivery
              ? { driverId }
              : { status: 'OUT_FOR_DELIVERY', driverId, note: 'Assigned to driver from delivery assignment page' }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || 'Assignment failed')
          assigned += 1
        } catch (error) {
          failures.push(`${shipment.trackingNumber}: ${error instanceof Error ? error.message : 'Assignment failed'}`)
        }
      }

      if (assigned > 0) {
        toast.success(isRTL
          ? `تم إسناد ${assigned} شحنة إلى ${chosenDriver?.fullName || 'المندوب'}`
          : `Assigned ${assigned} shipment(s) to ${chosenDriver?.fullName || 'the driver'}`)
        setSelectedIds([])
        setLoading(true)
        await loadData()
      }
      if (failures.length > 0) {
        toast.error(isRTL
          ? `تعذر إسناد ${failures.length} شحنة. حدّث الصفحة وحاول مرة أخرى.`
          : `Could not assign ${failures.length} shipment(s). Refresh and try again.`)
      }
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isRTL ? 'توزيع الشحنات للمناديب' : 'Assign shipments to drivers'}
        subtitle={isRTL ? 'اختر الشحنات الجاهزة للتوصيل ثم أسندها إلى مندوب نشط' : 'Select shipments ready for delivery and assign them to an active driver'}
        icon={UserPlus}
        actions={(
          <Button variant="outline" onClick={() => { setLoading(true); void loadData() }} disabled={loading || assigning}>
            <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'} ${loading ? 'animate-spin' : ''}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Package className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">{isRTL ? 'شحنات بانتظار التوزيع' : 'Shipments waiting for assignment'}</p>
            <p className="text-xl font-bold">{shipments.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><Truck className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">{isRTL ? 'مناديب نشطون' : 'Active drivers'}</p>
            <p className="text-xl font-bold">{drivers.length}</p>
          </div>
        </Card>
      </div>

      {drivers.length === 0 && !loading && (
        <Card className="flex flex-col items-start gap-3 border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/20">
          <p className="text-sm">{isRTL ? 'لا يوجد مندوب نشط. أضف مندوبًا أو فعّل حسابه أولًا.' : 'There are no active drivers. Add a driver or activate an existing account first.'}</p>
          <Button asChild variant="outline" size="sm"><Link href="/admin/drivers">{isRTL ? 'إدارة المناديب' : 'Manage drivers'}</Link></Button>
        </Card>
      )}

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isRTL ? 'ابحث برقم الشحنة أو اسم المستلم أو المدينة' : 'Search tracking number, recipient, or city'}
              className={isRTL ? 'pr-9' : 'pl-9'}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger className="w-full sm:w-[260px]" disabled={drivers.length === 0 || assigning}>
                <SelectValue placeholder={isRTL ? 'اختر المندوب' : 'Choose a driver'} />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>{driver.fullName} ({driver.driverCode})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => void assignSelected()} disabled={!driverId || selectedIds.length === 0 || assigning || loading}>
              {assigning ? <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} /> : <CheckCircle2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />}
              {isRTL ? `إسناد المحدد (${selectedIds.length})` : `Assign selected (${selectedIds.length})`}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {isRTL ? 'جاري تحميل الشحنات والمناديب...' : 'Loading shipments and drivers...'}
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Package className="mx-auto mb-3 h-11 w-11 opacity-30" />
            <p className="text-sm font-medium">{search ? (isRTL ? 'لا توجد نتائج مطابقة للبحث' : 'No matching shipments') : (isRTL ? 'لا توجد شحنات غير مسندة جاهزة للتوصيل' : 'No unassigned shipments are ready for delivery')}</p>
            <p className="mt-1 text-xs">{isRTL ? 'تظهر هنا الشحنات الموجودة في الطريق أو الخارجة للتوصيل والتي لم تُسند إلى مندوب.' : 'In-transit or out-for-delivery shipments without a driver appear here.'}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{isRTL ? `${filteredShipments.length} شحنة` : `${filteredShipments.length} shipment(s)`}</span>
              <button type="button" className="font-medium text-primary hover:underline" onClick={toggleAll}>
                {allFilteredSelected ? (isRTL ? 'إلغاء تحديد الكل' : 'Clear selection') : (isRTL ? 'تحديد الكل' : 'Select all')}
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-3 text-center"><Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} aria-label={isRTL ? 'تحديد كل الشحنات' : 'Select all shipments'} /></th>
                    <th className="px-3 py-3 text-start">{isRTL ? 'رقم الشحنة' : 'Tracking number'}</th>
                    <th className="px-3 py-3 text-start">{isRTL ? 'المستلم' : 'Recipient'}</th>
                    <th className="px-3 py-3 text-start">{isRTL ? 'المدينة' : 'City'}</th>
                    <th className="px-3 py-3 text-start">{isRTL ? 'الحالة' : 'Status'}</th>
                    <th className="px-3 py-3 text-start">{isRTL ? 'التحصيل' : 'COD'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-3 text-center">
                        <Checkbox
                          checked={selectedIds.includes(shipment.id)}
                          onCheckedChange={(checked) => setSelectedIds((current) => checked ? [...current, shipment.id] : current.filter((id) => id !== shipment.id))}
                          aria-label={`${isRTL ? 'تحديد الشحنة' : 'Select shipment'} ${shipment.trackingNumber}`}
                        />
                      </td>
                      <td className="px-3 py-3 font-mono text-xs font-semibold">{shipment.trackingNumber}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{shipment.recipientName}</div>
                        <a className="text-xs text-muted-foreground hover:text-primary" href={`tel:${shipment.recipientPhone}`}>{shipment.recipientPhone}</a>
                      </td>
                      <td className="px-3 py-3 text-xs"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{shipment.recipientCity}</span></td>
                      <td className="px-3 py-3 text-xs">{shipment.status === 'IN_TRANSIT' ? (isRTL ? 'في الطريق' : 'In transit') : (isRTL ? 'خرج للتوصيل' : 'Out for delivery')}</td>
                      <td className="px-3 py-3 text-xs font-medium">{formatCurrency(shipment.codAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
