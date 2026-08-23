'use client'

import { ShipmentsWorkTable } from '@/components/dashboard/shipments-work-table'

export default function Page() {
  return (
    <ShipmentsWorkTable
      title="الشحنات المؤجلة"
      subtitle="شحنات فشل تسليمها وأُجلت — حدد شحنات وغيّر حالتها جماعياً"
      icon="postponed"
      apiStatus="FAILED"
    />
  )
}
