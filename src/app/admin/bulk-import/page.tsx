'use client'

import { useState, useRef } from 'react'
import { PackageCheck, Upload, FileSpreadsheet, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { downloadCSV } from '@/lib/export-utils'

export default function AdminBulkImportPage() {
  const { dict } = useLanguage()
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      await processCSV(text, file.name)
    }
    reader.readAsText(file)
  }

  async function processCSV(csvText: string, filename: string) {
    setUploading(true)
    try {
      // Parse CSV
      const lines = csvText.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) {
        toast.error('CSV file must have a header row and at least one data row')
        return
      }

      const headers = parseCSVLine(lines[0])
      const shipments = lines.slice(1).map(line => {
        const values = parseCSVLine(line)
        const row: Record<string, string> = {}
        headers.forEach((h, i) => { row[h.trim()] = (values[i] || '').trim() })
        return row
      })

      // Send to API
      const res = await fetch('/api/admin/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipments, filename }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Import failed')
        return
      }

      setResults(data)
      toast.success(`Imported ${data.successCount} of ${data.total} shipments`)
    } catch (err) {
      toast.error('Failed to process file')
    } finally {
      setUploading(false)
    }
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else { inQuotes = !inQuotes }
      } else if (char === ',' && !inQuotes) {
        result.push(current); current = ''
      } else { current += char }
    }
    result.push(current)
    return result
  }

  function downloadTemplate() {
    const template = [
      { senderName: 'ABC Store', senderPhone: '+201000000000', senderCity: 'Cairo', recipientName: 'John Doe', recipientPhone: '+201111111111', recipientAddress: '123 Main St', recipientCity: 'Giza', codAmount: '500', weight: '1.5', pieces: '1', description: 'Electronics' },
      { senderName: 'ABC Store', senderPhone: '+201000000000', senderCity: 'Cairo', recipientName: 'Jane Smith', recipientPhone: '+201222222222', recipientAddress: '456 Oak Ave', recipientCity: 'Alexandria', codAmount: '1200', weight: '2.0', pieces: '2', description: 'Books' },
    ]
    downloadCSV(template, 'bulk_import_template', [
      { key: 'senderName', label: 'senderName' },
      { key: 'senderPhone', label: 'senderPhone' },
      { key: 'senderCity', label: 'senderCity' },
      { key: 'recipientName', label: 'recipientName' },
      { key: 'recipientPhone', label: 'recipientPhone' },
      { key: 'recipientAddress', label: 'recipientAddress' },
      { key: 'recipientCity', label: 'recipientCity' },
      { key: 'codAmount', label: 'codAmount' },
      { key: 'weight', label: 'weight' },
      { key: 'pieces', label: 'pieces' },
      { key: 'description', label: 'description' },
    ])
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Shipment Import"
        subtitle="Upload a CSV file to create multiple shipments at once"
        icon={PackageCheck}
        actions={
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
        }
      />

      {/* Upload area */}
      <Card
        className={`p-12 border-2 border-dashed transition-all cursor-pointer ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        <div className="text-center">
          {uploading ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Upload className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Processing...</h3>
              <p className="text-sm text-muted-foreground">Creating shipments from your file</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Upload CSV File</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Drag & drop or click to select a CSV file with shipment data
              </p>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-6">
        <h3 className="font-semibold mb-3">CSV File Format</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Your CSV file must have the following columns (headers in the first row):
        </p>
        <div className="grid md:grid-cols-2 gap-2">
          {[
            { name: 'senderName', req: 'Optional', desc: 'Sender name (defaults to client name)' },
            { name: 'senderPhone', req: 'Optional', desc: 'Sender phone' },
            { name: 'senderCity', req: 'Optional', desc: 'Sender city name' },
            { name: 'recipientName', req: 'Required', desc: 'Recipient name' },
            { name: 'recipientPhone', req: 'Required', desc: 'Recipient phone' },
            { name: 'recipientAddress', req: 'Required', desc: 'Delivery address' },
            { name: 'recipientCity', req: 'Required', desc: 'City name (must exist)' },
            { name: 'codAmount', req: 'Optional', desc: 'COD amount in EGP (default: 0)' },
            { name: 'weight', req: 'Optional', desc: 'Weight in kg (default: 0.5)' },
            { name: 'pieces', req: 'Optional', desc: 'Number of pieces (default: 1)' },
            { name: 'description', req: 'Optional', desc: 'Package description' },
          ].map((col) => (
            <div key={col.name} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
              <code className="text-xs font-mono font-medium">{col.name}</code>
              <Badge variant={col.req === 'Required' ? 'destructive' : 'secondary'} className="text-xs">
                {col.req}
              </Badge>
              <span className="text-xs text-muted-foreground flex-1">{col.desc}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Results */}
      {results && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Import Results</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-2xl font-bold">{results.total}</div>
              <div className="text-xs text-muted-foreground">Total Rows</div>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-center">
              <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-emerald-600">{results.successCount}</div>
              <div className="text-xs text-muted-foreground">Successful</div>
            </div>
            <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-center">
              <XCircle className="w-5 h-5 text-rose-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-rose-600">{results.failCount}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>

          {results.errors && results.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Errors ({results.errors.length})
              </h4>
              <div className="max-h-60 overflow-y-auto scrollbar-premium space-y-1">
                {results.errors.map((err: any, i: number) => (
                  <div key={i} className="text-xs p-2 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400">
                    <strong>Row {err.row}:</strong> {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.results && results.results.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Created Shipments ({results.results.length})
              </h4>
              <div className="max-h-60 overflow-y-auto scrollbar-premium space-y-1">
                {results.results.map((r: any, i: number) => (
                  <div key={i} className="text-xs p-2 rounded bg-emerald-50 dark:bg-emerald-950/30">
                    <strong>Row {r.row}:</strong> {r.trackingNumber}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
