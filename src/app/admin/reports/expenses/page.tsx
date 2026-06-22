'use client'

import { TrendingDown } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="تقرير المصروفات"
        subtitle="تقرير المصروفات التفصيلي"
        icon={TrendingDown}
      />
      <Card className="p-6">
        <div className="py-12 text-center text-muted-foreground">
          <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">تقرير المصروفات التفصيلي</p>
          <p className="text-xs mt-2">سيتم تحميل البيانات من قاعدة البيانات</p>
        </div>
      </Card>
    </div>
  )
}
