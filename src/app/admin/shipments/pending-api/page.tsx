'use client'

import { Clock } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="بانتظار الموافقة API"
        subtitle="شحنات واردة من API بانتظار الموافقة"
        icon={Clock}
      />
      <Card className="p-6">
        <div className="py-12 text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">شحنات واردة من API بانتظار الموافقة</p>
          <p className="text-xs mt-2">سيتم تحميل البيانات من قاعدة البيانات</p>
        </div>
      </Card>
    </div>
  )
}
