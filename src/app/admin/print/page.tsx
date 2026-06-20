'use client'

import { Receipt, Printer } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminPrintPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Print Labels" subtitle="Generate and print shipping labels" icon={Receipt} />
      <Card className="p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Printer className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Bulk Label Printing</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Select shipments and generate printable PDF labels with barcodes and QR codes.
        </p>
        <Button className="shadow-premium">
          <Printer className="w-4 h-4 mr-2" />
          Start Bulk Print
        </Button>
      </Card>
    </div>
  )
}
