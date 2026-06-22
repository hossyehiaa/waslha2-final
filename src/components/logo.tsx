'use client'

import { cn } from '@/lib/utils'

/**
 * Wsalhali Logo component
 * 
 * Variants:
 * - 'icon': Just the green icon mark (for small spaces, sidebars, etc.)
 * - 'badge': Full logo with white text on green background (visible everywhere)
 * - 'light': Full logo with dark text (for white/light backgrounds)
 * - 'full': Full logo as-is (only for dark backgrounds where white text is visible)
 */
export function Logo({
  className,
  variant = 'icon',
  size = 'md',
}: {
  className?: string
  variant?: 'icon' | 'badge' | 'light' | 'full'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const sizes = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-12',
    xl: 'h-16',
  }

  const badgeSizes = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
    xl: 'h-18',
  }

  const src = {
    icon: '/wsalhali-icon.png',
    badge: '/wsalhali-logo-badge.png',
    light: '/wsalhali-logo-light.png',
    full: '/wsalhali-logo.png',
  }[variant]

  return (
    <img
      src={src}
      alt="Wsalhali"
      className={cn(
        'w-auto object-contain',
        variant === 'badge' ? badgeSizes[size] : sizes[size],
        className
      )}
    />
  )
}
