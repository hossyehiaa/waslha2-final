import { LucideIcon } from 'lucide-react'

export type Stat = {
  label: string
  value: string | number
  icon: LucideIcon
  color?: string
  trend?: string
  link?: string
}
