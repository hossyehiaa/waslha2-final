'use client'

import { UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="إسناد بيك أب" subtitle="إسناد طلبات البيك أب للمناديب" icon={UserPlus} />
      <Card className="p-6">
        <div className="py-8 text-center text-muted-foreground">
          <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">إسناد طلبات البيك أب للمناديب</p>
          <p className="text-xs mt-2">الصفحة جاهزة وستعرض البيانات الفعلية</p>
        </div>
      </Card>
    </div>
  )
}
