'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { EntityFormModal } from '@/components/dashboard/entity-form-modal'
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Pricing = {
  id: string
  name: string
  serviceType: string
  baseWeight: number
  basePrice: number
  perKgPrice: number
  codFeePercent: number
  insuranceFeePercent: number
  status: string
}

export default function AdminPricingPage() {
  const { dict } = useLanguage()
  const L = dict.pages.pricing
  const [rules, setRules] = useState<Pricing[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Pricing | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Pricing | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/pricing')
      const data = await res.json()
      setRules(data.rules || [])
    } catch {
      toast.error(dict.common.noData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [dict])

  const serviceOptions = [
    { label: dict.pages.shipments.new.standard, value: 'STANDARD' },
    { label: dict.pages.shipments.new.express, value: 'EXPRESS' },
    { label: dict.pages.shipments.new.sameDay, value: 'SAME_DAY' },
  ]

  const formFields = [
    { key: 'name', label: dict.common.appName, type: 'text' as const, placeholder: 'Standard Domestic', required: true },
    { key: 'serviceType', label: dict.pages.shipments.new.serviceType, type: 'select' as const, options: serviceOptions, required: true, defaultValue: 'STANDARD' },
    { key: 'baseWeight', label: L.kgIncluded, type: 'number' as const, placeholder: '0.5', required: true, defaultValue: 0.5 },
    { key: 'basePrice', label: L.basePrice, type: 'number' as const, placeholder: '25', required: true, defaultValue: 25 },
    { key: 'perKgPrice', label: L.perKg, type: 'number' as const, placeholder: '8', required: true, defaultValue: 8 },
    { key: 'codFeePercent', label: L.codFee, type: 'number' as const, placeholder: '2', required: true, defaultValue: 2 },
    { key: 'insuranceFeePercent', label: L.insurance, type: 'number' as const, placeholder: '0.5', defaultValue: 0.5 },
  ]

  async function handleSubmit(data: Record<string, any>) {
    const isEditing = !!editingRule
    const url = isEditing ? `/api/admin/pricing/${editingRule.id}` : '/api/admin/pricing'
    const method = isEditing ? 'PATCH' : 'POST'
    // Convert numbers
    const payload = {
      ...data,
      baseWeight: Number(data.baseWeight),
      basePrice: Number(data.basePrice),
      perKgPrice: Number(data.perKgPrice),
      codFeePercent: Number(data.codFeePercent),
      insuranceFeePercent: Number(data.insuranceFeePercent),
    }
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || dict.common.noData)
    toast.success(isEditing ? dict.common.edit : dict.common.create)
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/pricing/${deleteTarget.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error || dict.common.noData)
    }
    toast.success(dict.common.delete)
    load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={L.title}
        subtitle={L.subtitle}
        icon={CreditCard}
        actions={
          <Button className="shadow-premium" onClick={() => { setEditingRule(null); setModalOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />{L.newRule}
          </Button>
        }
      />
      <div className="grid md:grid-cols-2 gap-4">
        {(loading ? [...Array(2)] : rules).map((r, i) => (
          <Card key={r?.id || i} className="p-6 relative group">
            {r ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{serviceOptions.find(o => o.value === r.serviceType)?.label || r.serviceType}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingRule(r); setModalOpen(true) }}>
                          <Edit className="w-4 h-4 mr-2" />
                          {dict.common.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(r)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          {dict.common.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-xs text-muted-foreground">{L.basePrice}</div>
                    <div className="font-bold text-lg">{formatCurrency(r.basePrice)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.baseWeight} {L.kgIncluded}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-xs text-muted-foreground">{L.perKg}</div>
                    <div className="font-bold text-lg">{formatCurrency(r.perKgPrice)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{L.additionalWeight}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-xs text-muted-foreground">{L.codFee}</div>
                    <div className="font-bold text-lg">{r.codFeePercent}%</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{L.ofCodAmount}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40">
                    <div className="text-xs text-muted-foreground">{L.insurance}</div>
                    <div className="font-bold text-lg">{r.insuranceFeePercent}%</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{L.optional}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="animate-pulse">
                <div className="h-10 bg-muted rounded-xl mb-4" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-20 bg-muted rounded-lg" />
                  <div className="h-20 bg-muted rounded-lg" />
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <EntityFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingRule ? `${dict.common.edit} - ${editingRule.name}` : L.newRule}
        fields={formFields}
        initialData={editingRule || undefined}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={`${dict.common.delete} ${deleteTarget?.name || ''}`}
        description={`${dict.common.delete} ${deleteTarget?.name}?`}
        onConfirm={handleDelete}
        destructive
        confirmLabel={dict.common.delete}
      />
    </div>
  )
}
