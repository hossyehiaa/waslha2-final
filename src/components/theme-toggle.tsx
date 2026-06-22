'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  // Track if component has been rendered on client to avoid hydration mismatch
  const [mounted, setMounted] = useState(false)

  // Use a callback ref pattern to avoid setState in effect
  const ref = (el: HTMLButtonElement | null) => {
    if (el && !mounted) {
      setMounted(true)
    }
  }

  if (!mounted) {
    return <Button ref={ref} variant="ghost" size="icon" className="h-9 w-9"><Sun className="w-4 h-4" /></Button>
  }

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  )
}
