// Formatting helpers - locale-aware

function getLocale(): string {
  if (typeof document !== 'undefined') {
    return document.documentElement.lang === 'ar' ? 'ar-EG' : 'en-US'
  }
  return 'en-US'
}

function getCurrencySymbol(): string {
  if (typeof document !== 'undefined' && document.documentElement.lang === 'ar') {
    return 'ج.م'
  }
  return 'EGP'
}

export function formatCurrency(amount: number, currency?: string): string {
  if (amount === null || amount === undefined) return `${currency || getCurrencySymbol()} 0`
  const sym = currency || getCurrencySymbol()
  const locale = currency ? 'en-US' : getLocale()
  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  // In Arabic, the currency symbol typically comes after the number
  if (locale.startsWith('ar')) {
    return `${formatted} ${sym}`
  }
  return `${sym} ${formatted}`
}

export function formatNumber(num: number): string {
  if (num === null || num === undefined) return '0'
  return num.toLocaleString(getLocale())
}

export function formatTimeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const locale = getLocale()
  const isAr = locale.startsWith('ar')
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)

  if (seconds < 60) return isAr ? 'الآن' : 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return isAr ? `قبل ${minutes} دقيقة` : `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return isAr ? `قبل ${hours} ساعة` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return isAr ? `قبل ${days} يوم` : `${days}d ago`
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(getLocale(), opts || { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString(getLocale(), {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatWeight(kg: number): string {
  const isAr = getLocale().startsWith('ar')
  return isAr ? `${kg.toFixed(1)} كجم` : `${kg.toFixed(1)} kg`
}
