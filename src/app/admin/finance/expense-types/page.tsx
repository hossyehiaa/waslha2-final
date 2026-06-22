'use client'

import { ListChecks } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="أنواع المصروفات"
        subtitle="إدارة أنواع وفئات المصروفات"
        icon={ListChecks}
      />
      <Card className="p-6">
        <div className="py-12 text-center text-muted-foreground">
          <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">إدارة أنواع وفئات المصروفات</p>
          <p className="text-xs mt-2">سيتم تحميل البيانات من قاعدة البيانات</p>
        </div>
      </Card>
    </div>
  )
}
