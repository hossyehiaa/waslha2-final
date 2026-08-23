'use client'

import { useEffect, useRef, useState } from 'react'
import { BadgeDollarSign, Loader2, Upload, X, ImageIcon } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/format'
import { fileToCompressedDataUrl } from '@/lib/image-utils'
import { useLanguage } from '@/components/language-provider'

/**
 * Dialog for marking selected invoices as paid (سداد).
 * Supports payment method, note, and a screenshot proof upload.
 */
export function PayInvoicesDialog({
  open,
  onOpenChange,
  count,
  total,
  clientName,
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  count: number
  total: number
  clientName: string
  onConfirm: (payload: { method: string; note: string; proofUrl: string | null }) => void
  loading?: boolean
}) {
  const { isRTL } = useLanguage()
  const [method, setMethod] = useState('BANK_TRANSFER')
  const [note, setNote] = useState('')
  const [proof, setProof] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setMethod('BANK_TRANSFER')
      setNote('')
      setProof(null)
    }
  }, [open])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const compressed = await fileToCompressedDataUrl(file)
      setProof(compressed)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeDollarSign className="w-4 h-4 text-emerald-600" />
            {isRTL ? 'سداد الفواتير المحددة' : 'Pay selected invoices'}
          </DialogTitle>
          <DialogDescription>
            {isRTL ? (
              <>تسديد <span className="font-bold text-foreground">{count}</span> فاتورة بقيمة <span className="font-bold text-foreground">{formatCurrency(total)}</span> للعميل «{clientName}»</>
            ) : (
              <>Settle <span className="font-bold text-foreground">{count}</span> invoice(s) worth <span className="font-bold text-foreground">{formatCurrency(total)}</span> for «{clientName}»</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{isRTL ? 'طريقة السداد' : 'Payment method'}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">{isRTL ? 'تحويل بنكي' : 'Bank transfer'}</SelectItem>
                <SelectItem value="CASH">{isRTL ? 'نقدي' : 'Cash'}</SelectItem>
                <SelectItem value="WALLET">{isRTL ? 'محفظة إلكترونية' : 'Wallet'}</SelectItem>
                <SelectItem value="OTHER">{isRTL ? 'أخرى' : 'Other'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isRTL ? 'ملاحظة (اختياري)' : 'Note (optional)'}</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isRTL ? 'مرجع التحويل أو تفاصيل...' : 'Reference or details...'}
            />
          </div>

          <div className="space-y-2">
            <Label>{isRTL ? 'سكرين إثبات السداد' : 'Payment screenshot'}</Label>
            {proof ? (
              <div className="relative rounded-xl overflow-hidden border">
                                <img src={proof} alt="proof" className="w-full max-h-48 object-cover" />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 left-2 h-7 w-7 rounded-full"
                  onClick={() => setProof(null)}
                  aria-label={isRTL ? 'إزالة' : 'Remove'}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                <span className="text-xs">
                  {uploading
                    ? isRTL ? 'جاري المعالجة...' : 'Processing...'
                    : isRTL ? 'اضغط لرفع صورة السكرين' : 'Click to upload screenshot'}
                </span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={() => onConfirm({ method, note, proofUrl: proof })}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <ImageIcon className="w-4 h-4 mr-1.5" />
            {isRTL ? `تم الدفع — ${formatCurrency(total)}` : `Mark paid — ${formatCurrency(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
