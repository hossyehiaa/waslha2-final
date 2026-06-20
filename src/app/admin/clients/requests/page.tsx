'use client'

import { Users, Plus } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function AdminClientRequestsPage() {
  const router = useRouter()

  const requests = [
    { id: '1', company: 'NewCo Egypt', contact: 'Ahmed K.', phone: '+20 100 123 4567', status: 'PENDING', createdAt: '2026-06-19T10:00:00Z' },
    { id: '2', company: 'Smart Stores', contact: 'Laila M.', phone: '+20 100 987 6543', status: 'PENDING', createdAt: '2026-06-18T14:00:00Z' },
    { id: '3', company: 'Mega Distributors', contact: 'Karim S.', phone: '+20 100 555 1234', status: 'REVIEWING', createdAt: '2026-06-17T09:00:00Z' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Client Requests" subtitle="New merchant onboarding requests" icon={Users} />
      <div className="space-y-3">
        {requests.map((r) => (
          <Card key={r.id} className="p-5 flex items-center gap-4 hover:shadow-premium transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-bold">
              {r.company[0]}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{r.company}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{r.contact} • {r.phone}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Review</Button>
              <Button size="sm" onClick={() => router.push('/admin/clients/new')}>Approve & Create</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
