'use client'

import { cn } from '@/lib/utils'

/**
 * Wsalhali Logo component
 * Uses the icon-only version (green icon) which is visible on any background
 * No text name next to it - just the logo mark
 */
export function Logo({
  className,
  size = 'md',
  withBackground = false,
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  withBackground?: boolean
}) {
  const sizes = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-12',
    xl: 'h-16',
  }

  return (
    <div
      className={cn(
        'flex items-center',
        withBackground && 'bg-primary/5 rounded-lg p-1.5',
        className
      )}
    >
      <img
        src="/wsalhali-icon.png"
        alt="Wsalhali"
        className={cn('w-auto object-contain', sizes[size])}
      />
    </div>
  )
}
