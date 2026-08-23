'use client'

import { ShipmentsWorkTable } from '@/components/dashboard/shipments-work-table'

export default function Page() {
  return (
    <ShipmentsWorkTable
      title="تسليم الشحنات"
      subtitle="شحنات خرجت للتوصيل — حدد شحنات وغيّر حالتها جماعياً"
      icon="delivery"
      apiStatus="OUT_FOR_DELIVERY"
    />
  )
}
