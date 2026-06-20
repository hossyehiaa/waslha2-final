'use client'

import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Stat } from './stat-card'

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <StatCard key={stat.label} stat={stat} delay={i * 0.05} />
      ))}
    </div>
  )
}

function StatCard({ stat, delay = 0 }: { stat: Stat; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="p-5 hover:shadow-premium transition-all duration-300 relative overflow-hidden group">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors" />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              stat.color || 'bg-primary/10 text-primary'
            }`}>
              <stat.icon className="w-5 h-5" />
            </div>
            {stat.trend && (
              <span className={`text-xs font-medium flex items-center gap-0.5 ${
                stat.trend.startsWith('-') ? 'text-rose-500' : 'text-emerald-500'
              }`}>
                {stat.trend.startsWith('-') ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                {stat.trend}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
          <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
        </div>
      </Card>
    </motion.div>
  )
}
