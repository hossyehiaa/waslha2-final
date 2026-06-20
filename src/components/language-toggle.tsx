'use client'

import { useLanguage } from '@/components/language-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'
import { LOCALES, LOCALE_NAMES } from '@/lib/i18n'

export function LanguageToggle({ variant = 'ghost' }: { variant?: 'ghost' | 'outline' }) {
  const { locale, setLocale } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" className="gap-2 h-9">
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">{locale === 'ar' ? 'ع' : 'EN'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLocale(l)}
            className={`flex items-center justify-between ${locale === l ? 'bg-accent' : ''}`}
          >
            <span className="text-sm">{LOCALE_NAMES[l]}</span>
            {locale === l && <span className="w-2 h-2 rounded-full bg-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
