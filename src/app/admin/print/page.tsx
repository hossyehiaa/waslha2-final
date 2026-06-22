'use client'

import { useEffect, useState, useRef } from 'react'
import { Receipt, Printer, Search, Package } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useLanguage } from '@/components/language-provider'
import { toast } from 'sonner'

type Shipment = {
  id: string
  trackingNumber: string
  client: string
  senderCity: string
  recipientCity: string
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  status: string
  codAmount: number
  weight: number
  pieces: number
}

export default function AdminPrintPage() {
  const { dict } = useLanguage()
  const L = dict.pages.print
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [printing, setPrinting] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/shipments?limit=50')
      .then(r => r.json())
      .then(d => setShipments(d.shipments || []))
      .catch(() => toast.error(dict.common.noData))
      .finally(() => setLoading(false))
  }, [dict])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === shipments.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(shipments.map(s => s.id)))
    }
  }

  const filtered = shipments.filter(s =>
    !search ||
    s.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
    s.recipientName.toLowerCase().includes(search.toLowerCase()) ||
    s.client.toLowerCase().includes(search.toLowerCase())
  )

  const selectedShipments = shipments.filter(s => selected.has(s.id))

  function generateBarcode(trackingNumber: string): string {
    // Use a simple SVG barcode pattern based on tracking number characters
    // Each character generates a pattern of bars
    let bars = ''
    for (let i = 0; i < trackingNumber.length; i++) {
      const charCode = trackingNumber.charCodeAt(i)
      const pattern = (charCode % 8).toString(2).padStart(3, '0')
      for (let j = 0; j < 3; j++) {
        const width = pattern[j] === '1' ? 3 : 1
        if (j % 2 === 0) {
          bars += `<rect x="${i * 12 + j * 4}" y="0" width="${width}" height="40" fill="black"/>`
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${trackingNumber.length * 12}" height="40" viewBox="0 0 ${trackingNumber.length * 12} 40">${bars}</svg>`
  }

  function handlePrint() {
    if (selected.size === 0) {
      toast.error('Select at least one shipment')
      return
    }
    setPrinting(true)

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      toast.error('Please allow popups to print labels')
      setPrinting(false)
      return
    }

    const labels = selectedShipments.map(s => `
      <div class="label">
        <div class="header">
          <div class="logo">Wslahali</div>
          <div class="tracking">${s.trackingNumber}</div>
        </div>
        <div class="barcode">${generateBarcode(s.trackingNumber)}</div>
        <div class="tracking-text">${s.trackingNumber}</div>
        <div class="info">
          <div class="row"><span>From:</span> ${s.senderCity}</div>
          <div class="row"><span>To:</span> ${s.recipientCity}</div>
          <div class="row"><span>Recipient:</span> ${s.recipientName}</div>
          <div class="row"><span>Phone:</span> ${s.recipientPhone}</div>
          <div class="row"><span>Address:</span> ${s.recipientAddress || '-'}</div>
          <div class="row"><span>Weight:</span> ${s.weight} kg</div>
          <div class="row"><span>Pieces:</span> ${s.pieces}</div>
          <div class="row cod"><span>COD:</span> ${s.codAmount} EGP</div>
        </div>
        <div class="client">Client: ${s.client}</div>
      </div>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Shipping Labels - Wslahali</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .label {
              border: 2px solid #000;
              padding: 16px;
              margin-bottom: 20px;
              width: 4in;
              height: 6in;
              page-break-after: always;
              display: flex;
              flex-direction: column;
            }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
            .logo { font-size: 24px; font-weight: bold; color: #0d9488; }
            .tracking { font-size: 14px; font-family: monospace; font-weight: bold; }
            .barcode { text-align: center; margin: 12px 0; }
            .barcode svg { max-width: 100%; height: 60px; }
            .tracking-text { text-align: center; font-family: monospace; font-size: 16px; font-weight: bold; margin-bottom: 12px; letter-spacing: 2px; }
            .info { flex: 1; }
            .row { font-size: 13px; margin-bottom: 4px; padding: 2px 0; border-bottom: 1px dotted #ccc; }
            .row span { font-weight: bold; display: inline-block; width: 80px; }
            .row.cod { font-size: 16px; font-weight: bold; background: #fef3c7; padding: 4px; margin-top: 8px; }
            .client { margin-top: 12px; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 8px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${labels}</body>
      </html>
    `)
    printWindow.document.close()

    setTimeout(() => {
      printWindow.print()
      setPrinting(false)
    }, 500)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={L.title}
        subtitle={L.subtitle}
        icon={Receipt}
        actions={
          <Button onClick={handlePrint} disabled={printing || selected.size === 0} className="shadow-premium">
            <Printer className="w-4 h-4 mr-2" />
            {printing ? dict.common.loading : `${L.startBulkPrint} (${selected.size})`}
          </Button>
        }
      />

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by tracking #, recipient, client..."
                className="pl-10 h-9"
              />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={selectAll}>
            {selected.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{dict.common.noData}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-premium">
            {filtered.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  selected.has(s.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/30'
                }`}
                onClick={() => toggleSelect(s.id)}
              >
                <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-sm">{s.trackingNumber}</span>
                    <Badge variant="secondary" className="text-xs">{s.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {s.client} • {s.recipientName} • {s.senderCity} → {s.recipientCity}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm">{s.codAmount} EGP</div>
                  <div className="text-xs text-muted-foreground">{s.weight} kg</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 bg-muted/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">{L.bulkPrinting}</h3>
            <p className="text-sm text-muted-foreground">{L.bulkDesc}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
