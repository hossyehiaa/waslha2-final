'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, DEFAULT_LOCALE, LOCALE_DIR, getDict, Dict } from '@/lib/i18n'

type LanguageContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  toggleLocale: () => void
  dir: 'ltr' | 'rtl'
  t: (path: string) => string
  dict: Dict
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const STORAGE_KEY = 'wsalhali_locale'

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Lazy-initialize from localStorage to avoid the setState-in-effect cascade
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return DEFAULT_LOCALE
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (saved === 'ar' || saved === 'en') return saved
    } catch {}
    return DEFAULT_LOCALE
  })

  // Update <html> dir and lang attributes
  useEffect(() => {
    const dir = LOCALE_DIR[locale]
    document.documentElement.dir = dir
    document.documentElement.lang = locale
    // Apply font family based on locale
    if (locale === 'ar') {
      document.documentElement.classList.add('font-arabic')
    } else {
      document.documentElement.classList.remove('font-arabic')
    }
  }, [locale])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch {}
  }

  const toggleLocale = () => setLocale(locale === 'en' ? 'ar' : 'en')

  const t = (path: string) => {
    const dict = getDict(locale) as any
    const parts = path.split('.')
    let val = dict
    for (const p of parts) {
      if (val == null) return path
      val = val[p]
    }
    return typeof val === 'string' ? val : path
  }

  const value: LanguageContextValue = {
    locale,
    setLocale,
    toggleLocale,
    dir: LOCALE_DIR[locale],
    t,
    dict: getDict(locale),
    isRTL: locale === 'ar',
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
