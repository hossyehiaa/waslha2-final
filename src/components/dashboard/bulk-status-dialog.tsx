'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/components/language-provider'

const STATUS_OPTIONS = [
  'PENDING',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
  'FAILED',
] as const

/**
 * Dialog for applying one customizable status to a batch of shipments.
 * The full lifecycle list is offered so staff can force any state.
 */
export function BulkStatusDialog({
  open,
  onOpenChange,
  count,
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  count: number
  onConfirm: (status: string, note: string) => void
  loading?: boolean
}) {
  const { dict, isRTL } = useLanguage()
  const [status, setStatus] = useState<string>('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      setStatus('')
      setNote('')
    }
  }, [open])

  const statusLabels = dict.statuses as Record<string, string>

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            {isRTL ? 'تغيير حالة الشحنات المحددة' : 'Change status of selected shipments'}
          </DialogTitle>
          <DialogDescription>
            {isRTL ? (
              <>سيتم تطبيق الحالة على <span className="font-bold text-foreground">{count}</span> شحنة. يمكنك اختيار أي حالة.</>
            ) : (
              <>The status will be applied to <span className="font-bold text-foreground">{count}</span> shipments. Any status can be forced.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{dict.common.status}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder={isRTL ? 'اختر الحالة الجديدة' : 'Choose new status'} />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabels[s] || s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{isRTL ? 'ملاحظة (اختياري)' : 'Note (optional)'}</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isRTL ? 'سبب التغيير الجماعي...' : 'Reason for bulk change...'}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {dict.common.cancel || (isRTL ? 'إلغاء' : 'Cancel')}
          </Button>
          <Button
            onClick={() => status && onConfirm(status, note)}
            disabled={!status || loading}
            className="shadow-premium"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isRTL ? `تطبيق على ${count} شحنة` : `Apply to ${count}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
