'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Receipt, Search, Send, BadgeDollarSign, ChevronLeft, ChevronRight, Users, Wallet, Clock, FilePlus2, Package, Edit3 } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/dashboard/page-header'
import { DataTable, Column } from '@/components/dashboard/data-table'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { PayInvoicesDialog } from '@/components/dashboard/pay-invoices-dialog'
import { CreateInvoiceDialog, EditInvoiceShipmentsDialog } from '@/components/dashboard/invoice-shipments-dialogs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/format'
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
  shipmentCount: number
  createdAt: string
}

type ClientSummary = {
  id: string
  companyName: string
  unpaidTotal: number
  unpaidCount: number
}

export default function AdminInvoicesPage() {
  const { dict, isRTL } = useLanguage()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [payOpen, setPayOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [sending, setSending] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const url = selectedClient ? `/api/admin/invoices?clientId=${selectedClient}` : '/api/admin/invoices'
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setInvoices(d.invoices || [])
        setClients(d.clients || [])
      })
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [selectedClient, dict])

  useEffect(() => { load() }, [load])

  // auto-select first client once loaded
  const autoDone = useRef(false)
  useEffect(() => {
    if (!autoDone.current && clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0].id)
      autoDone.current = true
    }
  }, [clients, selectedClient])

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients
    const q = clientSearch.toLowerCase()
    return clients.filter(c => c.companyName.toLowerCase().includes(q))
  }, [clients, clientSearch])

  const clientInvoices = useMemo(
    () => (selectedClient ? invoices.filter(i => i.clientId === selectedClient) : []),
    [invoices, selectedClient]
  )

  const selectedInvoices = useMemo(
    () => clientInvoices.filter(i => selectedIds.includes(i.id)),
    [clientInvoices, selectedIds]
  )
  const selectedTotal = selectedInvoices.reduce((s, i) => s + i.total, 0)
  const activeClient = clients.find(c => c.id === selectedClient)

  const stats = useMemo(() => {
    const unpaid = clientInvoices.filter(i => i.status !== 'PAID')
    return {
      unpaidCount: unpaid.length,
      unpaidTotal: unpaid.reduce((s, i) => s + i.total, 0),
      pendingPayment: unpaid.filter(i => i.status === 'PENDING_PAYMENT').length,
      paid: clientInvoices.filter(i => i.status === 'PAID').length,
    }
  }, [clientInvoices])

  async function bulkAction(action: 'send_to_payment' | 'mark_paid', extra?: { method: string; note: string; proofUrl: string | null }) {
    if (selectedIds.length === 0) return
    if (action === 'mark_paid') setPaying(true)
    else setSending(true)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action, ...extra }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(d.error || (isRTL ? 'فشل تنفيذ العملية' : 'Action failed'))
        return
      }
      if (action === 'send_to_payment') {
        toast.success(isRTL ? `تم إرسال ${d.updated} فاتورة إلى سداد العملاء` : `${d.updated} invoices sent to payments`)
      } else {
        toast.success(isRTL ? `تم سداد ${d.updated} فاتورة — مرجع ${d.payment?.reference || ''}` : `${d.updated} invoices paid — ${d.payment?.reference || ''}`)
        setPayOpen(false)
      }
      setSelectedIds([])
      load()
    } catch {
      toast.error(isRTL ? 'خطأ في الشبكة' : 'Network error')
    } finally {
      setPaying(false)
      setSending(false)
    }
  }

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: isRTL ? 'رقم الفاتورة' : 'Invoice #',
      sortable: true,
      cell: (i) => <span className="font-mono font-medium text-xs">{i.invoiceNumber}</span>,
    },
    {
      key: 'type',
      header: isRTL ? 'النوع' : 'Type',
      hideOnMobile: true,
      cell: (i) => <span className="text-xs">{i.type.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'amount',
      header: isRTL ? 'المبلغ' : 'Amount',
      sortable: true,
      cell: (i) => <span className="font-medium text-xs">{formatCurrency(i.amount)}</span>,
    },
    {
      key: 'total',
      header: isRTL ? 'الإجمالي' : 'Total',
      sortable: true,
      cell: (i) => <span className="font-bold text-xs">{formatCurrency(i.total)}</span>,
    },
    {
      key: 'shipmentCount',
      header: isRTL ? 'أوردرات' : 'Orders',
      sortable: true,
      cell: (i) => i.shipmentCount > 0 ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          <Package className="w-3 h-3" />{i.shipmentCount}
        </span>
      ) : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'dueDate',
      header: isRTL ? 'تاريخ الاستحقاق' : 'Due date',
      hideOnMobile: true,
      cell: (i) => <span className="text-xs text-muted-foreground">{i.dueDate ? formatDate(i.dueDate) : '-'}</span>,
    },
    {
      key: 'status',
      header: dict.common.status,
      cell: (i) => <StatusBadge status={i.status} />,
    },
    {
      key: 'actions',
      header: dict.common.actions,
      cell: (i) => (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditId(i.id) }}>
          <Edit3 className="w-3.5 h-3.5 mr-1" />
          {isRTL ? 'تحرير الأوردرات' : 'Edit orders'}
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={isRTL ? 'فواتير العملاء' : 'Client Invoices'}
        subtitle={isRTL ? 'كل عميل لوحده — انشئ فاتورة من أوردراته ثم سددها' : 'Per-customer view — build an invoice from orders then settle it'}
        icon={Receipt}
        actions={
          <Button className="shadow-premium" onClick={() => setCreateOpen(true)}>
            <FilePlus2 className="w-4 h-4 mr-2" />
            {isRTL ? 'فاتورة جديدة من أوردرات' : 'New invoice from orders'}
          </Button>
        }
      />

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* Client list panel */}
        <Card className="p-4 h-fit lg:sticky lg:top-20">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold">{isRTL ? 'العملاء' : 'Clients'}</h2>
            <span className="text-xs text-muted-foreground">({clients.length})</span>
          </div>
          <div className="relative mb-3">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
            <Input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder={isRTL ? 'بحث عن عميل...' : 'Search client...'}
              className={`h-9 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
            />
          </div>
          <div className="space-y-1.5 max-h-[520px] overflow-y-auto scrollbar-premium">
            {loading && clients.length === 0
              ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              : filteredClients.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedClient(c.id); setSelectedIds([]) }}
                  className={cn(
                    'w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between gap-2',
                    selectedClient === c.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent hover:bg-accent/40'
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{c.companyName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.unpaidCount > 0
                        ? (isRTL ? `${c.unpaidCount} فاتورة غير مدفوعة` : `${c.unpaidCount} unpaid`)
                        : (isRTL ? 'لا مستحقات' : 'No dues')}
                    </div>
                  </div>
                  {c.unpaidTotal > 0 && (
                    <div className="text-xs font-bold text-amber-600 whitespace-nowrap">
                      {formatCurrency(c.unpaidTotal)}
                    </div>
                  )}
                  {isRTL
                    ? <ChevronLeft className={cn('w-4 h-4 shrink-0', selectedClient === c.id ? 'text-primary' : 'text-muted-foreground/50')} />
                    : <ChevronRight className={cn('w-4 h-4 shrink-0', selectedClient === c.id ? 'text-primary' : 'text-muted-foreground/50')} />}
                </button>
              ))}
            {!loading && filteredClients.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">{dict.common.noData}</p>
            )}
          </div>
        </Card>

        {/* Selected client invoices */}
        <div className="space-y-4 min-w-0">
          {activeClient && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: isRTL ? 'غير مدفوع' : 'Unpaid', value: stats.unpaidCount, icon: Receipt, color: 'bg-amber-100 text-amber-700' },
                { label: isRTL ? 'إجمالي المستحق' : 'Total due', value: formatCurrency(stats.unpaidTotal), icon: Wallet, color: 'bg-rose-100 text-rose-700' },
                { label: isRTL ? 'بانتظار السداد' : 'Sent to payment', value: stats.pendingPayment, icon: Clock, color: 'bg-purple-100 text-purple-700' },
                { label: isRTL ? 'مدفوعة' : 'Paid', value: stats.paid, icon: BadgeDollarSign, color: 'bg-emerald-100 text-emerald-700' },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="p-4">
                    <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
                      <s.icon className="w-4 h-4" />
                    </div>
                    <div className="text-lg font-bold">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <DataTable
            data={clientInvoices}
            columns={columns}
            loading={loading}
            searchPlaceholder={isRTL ? 'بحث برقم الفاتورة...' : 'Search invoice #...'}
            searchKeys={['invoiceNumber']}
            enableSelection
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            selectable={(i) => i.status !== 'PAID'}
            selectionLabel={isRTL ? 'فاتورة محددة' : 'selected'}
            bulkBar={
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={sending}
                  onClick={() => bulkAction('send_to_payment')}
                >
                  <Send className={`w-3.5 h-3.5 ${isRTL ? 'ml-1.5' : 'mr-1.5'}`} />
                  {sending
                    ? (isRTL ? 'جاري الإرسال...' : 'Sending...')
                    : (isRTL ? 'إرسال إلى سداد العملاء' : 'Send to payments')}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={paying}
                  onClick={() => setPayOpen(true)}
                >
                  <BadgeDollarSign className="w-3.5 h-3.5 mr-1.5" />
                  {isRTL ? 'سداد فوري' : 'Pay now'}
                </Button>
              </>
            }
            pageSize={10}
            exportFilename={`invoices-${activeClient?.companyName || 'all'}`}
          />
        </div>
      </div>

      <PayInvoicesDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        count={selectedInvoices.length}
        total={selectedTotal}
        clientName={activeClient?.companyName || ''}
        loading={paying}
        onConfirm={(payload) => bulkAction('mark_paid', payload)}
      />

      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clients={clients}
        onCreated={load}
      />

      <EditInvoiceShipmentsDialog
        open={!!editId}
        onOpenChange={(v) => !v && setEditId(null)}
        invoiceId={editId}
        onSaved={load}
      />
    </div>
  )
}
