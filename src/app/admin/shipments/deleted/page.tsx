'use client'

import { ShipmentsWorkTable } from '@/components/dashboard/shipments-work-table'

export default function Page() {
  return (
    <ShipmentsWorkTable
      title="الشحنات المحذوفة"
      subtitle="استعادة ومراجعة الشحنات المحذوفة — حدد شحنات وغيّر حالتها جماعياً"
      icon="deleted"
      apiStatus="CANCELLED"
    />
  )
}
