'use client'

import { ShipmentsWorkTable } from '@/components/dashboard/shipments-work-table'

export default function Page() {
  return (
    <ShipmentsWorkTable
      title="حركة الشحنات"
      subtitle="متابعة حركة الشحنات — حدد شحنات وغيّر حالتها جماعياً"
      icon="movement"
      apiStatus="IN_TRANSIT"
    />
  )
}
