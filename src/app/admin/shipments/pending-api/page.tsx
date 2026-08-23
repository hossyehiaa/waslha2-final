'use client'

import { ShipmentsWorkTable } from '@/components/dashboard/shipments-work-table'

export default function Page() {
  return (
    <ShipmentsWorkTable
      title="بانتظار الموافقة API"
      subtitle="شحنات واردة من API بانتظار الموافقة — حدد شحنات وغيّر حالتها جماعياً"
      icon="pending-api"
      apiStatus="PENDING"
    />
  )
}
