'use client'

import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'

export default function IntegrationLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/integration-logs').then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load integration logs')
      setLogs(data.logs || [])
    }).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load integration logs')).finally(() => setLoading(false))
  }, [])

  return <div className="space-y-6"><PageHeader title="Integration Logs" subtitle="Partner API requests and response status" icon={Activity} />{loading ? <Card className="h-32 animate-pulse" /> : <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="text-left p-3">Time</th><th className="text-left p-3">Client</th><th className="text-left p-3">Method</th><th className="text-left p-3">Path</th><th className="text-left p-3">Status</th><th className="text-left p-3">Request ID</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-t"><td className="p-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td><td className="p-3">{log.client?.companyName || 'Unauthenticated'}</td><td className="p-3 font-mono">{log.method}</td><td className="p-3 font-mono max-w-sm truncate">{log.path}</td><td className={`p-3 font-semibold ${log.statusCode >= 400 ? 'text-destructive' : 'text-emerald-600'}`}>{log.statusCode}</td><td className="p-3 font-mono text-xs">{log.requestId}</td></tr>)}{logs.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No integration requests have been logged.</td></tr>}</tbody></table></div></Card>}</div>
}
