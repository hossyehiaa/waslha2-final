'use client'

import { useState } from 'react'
import { MapPin, Search, Package } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'
import { useLanguage } from '@/components/language-provider'

type TrackResult = {
  trackingNumber: string
  status: string
  description: string | null
  from: string
  to: string
  weight: number
  pieces: number
  createdAt: string
  deliveredAt: string | null
  history: { status: string; note: string | null; createdAt: string }[]
}

export default function AdminTrackingPage() {
  const { dict, locale, isRTL } = useLanguage()
  const L = dict.pages.tracking
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<TrackResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/track?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || L.notFound)
      } else {
        setResult(data)
      }
    } catch {
      setError(dict.common.networkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={L.title} subtitle={L.subtitle} icon={MapPin} />

      <Card className="p-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={L.placeholder}
              className={`h-12 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
            />
          </div>
          <Button type="submit" disabled={loading} className="h-12 px-6 shadow-premium">
            {loading ? L.searching : L.track}
          </Button>
        </form>
      </Card>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="p-6 space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </Card>
          </motion.div>
        )}

        {error && !loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">{L.notFound}</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </Card>
          </motion.div>
        )}

        {result && !loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-xs text-muted-foreground">{L.trackingNumber}</div>
                  <div className="font-mono font-bold text-xl">{result.trackingNumber}</div>
                </div>
                <StatusBadge status={result.status} size="md" />
              </div>

              <div className="space-y-1 mb-6">
                {result.history.map((h, i) => (
                  <div key={i} className="flex gap-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${i === result.history.length - 1 ? 'bg-primary animate-pulse' : 'bg-emerald-500'}`} />
                      {i < result.history.length - 1 && <div className="w-0.5 h-full bg-border mt-1" />}
                    </div>
                    <div className="flex-1 -mt-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={h.status} />
                        <span className="text-xs text-muted-foreground">{formatDateTime(h.createdAt, )}</span>
                      </div>
                      {h.note && <p className="text-xs text-muted-foreground mt-1">{h.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{L.shipmentDetails}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{L.from}</span><span className="font-medium">{result.from}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{L.to}</span><span className="font-medium">{result.to}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{L.weight}</span><span className="font-medium">{result.weight} kg</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{L.pieces}</span><span className="font-medium">{result.pieces}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{L.created}</span><span className="font-medium text-xs">{formatDateTime(result.createdAt)}</span></div>
                {result.deliveredAt && (
                  <div className="flex justify-between"><span className="text-muted-foreground">{L.delivered}</span><span className="font-medium text-xs">{formatDateTime(result.deliveredAt)}</span></div>
                )}
                {result.description && (
                  <div className="pt-3 border-t">
                    <div className="text-muted-foreground text-xs mb-1">{L.description}</div>
                    <div className="text-sm">{result.description}</div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
