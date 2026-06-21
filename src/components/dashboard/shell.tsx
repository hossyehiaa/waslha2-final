'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Truck, Package, MapPin, Wallet,
  FileText, Settings, Bell, Search, LogOut, Menu, X, ChevronDown,
  Building2, UserCog, CreditCard, TrendingUp, PackageCheck,
  ArrowLeftRight, Receipt, BarChart3, Boxes, Star, User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { LanguageToggle } from '@/components/language-toggle'
import { Dict } from '@/lib/i18n'

type NavItem = {
  label: string
  href: string
  icon: any
  badge?: string
  children?: { label: string; href: string }[]
}

function buildAdminNav(dict: Dict): NavItem[] {
  return [
    { label: dict.nav.dashboard, href: '/admin', icon: LayoutDashboard },
    { label: dict.nav.shipments, href: '/admin/shipments', icon: Package },
    { label: dict.nav.addShipment, href: '/admin/shipments/new', icon: PackageCheck },
    { label: dict.nav.tracking, href: '/admin/tracking', icon: MapPin },
    {
      label: dict.nav.clients, href: '/admin/clients', icon: Users,
      children: [
        { label: dict.nav.clients, href: '/admin/clients' },
        { label: dict.nav.clientRequests, href: '/admin/clients/requests' },
      ],
    },
    { label: dict.nav.employees, href: '/admin/employees', icon: UserCog },
    { label: dict.nav.drivers, href: '/admin/drivers', icon: Truck },
    { label: dict.nav.branches, href: '/admin/branches', icon: Building2 },
    { label: dict.nav.warehouses, href: '/admin/warehouses', icon: Boxes },
    { label: dict.nav.pickups, href: '/admin/pickups', icon: PackageCheck },
    {
      label: dict.nav.delivery, href: '/admin/delivery', icon: Truck,
      children: [
        { label: dict.nav.delivery, href: '/admin/delivery' },
        { label: dict.nav.returns, href: '/admin/returns' },
        { label: dict.nav.transfers, href: '/admin/transfers' },
      ],
    },
    { label: dict.nav.printLabels, href: '/admin/print', icon: Receipt },
    {
      label: dict.nav.finance, href: '/admin/finance', icon: Wallet,
      children: [
        { label: dict.nav.codSettlements, href: '/admin/finance' },
        { label: dict.nav.payouts, href: '/admin/finance/payouts' },
        { label: dict.nav.invoices, href: '/admin/finance/invoices' },
        { label: dict.nav.expenses, href: '/admin/finance/expenses' },
      ],
    },
    { label: dict.nav.pricing, href: '/admin/pricing', icon: CreditCard },
    { label: dict.nav.reports, href: '/admin/reports', icon: BarChart3 },
    { label: dict.nav.notifications, href: '/admin/notifications', icon: Bell },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
    { label: dict.nav.settings, href: '/admin/settings', icon: Settings },
  ]
}

function buildClientNav(dict: Dict): NavItem[] {
  return [
    { label: dict.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
    { label: dict.nav.myShipments, href: '/dashboard/shipments', icon: Package },
    { label: dict.nav.createShipment, href: '/dashboard/shipments/new', icon: PackageCheck },
    { label: dict.nav.trackShipment, href: '/dashboard/tracking', icon: MapPin },
    { label: dict.nav.pickups, href: '/dashboard/pickups', icon: Truck },
    { label: dict.nav.cod, href: '/dashboard/cod', icon: Wallet },
    { label: dict.nav.invoices, href: '/dashboard/invoices', icon: Receipt },
    { label: dict.nav.addresses, href: '/dashboard/addresses', icon: MapPin },
    { label: dict.nav.notifications, href: '/dashboard/notifications', icon: Bell },
    { label: dict.nav.profile, href: '/dashboard/profile', icon: User },
  ]
}

export function DashboardShell({
  children,
  variant = 'admin',
  user,
}: {
  children: React.ReactNode
  variant?: 'admin' | 'client'
  user: any
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { dict, isRTL } = useLanguage()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const nav = useMemo(
    () => (variant === 'admin' ? buildAdminNav(dict) : buildClientNav(dict)),
    [variant, dict]
  )

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(d => {
      if (d.notifications) setNotifications(d.notifications.slice(0, 5))
    }).catch(() => {})
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/dashboard') return pathname === href
    return pathname.startsWith(href)
  }

  const initials = user?.fullName?.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || 'U'

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/wsalhali-logo-light.png" alt="Wsalhali" className="h-10 w-auto object-contain shrink-0" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-premium p-3 space-y-1">
        {nav.map((item) => {
          const active = isActive(item.href)
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group',
                  active
                    ? 'bg-primary text-primary-foreground shadow-premium'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className={cn('w-4 h-4 shrink-0', active ? '' : 'text-muted-foreground group-hover:text-foreground')} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent text-accent-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
              {item.children && active && (
                <div className={`mt-1 space-y-0.5 border-l border-sidebar-border pl-3 ${isRTL ? 'mr-4 border-r border-l-0 pr-3 pl-0' : 'ml-4'}`}>
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'block px-3 py-1.5 rounded-md text-xs transition-colors',
                        pathname === child.href
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.fullName}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.role}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            onClick={handleLogout}
            title={dict.common.signOut}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-sidebar">
        {sidebar}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side={isRTL ? 'right' : 'left'} className="w-72 p-0">
          {sidebar}
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="h-full px-4 lg:px-6 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="hidden md:flex items-center flex-1 max-w-md">
              <div className="relative w-full">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  type="text"
                  placeholder={dict.common.search + '...'}
                  className={`h-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                />
              </div>
            </div>

            <div className="flex-1 md:hidden" />

            {/* Language Toggle */}
            <LanguageToggle />

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>{dict.common.notifications}</span>
                  <Badge variant="secondary" className="text-xs">{notifications.length} {dict.pages.notifications.unread}</Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {dict.pages.notifications.noNotifications}
                  </div>
                ) : (
                  notifications.map((n) => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start py-2 cursor-pointer">
                      <div className="flex items-center gap-2 w-full">
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        <span className="text-sm font-medium flex-1 truncate">{n.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 pl-4 line-clamp-2">{n.message}</p>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={variant === 'admin' ? '/admin/notifications' : '/dashboard/notifications'} className="text-center justify-center text-sm text-primary">
                    {dict.common.viewAll}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-2 gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate">{user?.fullName}</span>
                    <span className="text-xs text-muted-foreground truncate">{user?.email || user?.username}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={variant === 'admin' ? '/admin/settings' : '/dashboard/profile'}>
                    <User className="w-4 h-4 mr-2" />
                    {dict.common.profile}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={variant === 'admin' ? '/admin/settings' : '/dashboard/profile'}>
                    <Settings className="w-4 h-4 mr-2" />
                    {dict.common.settings}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  {dict.common.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
