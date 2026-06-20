'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Users, Wallet, Package, Star, MapPin, Phone, Mail, Building2 } from 'lucide-react'
import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/format'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/clients')
      .then(r => r.json())
      .then(d => {
        const c = (d.clients || []).find((x: any) => x.id === id)
        setClient(c)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  if (!client) return <div className="text-center py-20 text-muted-foreground">Client not found</div>

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.companyName}
        subtitle={`@${client.username} • Joined ${formatDate(client.createdAt)}`}
        icon={Users}
        breadcrumb={[{ label: 'Clients', href: '/admin/clients' }, { label: client.companyName }]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl font-bold">
                {(client.companyName || '?')[0]}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{client.companyName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={client.status} />
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {client.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="text-sm font-medium">{client.email || '-'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <div className="text-sm font-medium">{client.phone || '-'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Location</div>
                  <div className="text-sm font-medium">{client.city ? `${client.city}${client.branch ? ` / ${client.branch}` : ''}` : '-'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Last Login</div>
                  <div className="text-sm font-medium">{client.lastLoginAt ? formatDate(client.lastLoginAt) : 'Never'}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">COD Balance</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Available</span><span className="font-bold text-emerald-600">{formatCurrency(client.codBalance)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pending</span><span className="font-medium">{formatCurrency(client.codPending)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Collected</span><span className="font-medium">{formatCurrency(client.codCollected)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-medium">{formatCurrency(client.codPaid)}</span></div>
              <div className="pt-3 border-t flex justify-between"><span className="text-muted-foreground">Shipping Balance</span><span className="font-bold">{formatCurrency(client.shippingBalance)}</span></div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Activity</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-2"><Package className="w-3.5 h-3.5" /> Total Shipments</span><span className="font-bold">{client.totalShipments}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-2"><Package className="w-3.5 h-3.5" /> Active</span><span className="font-bold text-amber-600">{client.activeShipments}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> Rating</span><span className="font-bold">{client.rating.toFixed(1)}/5</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
