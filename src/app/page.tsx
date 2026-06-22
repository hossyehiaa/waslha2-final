'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  Package, Truck, MapPin, Shield, Zap, BarChart3, Search,
  ArrowRight, CheckCircle2, Globe, Clock, Wallet, Users,
  Star, ChevronDown, Menu, X, LogIn, TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'

export default function HomePage() {
  const router = useRouter()
  const { t, dict, locale, isRTL } = useLanguage()
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingResult, setTrackingResult] = useState<any>(null)
  const [tracking, setTracking] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 300], [0, 60])
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0.4])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault()
    if (!trackingNumber.trim()) {
      toast.error(locale === 'ar' ? 'أدخل رقم التتبع' : 'Enter a tracking number')
      return
    }
    setTracking(true)
    setTrackingResult(null)
    try {
      const res = await fetch(`/api/track?q=${encodeURIComponent(trackingNumber.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || (locale === 'ar' ? 'رقم التتبع غير موجود' : 'Tracking number not found'))
        setTrackingResult(null)
      } else {
        setTrackingResult(data)
      }
    } catch {
      toast.error(locale === 'ar' ? 'فشل التتبع' : 'Failed to fetch tracking')
    } finally {
      setTracking(false)
    }
  }

  const L = dict.landing

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass shadow-premium' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <img src="/wsalhali-logo-badge.png" alt="Wsalhali" className="h-10 w-auto object-contain" />
          </a>

          <nav className="hidden md:flex items-center gap-1">
            {[L.nav.services, L.nav.pricing, L.nav.coverage, L.nav.about].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-all"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex"
              onClick={() => router.push('/login')}
            >
              {L.nav.signIn}
            </Button>
            <Button
              size="sm"
              className="hidden md:flex shadow-premium"
              onClick={() => router.push('/login')}
            >
              {L.nav.getStarted}
              <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'mr-1.5 rotate-180' : 'ml-1.5'}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenu && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden glass border-t border-border overflow-hidden"
            >
              <div className="p-4 space-y-2">
                {[L.nav.services, L.nav.pricing, L.nav.coverage, L.nav.about].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                    className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg"
                    onClick={() => setMobileMenu(false)}
                  >
                    {item}
                  </a>
                ))}
                <Button
                  className="w-full mt-2"
                  onClick={() => router.push('/login')}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {L.nav.signIn}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 mesh-bg opacity-60" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative max-w-7xl mx-auto px-4 lg:px-8 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-border mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium">{L.hero.badge}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.05]"
          >
            {L.hero.title1}<br />
            <span className="gradient-text">{L.hero.title2}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            {L.hero.subtitle}
          </motion.p>

          {/* Tracking Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-2xl mx-auto mb-12"
          >
            <form onSubmit={handleTrack} className="glass-card rounded-2xl p-2 shadow-premium flex gap-2">
              <div className="relative flex-1">
                <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-4' : 'left-4'}`} />
                <Input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder={L.hero.trackPlaceholder}
                  className={`border-0 h-12 bg-transparent focus-visible:ring-0 text-base ${isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'}`}
                />
              </div>
              <Button type="submit" disabled={tracking} className="h-12 px-6 rounded-xl">
                {tracking ? L.hero.tracking : L.hero.track}
                {!tracking && <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />}
              </Button>
            </form>

            <AnimatePresence>
              {trackingResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-card rounded-2xl p-5 mt-3 text-left shadow-premium"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-xs text-muted-foreground">{L.hero.trackingNumber}</div>
                      <div className="font-mono font-bold text-lg">{trackingResult.trackingNumber}</div>
                    </div>
                    <Badge className={
                      trackingResult.status === 'DELIVERED' ? 'status-delivered' :
                      trackingResult.status === 'IN_TRANSIT' ? 'status-in-transit' :
                      trackingResult.status === 'PENDING' ? 'status-pending' : 'status-failed'
                    }>
                      {dict.statuses[trackingResult.status as keyof typeof dict.statuses] || trackingResult.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {(trackingResult.history || []).slice().reverse().map((h: any, i: number) => (
                      <div key={i} className="flex gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{dict.statuses[h.status as keyof typeof dict.statuses] || h.status.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(h.createdAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                            {h.note && ` • ${h.note}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button
              size="lg"
              className="h-14 px-8 text-base shadow-premium"
              onClick={() => router.push('/login')}
            >
              {L.hero.startShipping}
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base"
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {L.hero.exploreFeatures}
              <ChevronDown className={`w-4 h-4 ${isRTL ? 'mr-2' : 'ml-2'}`} />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <section className="border-y bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Package, label: L.stats.shipmentsDelivered, value: '32,487', trend: '+12.4%' },
              { icon: Clock, label: L.stats.avgDeliveryTime, value: locale === 'ar' ? '1.8 يوم' : '1.8 days', trend: '-8.2%' },
              { icon: Globe, label: L.stats.citiesCovered, value: '27', trend: locale === 'ar' ? '+3 جديد' : '+3 new' },
              { icon: Star, label: L.stats.customerRating, value: '4.9/5', trend: locale === 'ar' ? 'الفئة العليا' : 'Top tier' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center md:text-left"
              >
                <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-emerald-600 font-medium">{stat.trend}</span>
                </div>
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services / Features */}
      <section id="services" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge variant="secondary" className="mb-4">{L.services.badge}</Badge>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              {L.services.title}
            </h2>
            <p className="text-lg text-muted-foreground">
              {L.services.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Package, ...L.services.items.smartShipment, color: 'from-emerald-500 to-teal-600' },
              { icon: Truck, ...L.services.items.liveTracking, color: 'from-amber-500 to-orange-600' },
              { icon: Wallet, ...L.services.items.codSettlements, color: 'from-purple-500 to-pink-600' },
              { icon: BarChart3, ...L.services.items.analytics, color: 'from-rose-500 to-red-600' },
              { icon: Shield, ...L.services.items.roleAccess, color: 'from-cyan-500 to-blue-600' },
              { icon: MapPin, ...L.services.items.branchNetwork, color: 'from-lime-500 to-green-600' },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="group relative p-6 rounded-2xl border border-border bg-card hover:shadow-premium transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                <div className={`mt-4 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {L.services.learnMore}
                  <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'mr-1 rotate-180' : 'ml-1'}`} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-card/30 backdrop-blur-sm border-y">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge variant="secondary" className="mb-4">{L.howItWorks.badge}</Badge>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              {L.howItWorks.title}
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', ...L.howItWorks.steps.create, icon: Package },
              { step: '02', ...L.howItWorks.steps.schedule, icon: Truck },
              { step: '03', ...L.howItWorks.steps.track, icon: MapPin },
              { step: '04', ...L.howItWorks.steps.paid, icon: Wallet },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative"
              >
                {i < 3 && (
                  <div className="hidden md:block absolute top-8 left-[60%] right-[-20%] h-px border-t-2 border-dashed border-border" />
                )}
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-background border-2 border-primary/20 flex items-center justify-center mb-4 relative">
                    <s.icon className="w-7 h-7 text-primary" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge variant="secondary" className="mb-4">{L.pricing.badge}</Badge>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              {L.pricing.title}
            </h2>
            <p className="text-lg text-muted-foreground">
              {L.pricing.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { ...L.pricing.plans.standard, popular: false },
              { ...L.pricing.plans.express, popular: true },
              { ...L.pricing.plans.enterprise, popular: false },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative p-8 rounded-3xl border-2 transition-all ${
                  plan.popular
                    ? 'border-primary bg-card shadow-premium scale-105'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {L.pricing.mostPopular}
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>
                <div className="text-4xl font-bold mb-6">{plan.price}</div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`w-4 h-4 text-emerald-500 shrink-0 ${isRTL ? 'order-2' : ''}`} />
                      <span className={isRTL ? 'order-1' : ''}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => router.push('/login')}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage Map */}
      <section id="coverage" className="py-24 bg-card/30 backdrop-blur-sm border-y">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">{L.coverage.badge}</Badge>
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6">
                {L.coverage.title}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {L.coverage.subtitle}
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { label: L.coverage.activeBranches, value: '12+' },
                  { label: L.coverage.citiesServed, value: '27' },
                  { label: L.coverage.activeDrivers, value: '450+' },
                  { label: L.coverage.warehouses, value: '8' },
                ].map((s) => (
                  <div key={s.label} className="p-4 rounded-xl border border-border bg-background">
                    <div className="text-2xl font-bold text-primary">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={() => router.push('/login')}>
                {L.coverage.viewFull}
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
              </Button>
            </div>

            <div className="relative aspect-square max-w-md mx-auto">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-8 rounded-full border-2 border-dashed border-accent/30"
              />
              <div className="absolute inset-16 rounded-full glass-card flex items-center justify-center">
                <div className="text-center">
                  <Globe className="w-16 h-16 text-primary mx-auto mb-3" />
                  <div className="text-2xl font-bold">{L.coverage.egypt}</div>
                  <div className="text-sm text-muted-foreground">27 {L.coverage.citiesCovered}</div>
                </div>
              </div>
              {[0, 60, 120, 180, 240, 300].map((angle) => (
                <motion.div
                  key={angle}
                  className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-primary shadow-glow"
                  style={{ transform: `rotate(${angle}deg) translateY(-200px)` }}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: angle / 60 }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="about" className="py-24 lg:py-32">
        <div className="max-w-5xl mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden p-12 lg:p-20 text-center bg-gradient-to-br from-primary via-primary to-emerald-700 text-white"
          >
            <div className="absolute inset-0 mesh-bg opacity-30" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />

            <div className="relative z-10">
              <TrendingUp className="w-12 h-12 mx-auto mb-6 opacity-80" />
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6">
                {L.cta.title}
              </h2>
              <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
                {L.cta.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-14 px-8 text-base"
                  onClick={() => router.push('/login')}
                >
                  {L.cta.getStarted}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-base border-white/30 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {L.cta.learnMore}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img src="/wsalhali-logo-light.png" alt="Wsalhali" className="h-10 w-auto mb-4 object-contain" />
              <p className="text-sm text-muted-foreground">
                {L.footer.description}
              </p>
            </div>
            {[
              { title: L.footer.platform, links: [L.footer.features, L.footer.pricing, L.footer.coverage, L.footer.apiDocs] },
              { title: L.footer.company, links: [L.footer.about, L.footer.careers, L.footer.press, L.footer.contact] },
              { title: L.footer.legal, links: [L.footer.privacy, L.footer.terms, L.footer.security, L.footer.compliance] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 {dict.common.appName}. {L.footer.rights}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {L.footer.systemsOperational}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
