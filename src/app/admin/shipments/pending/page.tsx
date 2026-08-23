'use client'

import { ShipmentsWorkTable } from '@/components/dashboard/shipments-work-table'

export default function Page() {
  return (
    <ShipmentsWorkTable
      title="بانتظار الموافقة"
      subtitle="شحنات بانتظار الموافقة — حدد شحنات وغيّر حالتها جماعياً"
      icon="pending"
      apiStatus="PENDING"
    />
  )
}
