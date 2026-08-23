'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

/**
 * Manages selection state + bulk status change API call for shipment tables.
 * After a successful bulk change it clears the selection and calls onDone
 * so the page can refetch.
 */
export function useBulkStatus(onDone?: () => void) {
  const { isRTL } = useLanguage()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const applyStatus = useCallback(
    async (status: string, note: string) => {
      if (selectedIds.length === 0) return
      setLoading(true)
      try {
        const res = await fetch('/api/shipments/bulk', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds, status, note: note || null }),
        })
        const d = await res.json()
        if (!res.ok) {
          toast.error(d.error || (isRTL ? 'فشل تحديث الحالة' : 'Failed to update status'))
          return
        }
        const parts: string[] = []
        if (d.updated > 0) parts.push(isRTL ? `تم تحديث ${d.updated}` : `${d.updated} updated`)
        if (d.skipped > 0) parts.push(isRTL ? `تم تخطي ${d.skipped} (نفس الحالة)` : `${d.skipped} skipped (same status)`)
        if (d.notFound > 0) parts.push(isRTL ? `${d.notFound} غير موجودة` : `${d.notFound} not found`)
        if (d.errors?.length > 0) parts.push(isRTL ? `${d.errors.length} فشلت` : `${d.errors.length} failed`)
        toast.success(parts.join(' • ') || (isRTL ? 'تم التحديث' : 'Updated'))
        setSelectedIds([])
        setDialogOpen(false)
        onDone?.()
      } catch {
        toast.error(isRTL ? 'خطأ في الشبكة' : 'Network error')
      } finally {
        setLoading(false)
      }
    },
    [selectedIds, onDone, isRTL]
  )

  return { selectedIds, setSelectedIds, dialogOpen, setDialogOpen, loading, applyStatus }
}
