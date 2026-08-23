'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Wallet, BadgeDollarSign, History, Layers, Send, XCircle, Eye, Clock, CheckCircle2, TrendingUp, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { PayInvoicesDialog } from '@/components/dashboard/pay-invoices-dialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate, formatTimeAgo } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { cn } from '@/lib/utils'

type Invoice = {
  id: string
  invoiceNumber: string
  clientId: string
  client: string
  type: string
  amount: number
  tax: number
  total: number
  status: string
  dueDate: string | null
  paidAt: string | null
  createdAt: string
}

type ClientSummary = { id: string; companyName: string; unpaidTotal: number; unpaidCount: number }

type ClientPayment = {
  id: string
  reference: string
  client: string
  clientId: string
  amount: number
  method: string
  note: string | null
  hasProof: boolean
  proofUrl: string | null
  invoiceCount: number
  createdAt: string
}

type Settlement = {
  id: string
  reference: string
  client: string
  clientId: string
  period: string
  totalAmount: number
  fees: number
  netAmount: number
  shipmentCount: number
  status: string
  paidAt: string | null
  createdAt: string
}

const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: 'تحويل بنكي',
  CASH: 'نقدي',
  WALLET: 'محفظة',
  OTHER: 'أخرى',
}

export default function AdminFinancePage() {
  const { dict, isRTL } = useLanguage()
  const L = dict.pages.finance

  // ---- invoices (payment queue) ----
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const [clientFilter, setClientFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [payOpen, setPayOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [unsending, setUnsending] = useState(false)

  // ---- payments history ----
  const [payments, setPayments] = useState<ClientPayment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [proofView, setProofView] = useState<ClientPayment | null>(null)

  // ---- COD settlements ----
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [totals, setTotals] = useState({ pending: 0, paid: 0 })

  const loadInvoices = useCallback(() => {
    setInvoicesLoading(true)
    fetch('/api/admin/invoices')
      .then(r => r.json())
      .then(d => {
        setInvoices((d.invoices || []).filter((i: Invoice) => i.status !== 'PAID'))
        setClients(d.clients || [])
      })
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setInvoicesLoading(false))
  }, [dict])

  const loadPayments = useCallback(() => {
    setPaymentsLoading(true)
    fetch('/api/admin/client-payments')
      .then(r => r.json())
      .then(d => setPayments(d.payments || []))
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setPaymentsLoading(false))
  }, [dict])

  const loadSettlements = useCallback(() => {
    fetch('/api/admin/finance?status=all')
      .then(r => r.json())
      .then(d => {
        setSettlements(d.settlements || [])
        setTotals(d.totals || { pending: 0, paid: 0 })
      })
      .catch(() => toast.error(dict.common.noData))
  }, [dict])

  useEffect(() => {
    loadInvoices()
    loadPayments()
    loadSettlements()
  }, [loadInvoices, loadPayments, loadSettlements])

  const visibleInvoices = useMemo(
    () => (clientFilter === 'all' ? invoices : invoices.filter(i => i.clientId === clientFilter)),
    [invoices, clientFilter]
  )

  // Selection constrained to a single client per payment batch
  const firstSelected = selectedIds.length > 0
    ? invoices.find(i => i.id === selectedIds[0])
    : undefined
  const selectedInvoices = useMemo(
    () => invoices.filter(i => selectedIds.includes(i.id)),
    [invoices, selectedIds]
  )
  const selectedTotal = selectedInvoices.reduce((s, i) => s + i.total, 0)
  const selectableInvoice = useCallback(
    (i: Invoice) => selectedIds.length === 0 || i.clientId === firstSelected?.clientId,
    [selectedIds, firstSelected]
  )

  async function handleAction(id: string, action: 'approve' | 'pay') {
    try {
      const res = await fetch('/api/admin/finance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || dict.common.noData)
        return
      }
      toast.success(action === 'approve' ? dict.common.approve : dict.common.pay)
      loadSettlements()
    } catch {
      toast.error(dict.common.networkError)
    }
  }

  async function payInvoices(payload: { method: string; note: string; proofUrl: string | null }) {
    if (selectedIds.length === 0) return
    setPaying(true)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action: 'mark_paid', ...payload }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error || (isRTL ? 'فشل السداد' : 'Payment failed'))
        return
      }
      toast.success(isRTL ? `تم سداد ${d.updated} فاتورة للعميل — ${d.payment?.reference || ''}` : `${d.updated} invoices paid — ${d.payment?.reference || ''}`)
      setPayOpen(false)
      setSelectedIds([])
      loadInvoices()
      loadPayments()
    } catch {
      toast.error(isRTL ? 'خطأ في الشبكة' : 'Network error')
    } finally {
      setPaying(false)
    }
  }

  async function unsendInvoices() {
    if (selectedIds.length === 0) return
    setUnsending(true)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action: 'unsend' }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error || (isRTL ? 'فشل الإلغاء' : 'Failed'))
        return
      }
      toast.success(isRTL ? `تم إرجاع ${d.updated} فاتورة إلى غير مدفوعة` : `${d.updated} invoices returned to unpaid`)
      setSelectedIds([])
      loadInvoices()
    } catch {
      toast.error(isRTL ? 'خطأ في الشبكة' : 'Network error')
    } finally {
      setUnsending(false)
    }
  }

  // ---- invoices tab columns ----
  const invoiceColumns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: isRTL ? 'رقم الفاتورة' : 'Invoice #',
      sortable: true,
      cell: (i) => (
        <span className={cn('font-mono font-medium text-xs', i.status === 'PENDING_PAYMENT' && 'text-purple-600')}>
          {i.invoiceNumber}
        </span>
      ),
    },
    {
      key: 'client',
      header: isRTL ? 'العميل' : 'Client',
      sortable: true,
      cell: (i) => <span className="font-medium text-xs">{i.client}</span>,
    },
    {
      key: 'total',
      header: isRTL ? 'الإجمالي' : 'Total',
      sortable: true,
      cell: (i) => <span className="font-bold text-xs">{formatCurrency(i.total)}</span>,
    },
    {
      key: 'dueDate',
      header: isRTL ? 'الاستحقاق' : 'Due',
      hideOnMobile: true,
      cell: (i) => <span className="text-xs text-muted-foreground">{i.dueDate ? formatDate(i.dueDate) : '-'}</span>,
    },
    {
      key: 'status',
      header: dict.common.status,
      cell: (i) => <StatusBadge status={i.status} />,
    },
  ]

  // ---- payments history columns ----
  const paymentColumns: Column<ClientPayment>[] = [
    {
      key: 'reference',
      header: isRTL ? 'المرجع' : 'Reference',
      sortable: true,
      cell: (p) => <span className="font-mono font-medium text-xs">{p.reference}</span>,
    },
    {
      key: 'client',
      header: isRTL ? 'العميل' : 'Client',
      sortable: true,
      cell: (p) => <span className="font-medium text-xs">{p.client}</span>,
    },
    {
      key: 'amount',
      header: isRTL ? 'المبلغ' : 'Amount',
      sortable: true,
      cell: (p) => <span className="font-bold text-emerald-600 text-xs">{formatCurrency(p.amount)}</span>,
    },
    {
      key: 'invoiceCount',
      header: isRTL ? 'عدد الفواتير' : 'Invoices',
      sortable: true,
      hideOnMobile: true,
      cell: (p) => <span className="text-xs font-medium">{p.invoiceCount}</span>,
    },
    {
      key: 'method',
      header: isRTL ? 'الطريقة' : 'Method',
      hideOnMobile: true,
      cell: (p) => <span className="text-xs">{METHOD_LABELS[p.method] || p.method}</span>,
    },
    {
      key: 'createdAt',
      header: isRTL ? 'التاريخ' : 'Date',
      sortable: true,
      hideOnMobile: true,
      cell: (p) => <span className="text-xs text-muted-foreground">{formatTimeAgo(p.createdAt)}</span>,
    },
    {
      key: 'proof',
      header: isRTL ? 'الإثبات' : 'Proof',
      cell: (p) => p.hasProof ? (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setProofView(p) }}>
          <Eye className="w-3.5 h-3.5 mr-1" />
          {isRTL ? 'عرض' : 'View'}
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
    },
  ]

  // ---- settlements columns (unchanged behavior) ----
  const settlementColumns: Column<Settlement>[] = [
    { key: 'reference', header: L.reference, sortable: true, cell: (s) => <span className="font-mono font-medium text-xs">{s.reference}</span> },
    { key: 'client', header: L.client, sortable: true, cell: (s) => <span className="font-medium">{s.client}</span> },
    { key: 'period', header: L.period, hideOnMobile: true, cell: (s) => <span className="text-xs">{s.period}</span> },
    { key: 'shipmentCount', header: L.shipments, sortable: true, cell: (s) => <span className="font-medium">{s.shipmentCount}</span> },
    { key: 'totalAmount', header: L.totalCod, sortable: true, cell: (s) => <span className="font-medium text-xs">{formatCurrency(s.totalAmount)}</span> },
    { key: 'fees', header: L.fees, hideOnMobile: true, cell: (s) => <span className="text-xs text-rose-600">-{formatCurrency(s.fees)}</span> },
    { key: 'netAmount', header: L.netPayable, sortable: true, cell: (s) => <span className="font-bold text-emerald-600">{formatCurrency(s.netAmount)}</span> },
    { key: 'status', header: dict.common.status, cell: (s) => <StatusBadge status={s.status} /> },
    {
      key: 'actions', header: dict.common.actions,
      cell: (s) => (
        <div className="flex items-center gap-2">
          {s.status === 'PENDING' && (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleAction(s.id, 'approve') }}>
              {dict.common.approve}
            </Button>
          )}
          {(s.status === 'PENDING' || s.status === 'APPROVED') && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAction(s.id, 'pay') }} className="bg-emerald-600 hover:bg-emerald-700">
              <DollarSign className="w-3.5 h-3.5 mr-1" />
              {dict.common.pay}
            </Button>
          )}
          {s.status === 'PAID' && s.paidAt && (
            <span className="text-xs text-muted-foreground">{formatDate(s.paidAt)}</span>
          )}
        </div>
      ),
    },
  ]

  const pendingPaymentInvoices = invoices.filter(i => i.status === 'PENDING_PAYMENT')
  const totalDue = invoices.reduce((s, i) => s + i.total, 0)
  const paidToday = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={isRTL ? 'سداد العملاء' : 'Client Payments'}
        subtitle={isRTL ? 'حدد فواتير العميل وسددها مع سكرين الإثبات' : 'Select client invoices and settle them with a proof screenshot'}
        icon={Wallet}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isRTL ? 'فواتير بانتظار السداد' : 'Awaiting payment', value: pendingPaymentInvoices.length, icon: Clock, color: 'bg-purple-100 text-purple-700' },
          { label: isRTL ? 'إجمالي المستحقات' : 'Total dues', value: formatCurrency(totalDue), icon: Wallet, color: 'bg-amber-100 text-amber-700' },
          { label: isRTL ? 'مدفوعات مسجلة' : 'Recorded payments', value: payments.length, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
          { label: isRTL ? 'قيمة المدفوعات' : 'Paid value', value: formatCurrency(paidToday), icon: TrendingUp, color: 'bg-teal-100 text-teal-700' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="queue">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="queue" className="gap-1.5">
            <Send className="w-4 h-4" />
            {isRTL ? 'فواتير السداد' : 'Payment queue'}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="w-4 h-4" />
            {isRTL ? 'سجل السداد' : 'Payments history'}
          </TabsTrigger>
          <TabsTrigger value="cod" className="gap-1.5">
            <Layers className="w-4 h-4" />
            {isRTL ? 'تسويات COD' : 'COD settlements'}
          </TabsTrigger>
        </TabsList>

        {/* Payment queue tab */}
        <TabsContent value="queue" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">{isRTL ? 'العميل:' : 'Client:'}</span>
            <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setSelectedIds([]) }}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'كل العملاء' : 'All clients'}</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pendingPaymentInvoices.length > 0 && (
              <span className="text-xs text-purple-600 bg-purple-100 dark:bg-purple-950 dark:text-purple-300 px-2 py-1 rounded-full">
                {isRTL ? `${pendingPaymentInvoices.length} فاتورة مرسلة من صفحة الفواتير` : `${pendingPaymentInvoices.length} sent from invoices page`}
              </span>
            )}
          </div>

          <DataTable
            data={visibleInvoices}
            columns={invoiceColumns}
            loading={invoicesLoading}
            searchPlaceholder={isRTL ? 'بحث برقم الفاتورة أو العميل...' : 'Search invoice or client...'}
            searchKeys={['invoiceNumber', 'client']}
            enableSelection
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            selectable={selectableInvoice}
            selectionLabel={isRTL ? 'فاتورة محددة' : 'selected'}
            bulkBar={
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 shadow-premium"
                  disabled={paying}
                  onClick={() => setPayOpen(true)}
                >
                  <BadgeDollarSign className="w-3.5 h-3.5 mr-1.5" />
                  {isRTL ? 'تم الدفع + سكرين' : 'Mark paid + proof'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={unsending}
                  onClick={unsendInvoices}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  {isRTL ? 'إرجاع لغير مدفوعة' : 'Return to unpaid'}
                </Button>
              </>
            }
            pageSize={10}
            emptyMessage={isRTL ? 'لا توجد فواتير مستحقة' : 'No outstanding invoices'}
          />
        </TabsContent>

        {/* Payments history tab */}
        <TabsContent value="history">
          <DataTable
            data={payments}
            columns={paymentColumns}
            loading={paymentsLoading}
            searchPlaceholder={isRTL ? 'بحث بالمرجع أو العميل...' : 'Search reference or client...'}
            searchKeys={['reference', 'client']}
            pageSize={10}
            emptyMessage={isRTL ? 'لا توجد مدفوعات مسجلة بعد' : 'No payments recorded yet'}
          />
        </TabsContent>

        {/* COD settlements tab (existing) */}
        <TabsContent value="cod">
          <DataTable
            data={settlements}
            columns={settlementColumns}
            searchPlaceholder={`${dict.common.search}...`}
            searchKeys={['reference', 'client', 'period']}
            pageSize={10}
          />
        </TabsContent>
      </Tabs>

      {/* Pay dialog with screenshot */}
      <PayInvoicesDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        count={selectedInvoices.length}
        total={selectedTotal}
        clientName={firstSelected?.client || ''}
        loading={paying}
        onConfirm={payInvoices}
      />

      {/* Proof viewer */}
      <Dialog open={!!proofView} onOpenChange={(v) => !v && setProofView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              {isRTL ? 'إثبات السداد' : 'Payment proof'} — {proofView?.reference}
            </DialogTitle>
          </DialogHeader>
          {proofView?.proofUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proofView.proofUrl}
              alt={isRTL ? 'سكرين إثبات السداد' : 'payment proof screenshot'}
              className="w-full rounded-xl border max-h-[70vh] object-contain bg-muted/30"
            />
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
          {proofView && (
            <div className="text-sm space-y-1 text-muted-foreground">
              <div><span className="font-medium text-foreground">{proofView.client}</span> — {formatCurrency(proofView.amount)} • {proofView.invoiceCount} {isRTL ? 'فاتورة' : 'invoice(s)'} • {METHOD_LABELS[proofView.method] || proofView.method}</div>
              {proofView.note && <div className="text-xs">{proofView.note}</div>}
              <div className="text-xs">{formatDate(proofView.createdAt)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
