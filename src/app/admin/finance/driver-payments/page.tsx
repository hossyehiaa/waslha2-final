'use client'

import { DollarSign } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="سداد المناديب"
        subtitle="إدارة مدفوعات ومستحقات المناديب"
        icon={DollarSign}
      />
      <Card className="p-6">
        <div className="py-12 text-center text-muted-foreground">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">إدارة مدفوعات ومستحقات المناديب</p>
          <p className="text-xs mt-2">سيتم تحميل البيانات من قاعدة البيانات</p>
        </div>
      </Card>
    </div>
  )
}
