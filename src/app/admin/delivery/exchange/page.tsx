'use client'

import { RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="استبدال مندوبين الشحنات" subtitle="استبدال مندوب بشحناته لمندوب آخر" icon={RefreshCw} />
      <Card className="p-6">
        <div className="py-8 text-center text-muted-foreground">
          <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">استبدال مندوب بشحناته لمندوب آخر</p>
          <p className="text-xs mt-2">الصفحة جاهزة وستعرض البيانات الفعلية</p>
        </div>
      </Card>
    </div>
  )
}
