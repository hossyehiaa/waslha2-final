'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, Lock, User, Eye, EyeOff, ArrowRight, Shield, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'

export default function LoginPage() {
  const router = useRouter()
  const { dict, locale, isRTL } = useLanguage()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)

  const L = dict.login
  const A = dict.auth

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) {
        router.push(d.user.role === 'ADMIN' || d.user.role === 'EMPLOYEE' ? '/admin' : '/dashboard')
      }
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      toast.error(A.fillAllFields)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || A.loginFailed)
        return
      }
      toast.success(`${A.welcomeBack}, ${data.user.fullName}!`)
      router.push(data.redirect)
      router.refresh()
    } catch {
      toast.error(A.networkError)
    } finally {
      setLoading(false)
    }
  }

  const demoAccounts = [
    { role: L.admin, username: 'admin', password: 'admin123', desc: L.adminDesc },
    { role: L.client, username: 'braa', password: 'client123', desc: L.clientDesc },
  ]

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left - Hero / Branding */}
      <div className="lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-emerald-700 text-white p-8 lg:p-12 flex flex-col">
        <div className="absolute inset-0 mesh-bg opacity-30" />
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex items-center justify-between mb-12"
        >
          <div className="flex items-center gap-3">
            <img src="/wsalhali-logo.png" alt="Wsalhali" className="h-12 w-auto object-contain" />
            <p className="text-xs text-white/70">{L.brandTagline}</p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </motion.div>

        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium mb-6">
              <Sparkles className="w-3 h-3" />
              {L.badge}
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              {L.title1}<br />{L.title2}
            </h2>
            <p className="text-white/80 text-lg mb-8">
              {L.subtitle}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-3 gap-4"
          >
            {[
              { label: L.statShipments, value: '32K+' },
              { label: L.statCities, value: '27' },
              { label: L.statOnTime, value: '98.4%' },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl p-4">
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-white/70 mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10 text-xs text-white/60 mt-8">
          © 2026 {dict.common.appName}. {dict.landing.footer.rights}
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">{L.welcome}</h2>
            <p className="text-muted-foreground">{L.subtitle2}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">{L.username}</Label>
              <div className="relative">
                <User className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={L.usernamePlaceholder}
                  className={`h-12 rounded-xl ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">{L.password}</Label>
                <button type="button" className="text-xs text-primary hover:underline">
                  {L.forgotPassword}
                </button>
              </div>
              <div className="relative">
                <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={L.passwordPlaceholder}
                  className={`h-12 rounded-xl ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ${isRTL ? 'left-3' : 'right-3'}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  {L.rememberMe}
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-base font-medium shadow-premium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {L.signingIn}
                </>
              ) : (
                <>
                  {L.signIn}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Shield className="w-3 h-3" />
              {L.demoAccounts}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => {
                    setUsername(acc.username)
                    setPassword(acc.password)
                  }}
                  className="text-left p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/40 transition-all group"
                >
                  <div className="text-sm font-semibold group-hover:text-primary transition-colors">{acc.role}</div>
                  <div className="text-xs text-muted-foreground mt-1">{acc.desc}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">{acc.username} / {acc.password}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {isRTL ? '→' : '←'} {L.backHome}
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
