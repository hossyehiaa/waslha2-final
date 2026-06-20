'use client'

import { Badge } from '@/components/ui/badge'

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  PICKED_UP: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  IN_TRANSIT: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  DELIVERED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  RETURNED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  CANCELLED: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  CONFIRMED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  ASSIGNED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  SUSPENDED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  INACTIVE: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  PENDING_RECEIPT: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  RECEIVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  UNPAID: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  COLLECTED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  SETTLED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}

export function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const cls = STATUS_STYLES[status] || 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
  const text = status.replace(/_/g, ' ')
  return (
    <Badge
      variant="secondary"
      className={`${cls} font-medium capitalize ${size === 'md' ? 'px-3 py-1 text-xs' : 'text-xs'}`}
    >
      {text}
    </Badge>
  )
}
