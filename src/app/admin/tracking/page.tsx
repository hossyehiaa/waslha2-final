'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Printer, Filter, ChevronLeft, ChevronRight,
  Phone, Edit, Trash2, MoreVertical, Eye, Package,
  MapPin, User, DollarSign, Clock, FileText, X,
  CheckCircle, XCircle, RotateCcw, Ban, Calendar,
} from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { formatCurrency, formatDate, formatDateTime, formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'

type Shipment = {
  id: string
  trackingNumber: string
  client: string
  clientId: string
  senderName: string
  senderPhone: string
  senderCity: string
  senderCityId: string
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  recipientCity: string
  recipientCityId: string
  status: string
  paymentStatus: string
  serviceType: string
  priority: string
  weight: number
  pieces: number
  codAmount: number
  shippingCost: number
  codFee: number
  totalCost: number
  description: string | null
  driver: { name: string; code: string } | null
  driverId: string | null
  failureReason: string | null
  branch: string | null
  createdAt: string
  deliveredAt: string | null
  pickupAt: string | null
  isExchange: boolean
  allowOpen: boolean
  notes: string | null
}

const STATUS_TABS = [
  { key: 'all', label: 'كل الشحنات', color: 'bg-primary' },
  { key: 'PENDING', label: 'قيد انتظار الموافقة', color: 'bg-amber-500' },
  { key: 'PICKED_UP', label: 'في مخزن الشحن', color: 'bg-blue-500' },
  { key: 'IN_TRANSIT', label: 'في الشحن', color: 'bg-indigo-500' },
  { key: 'OUT_FOR_DELIVERY', label: 'خرج للتوصيل', color: 'bg-cyan-500' },
  { key: 'DELIVERED', label: 'تم التسليم', color: 'bg-emerald-500' },
  { key: 'FAILED', label: 'فشل التوصيل', color: 'bg-rose-500' },
  { key: 'POSTPONED', label: 'مؤجلة', color: 'bg-orange-500' },
  { key: 'CANCELLED', label: 'ملغاه', color: 'bg-zinc-500' },
  { key: 'RETURNED', label: 'مرتجع', color: 'bg-red-500' },
]

export default function FollowUpShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [clientFilter, setClientFilter] = useState('all')
  const [clients, setClients] = useState<any[]>([])
  const [detailModal, setDetailModal] = useState<Shipment | null>(null)
  const [editModal, setEditModal] = useState<Shipment | null>(null)

  const pageSize = 25

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const status = activeTab === 'all' ? 'all' : activeTab
      const res = await fetch(`/api/shipments?status=${status}&limit=${pageSize}&page=${page}${clientFilter !== 'all' ? `&clientId=${clientFilter}` : ''}`)
      const data = await res.json()
      setShipments(data.shipments || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
      setLoading(false)
    }
    load()
     
  }, [activeTab, page, clientFilter])

  useEffect(() => {
    fetch('/api/admin/clients').then(r => r.json()).then(d => setClients(d.clients || []))
  }, [])

  async function loadShipments() {
    setLoading(true)
    const status = activeTab === 'all' ? 'all' : activeTab
    const offset = (page - 1) * pageSize
    const res = await fetch(`/api/shipments?status=${status}&limit=${pageSize}&page=${page}${clientFilter !== 'all' ? `&clientId=${clientFilter}` : ''}`)
    const data = await res.json()
    setShipments(data.shipments || [])
    setTotal(data.total || 0)
    setTotalPages(data.totalPages || 1)
    setLoading(false)
  }

 
  const filtered = search
    ? shipments.filter(s =>
        s.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
        s.recipientName.toLowerCase().includes(search.toLowerCase()) ||
        s.recipientPhone.includes(search) ||
        s.client.toLowerCase().includes(search.toLowerCase())
      )
    : shipments

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(s => s.id)))
  }

  async function updateStatus(shipmentId: string, newStatus: string, note?: string) {
    const res = await fetch(`/api/shipments/${shipmentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, note }),
    })
    if (!res.ok) {
      const d = await res.json()
      toast.error(d.error || 'فشل التحديث')
      return
    }
    toast.success('تم تحديث حالة الشحنة')
    loadShipments()
  }

  async function updateShipment(shipmentId: string, data: any) {
    const res = await fetch(`/api/shipments/${shipmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) { toast.error('فشل التحديث'); return }
    toast.success('تم تحديث الشحنة')
    setEditModal(null)
    loadShipments()
  }

  const columns = [
    { key: 'index', header: 'م', width: '40px' },
    { key: 'trackingNumber', header: 'رقم البوليصة', width: '120px' },
    { key: 'client', header: 'كود التاجر', width: '100px' },
    { key: 'createdAt', header: 'تاريخ الدخول', width: '100px' },
    { key: 'branch', header: 'الفرع', width: '80px' },
    { key: 'isExchange', header: 'استبدال', width: '60px' },
    { key: 'driver', header: 'مندوب التوصيل', width: '120px' },
    { key: 'senderName', header: 'الراسل', width: '140px' },
    { key: 'recipientName', header: 'المستلم', width: '140px' },
    { key: 'recipientCity', header: 'العنوان', width: '100px' },
    { key: 'description', header: 'محتوى الشحنة', width: '200px' },
    { key: 'notes', header: 'ملاحظات', width: '120px' },
    { key: 'shippingCost', header: 'الشحن', width: '80px' },
    { key: 'codAmount', header: 'إجمالي الشحنة', width: '100px' },
    { key: 'codFee', header: 'المستحق للعميل', width: '100px' },
    { key: 'codAmount', header: 'المطلوب تحصيله', width: '100px' },
    { key: 'paymentStatus', header: 'حالة التحصيل', width: '90px' },
    { key: 'paymentStatus', header: 'حالة السداد', width: '90px' },
    { key: 'status', header: 'حالة الفرع', width: '90px' },
    { key: 'status', header: 'حالة الشحنة', width: '100px' },
    { key: 'actions', header: 'خيارات', width: '80px' },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="متابعة الشحنات"
        subtitle={`${total} شحنة`}
        icon={Package}
        actions={
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                طباعة المحدد ({selected.size})
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              فلترة
            </Button>
          </div>
        }
      />

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-muted/30 rounded-xl">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === tab.key
                ? `${tab.color} text-white shadow-sm`
                : 'text-muted-foreground hover:bg-background'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم البوليصة، اسم المستلم، التليفون..."
            className="pr-10 h-9"
          />
        </div>
        <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue placeholder="اختر العميل" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل العملاء</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 sticky top-0">
              <tr className="border-b text-muted-foreground">
                <th className="py-2 px-2 w-8">
                  <Checkbox
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onCheckedChange={selectAll}
                  />
                </th>
                <th className="py-2 px-2 text-right font-medium">م</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">رقم البوليصة</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">كود التاجر</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">تاريخ الدخول</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">الفرع</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">استبدال</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">مندوب التوصيل</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">الراسل</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">المستلم</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">المدينة</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap max-w-[200px]">محتوى الشحنة</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">ملاحظات</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">الشحن</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">إجمالي الشحنة</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">المستحق للعميل</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">المطلوب تحصيله</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">حالة التحصيل</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">حالة السداد</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">حالة الفرع</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">حالة الشحنة</th>
                <th className="py-2 px-2 text-right font-medium whitespace-nowrap">خيارات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b">
                    {[...Array(22)].map((_, j) => <td key={j} className="py-2 px-2"><Skeleton className="h-5 w-full" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={22} className="py-16 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>لا توجد شحنات</p>
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    className={`border-b hover:bg-accent/20 transition-colors ${selected.has(s.id) ? 'bg-primary/5' : ''}`}
                  >
                    <td className="py-2 px-2">
                      <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{(page - 1) * pageSize + i + 1}</td>
                    <td className="py-2 px-2 font-mono font-medium whitespace-nowrap">{s.trackingNumber}</td>
                    <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{s.client}</td>
                    <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{formatDate(s.createdAt)}</td>
                    <td className="py-2 px-2 whitespace-nowrap">{s.branch || '-'}</td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      {s.isExchange ? <Badge className="bg-purple-100 text-purple-700">نعم</Badge> : <span className="text-muted-foreground">لا</span>}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">{s.driver?.name || '-'}</td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{s.senderName}</span>
                        <a href={`tel:${s.senderPhone}`} className="text-primary text-xs">{s.senderPhone}</a>
                      </div>
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{s.recipientName}</span>
                        <a href={`tel:${s.recipientPhone}`} className="text-primary text-xs">{s.recipientPhone}</a>
                      </div>
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">{s.recipientCity}</td>
                    <td className="py-2 px-2 max-w-[200px] truncate" title={s.description || ''}>{s.description || '-'}</td>
                    <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{s.notes || '-'}</td>
                    <td className="py-2 px-2 whitespace-nowrap">{formatCurrency(s.shippingCost)}</td>
                    <td className="py-2 px-2 font-medium whitespace-nowrap">{formatCurrency(s.codAmount)}</td>
                    <td className="py-2 px-2 text-emerald-600 whitespace-nowrap">{formatCurrency(s.codAmount - (s.codFee || 0))}</td>
                    <td className="py-2 px-2 font-bold text-amber-600 whitespace-nowrap">{formatCurrency(s.codAmount)}</td>
                    <td className="py-2 px-2"><StatusBadge status={s.paymentStatus} /></td>
                    <td className="py-2 px-2"><StatusBadge status={s.paymentStatus === 'SETTLED' ? 'SETTLED' : 'PENDING'} /></td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs">{s.status === 'PENDING' ? 'في فرع الإدخال' : s.status === 'IN_TRANSIT' ? 'في الشحن' : s.status === 'DELIVERED' ? 'تم التسليم' : s.status === 'RETURNED' ? 'مرتجع' : s.status}</Badge>
                    </td>
                    <td className="py-2 px-2"><StatusBadge status={s.status} /></td>
                    <td className="py-2 px-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setDetailModal(s)}>
                            <Eye className="w-4 h-4 mr-2" /> عرض التفاصيل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditModal(s)}>
                            <Edit className="w-4 h-4 mr-2" /> تعديل الشحنة
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(s.id, 'PICKED_UP')}>
                            <Package className="w-4 h-4 mr-2" /> استلام من المخزن
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(s.id, 'IN_TRANSIT')}>
                            <MapPin className="w-4 h-4 mr-2" /> تحويل للشحن
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(s.id, 'OUT_FOR_DELIVERY')}>
                            <User className="w-4 h-4 mr-2" /> خرج للتوصيل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(s.id, 'DELIVERED')} className="text-emerald-600">
                            <CheckCircle className="w-4 h-4 mr-2" /> تم التسليم
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(s.id, 'FAILED', 'العميل غير موجود')} className="text-rose-600">
                            <XCircle className="w-4 h-4 mr-2" /> فشل التوصيل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(s.id, 'RETURNED')} className="text-orange-600">
                            <RotateCcw className="w-4 h-4 mr-2" /> مرتجع
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(s.id, 'CANCELLED')} className="text-zinc-600">
                            <Ban className="w-4 h-4 mr-2" /> إلغاء
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => window.open(`/admin/print?ids=${s.id}`, '_blank')}>
                            <Printer className="w-4 h-4 mr-2" /> طباعة البوليصة
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="p-3 border-t flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              عرض {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} من {total}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-xs px-2">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setDetailModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">تفاصيل الشحنة</h2>
                <Button variant="ghost" size="icon" onClick={() => setDetailModal(null)}><X className="w-5 h-5" /></Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">رقم البوليصة</div>
                    <div className="font-mono font-bold">{detailModal.trackingNumber}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">العميل</div>
                    <div className="font-medium">{detailModal.client}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-sm mb-2 text-primary">بيانات الراسل</h3>
                    <div className="space-y-1 text-sm">
                      <div>الاسم: {detailModal.senderName}</div>
                      <div>التليفون: <a href={`tel:${detailModal.senderPhone}`} className="text-primary">{detailModal.senderPhone}</a></div>
                      <div>المدينة: {detailModal.senderCity}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-2 text-primary">بيانات المستلم</h3>
                    <div className="space-y-1 text-sm">
                      <div>الاسم: {detailModal.recipientName}</div>
                      <div>التليفون: <a href={`tel:${detailModal.recipientPhone}`} className="text-primary">{detailModal.recipientPhone}</a></div>
                      <div>المدينة: {detailModal.recipientCity}</div>
                      <div>العنوان: {detailModal.recipientAddress}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <div className="text-xs text-muted-foreground">الوزن</div>
                    <div className="font-bold">{detailModal.weight} كجم</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <div className="text-xs text-muted-foreground">القطع</div>
                    <div className="font-bold">{detailModal.pieces}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <div className="text-xs text-muted-foreground">نوع الخدمة</div>
                    <div className="font-bold">{detailModal.serviceType}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                    <div className="text-xs text-muted-foreground">مبلغ COD</div>
                    <div className="font-bold text-lg text-amber-600">{formatCurrency(detailModal.codAmount)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                    <div className="text-xs text-muted-foreground">المستحق للعميل</div>
                    <div className="font-bold text-lg text-emerald-600">{formatCurrency(detailModal.codAmount - detailModal.codFee)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">حالة الشحنة</div>
                    <div className="mt-1"><StatusBadge status={detailModal.status} /></div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">حالة الدفع</div>
                    <div className="mt-1"><StatusBadge status={detailModal.paymentStatus} /></div>
                  </div>
                </div>

                {detailModal.description && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">محتوى الشحنة</div>
                    <div className="text-sm">{detailModal.description}</div>
                  </div>
                )}

                {detailModal.failureReason && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                    <div className="text-xs text-muted-foreground mb-1">سبب الفشل</div>
                    <div className="text-sm text-rose-600">{detailModal.failureReason}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">تاريخ الإنشاء: </span>
                    <span>{formatDateTime(detailModal.createdAt)}</span>
                  </div>
                  {detailModal.deliveredAt && (
                    <div>
                      <span className="text-muted-foreground">تاريخ التسليم: </span>
                      <span>{formatDateTime(detailModal.deliveredAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setEditModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">تعديل الشحنة</h2>
                <Button variant="ghost" size="icon" onClick={() => setEditModal(null)}><X className="w-5 h-5" /></Button>
              </div>

              <ShipmentEditForm
                shipment={editModal}
                onSave={(data) => updateShipment(editModal.id, data)}
                onCancel={() => setEditModal(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Inline edit form component
function ShipmentEditForm({ shipment, onSave, onCancel }: { shipment: Shipment; onSave: (data: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    recipientName: shipment.recipientName,
    recipientPhone: shipment.recipientPhone,
    recipientAddress: shipment.recipientAddress || '',
    codAmount: String(shipment.codAmount),
    weight: String(shipment.weight),
    pieces: String(shipment.pieces),
    description: shipment.description || '',
    notes: shipment.notes || '',
    priority: shipment.priority,
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium">اسم المستلم</label>
          <Input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">تليفون المستلم</label>
          <Input value={form.recipientPhone} onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })} className="h-9 text-sm" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">العنوان</label>
        <Input value={form.recipientAddress} onChange={(e) => setForm({ ...form, recipientAddress: e.target.value })} className="h-9 text-sm" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium">مبلغ COD</label>
          <Input type="number" value={form.codAmount} onChange={(e) => setForm({ ...form, codAmount: e.target.value })} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">الوزن (كجم)</label>
          <Input type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">القطع</label>
          <Input type="number" value={form.pieces} onChange={(e) => setForm({ ...form, pieces: e.target.value })} className="h-9 text-sm" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">محتوى الشحنة</label>
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-9 text-sm" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">ملاحظات</label>
        <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-9 text-sm" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>إلغاء</Button>
        <Button size="sm" onClick={() => onSave(form)}>حفظ التعديلات</Button>
      </div>
    </div>
  )
}
