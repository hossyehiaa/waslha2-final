'use client'

import { Wrench } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="التهيئة" subtitle="إعدادات النظام والتهيئة" icon={Wrench} />
      <Card className="p-6">
        <div className="py-8 text-center text-muted-foreground">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">إعدادات النظام والتهيئة</p>
          <p className="text-xs mt-2">الصفحة جاهزة وستعرض البيانات الفعلية</p>
        </div>
      </Card>
    </div>
  )
}
