'use client'

import { ShipmentsWorkTable } from '@/components/dashboard/shipments-work-table'

export default function Page() {
  return (
    <ShipmentsWorkTable
      title="تحصيل شحنات"
      subtitle="شحنات تم تسليمها بانتظار التحصيل — حدد شحنات وغيّر حالتها جماعياً"
      icon="collection"
      apiStatus="DELIVERED"
    />
  )
}
