'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Truck, Package, Phone, MapPin, CheckCircle, XCircle, Navigation } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { formatCurrency, formatAddress } from '@/lib/format'

type Shipment = {
  id: string
  trackingNumber: string
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  recipientCity: string
  codAmount: number
  status: string
  weight: number
  pieces: number
  description: string | null
}

export default function DriverApp() {
  const router = useRouter()
  const { dict } = useLanguage()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [activeTab, setActiveTab] = useState<'pending' | 'delivered' | 'failed'>('pending')
  const [actionDialog, setActionDialog] = useState<{ shipment: Shipment; action: 'deliver' | 'fail' } | null>(null)
  const [failureReason, setFailureReason] = useState('')

  const loadShipments = async (usr: any, tab?: string) => {
    const activeTabVal = tab || activeTab
    const status = activeTabVal === 'pending' ? 'OUT_FOR_DELIVERY' : activeTabVal === 'delivered' ? 'DELIVERED' : 'FAILED'
    const res = await fetch(`/api/shipments?status=${status}&limit=100`)
    const data = await res.json()
    setShipments(data.shipments || [])
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.user) {
          router.push('/login?redirect=/driver')
          return
        }
        if (d.user.role !== 'DRIVER' && d.user.role !== 'ADMIN') {
          router.push('/dashboard')
          return
        }
        setUser(d.user)
        loadShipments(d.user, 'pending')
      })
      .finally(() => setLoading(false))
     
  }, [router])

  useEffect(() => {
    if (user) {
      const load = async () => { await loadShipments(user) }
      load()
    }
  }, [activeTab, user])

  async function handleAction() {
    if (!actionDialog) return
    const { shipment, action } = actionDialog
    const newStatus = action === 'deliver' ? 'DELIVERED' : 'FAILED'

    const res = await fetch(`/api/shipments/${shipment.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        failureReason: action === 'fail' ? failureReason : undefined,
        note: action === 'deliver' ? 'Delivered via driver app' : `Failed: ${failureReason}`,
      }),
    })

    if (!res.ok) {
      const d = await res.json()
      toast.error(d.error || 'Failed to update')
      return
    }

    toast.success(action === 'deliver' ? 'Marked as delivered!' : 'Marked as failed')
    setActionDialog(null)
    setFailureReason('')
    loadShipments(user)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const filtered = shipments

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Driver App</h1>
                <p className="text-xs text-white/70">{user?.fullName}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => router.push('/login')}
            >
              {dict.common.signOut}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[72px] z-30 bg-background border-b">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {[
              { key: 'pending', label: 'Active', count: shipments.filter(s => s.status === 'OUT_FOR_DELIVERY' || s.status === 'IN_TRANSIT').length },
              { key: 'delivered', label: dict.statuses.DELIVERED, count: shipments.filter(s => s.status === 'DELIVERED').length },
              { key: 'failed', label: dict.statuses.FAILED, count: shipments.filter(s => s.status === 'FAILED').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Shipments List */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No shipments in this category</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-4">
                  {/* Tracking number and status */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-mono font-bold text-sm">{s.trackingNumber}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {s.weight} kg • {s.pieces} {dict.pages.shipments.pieces}
                      </div>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>

                  {/* Recipient info */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{s.recipientName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a href={`tel:${s.recipientPhone}`} className="text-sm text-primary">
                        {s.recipientPhone}
                      </a>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{s.recipientAddress}</span>
                    </div>
                  </div>

                  {/* COD amount */}
                  {s.codAmount > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 mb-3">
                      <span className="text-sm font-medium">COD to Collect</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">{formatCurrency(s.codAmount)}</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  {activeTab === 'pending' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => { setActionDialog({ shipment: s, action: 'fail' }); setFailureReason('') }}
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Fail
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setActionDialog({ shipment: s, action: 'deliver' })}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Deliver
                      </Button>
                    </div>
                  )}

                  {/* Call button for active deliveries */}
                  {activeTab === 'pending' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full mt-2"
                      onClick={() => window.location.href = `tel:${s.recipientPhone}`}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call Customer
                    </Button>
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(v) => !v && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === 'deliver' ? 'Confirm Delivery' : 'Mark as Failed'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {actionDialog?.shipment && (
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-mono text-sm font-bold">{actionDialog.shipment.trackingNumber}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {actionDialog.shipment.recipientName} • {actionDialog.shipment.recipientPhone}
                </div>
                {actionDialog.shipment.codAmount > 0 && (
                  <div className="text-sm font-medium text-amber-600 mt-1">
                    COD: {formatCurrency(actionDialog.shipment.codAmount)}
                  </div>
                )}
              </div>
            )}

            {actionDialog?.action === 'fail' && (
              <div className="space-y-2">
                <Label>Failure Reason</Label>
                <Select value={failureReason} onValueChange={setFailureReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Customer not available">Customer not available</SelectItem>
                    <SelectItem value="Wrong address">Wrong address</SelectItem>
                    <SelectItem value="Customer refused">Customer refused delivery</SelectItem>
                    <SelectItem value="Phone not reachable">Phone not reachable</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setActionDialog(null)}>
                {dict.common.cancel}
              </Button>
              <Button
                onClick={handleAction}
                className={actionDialog?.action === 'deliver' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-destructive'}
                disabled={actionDialog?.action === 'fail' && !failureReason}
              >
                {actionDialog?.action === 'deliver' ? 'Confirm Delivery' : 'Mark Failed'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
