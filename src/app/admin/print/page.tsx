'use client'

import { Receipt, Printer } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/components/language-provider'

export default function AdminPrintPage() {
  const { dict } = useLanguage()
  const L = dict.pages.print
  return (
    <div className="space-y-6">
      <PageHeader title={L.title} subtitle={L.subtitle} icon={Receipt} />
      <Card className="p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Printer className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{L.bulkPrinting}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{L.bulkDesc}</p>
        <Button className="shadow-premium">
          <Printer className="w-4 h-4 mr-2" />
          {L.startBulkPrint}
        </Button>
      </Card>
    </div>
  )
}
