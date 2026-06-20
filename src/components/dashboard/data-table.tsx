'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/components/language-provider'

export type Column<T> = {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
  hideOnMobile?: boolean
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  filters = [],
  onRowClick,
  emptyMessage,
  pageSize = 10,
}: {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  filters?: { label: string; value: string; options: { label: string; value: string }[]; onChange: (v: string) => void }[]
  onRowClick?: (row: T) => void
  emptyMessage?: string
  pageSize?: number
}) {
  const { dict, isRTL } = useLanguage()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const emptyMsg = emptyMessage || dict.common.noData

  const filtered = useMemo(() => {
    let result = data
    if (search && searchKeys.length > 0) {
      const q = search.toLowerCase()
      result = result.filter((row) =>
        searchKeys.some((k) =>
          String(row[k] ?? '').toLowerCase().includes(q)
        )
      )
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = (a as any)[sortKey]
        const bv = (b as any)[sortKey]
        if (av == null) return 1
        if (bv == null) return -1
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av
        }
        const ac = String(av).toLowerCase()
        const bc = String(bv).toLowerCase()
        return sortDir === 'asc' ? ac.localeCompare(bc) : bc.localeCompare(ac)
      })
    }
    return result
  }, [data, search, searchKeys, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <Card className="overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={searchPlaceholder}
            className={`h-9 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((f) => (
            <Select key={f.label} value={f.value} onValueChange={f.onChange}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{dict.common.all} — {f.label}</SelectItem>
                {f.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          <Button variant="outline" size="sm" className="h-9">
            <Download className={`w-3.5 h-3.5 ${isRTL ? 'ml-1.5' : 'mr-1.5'}`} />
            {dict.common.export}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-premium">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr className="border-b text-xs text-muted-foreground">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 font-medium ${col.className || ''} ${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => toggleSort(col.key)}
                      className={`flex items-center gap-1 hover:text-foreground transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      {col.header}
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className={`py-3 px-4 ${col.hideOnMobile ? 'hidden md:table-cell' : ''}`}>
                      <Skeleton className="h-5 w-full max-w-[100px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center text-muted-foreground">
                  {emptyMsg}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={`border-b last:border-0 hover:bg-accent/30 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`py-3 px-4 ${col.className || ''} ${col.hideOnMobile ? 'hidden md:table-cell' : ''} ${isRTL ? 'text-right' : 'text-left'}`}>
                      {col.cell(row)}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="p-4 border-t flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            {isRTL ? (
              <>{dict.common.view} <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span>–<span className="font-medium text-foreground">{Math.min(currentPage * pageSize, filtered.length)}</span> {dict.common.all} <span className="font-medium text-foreground">{filtered.length}</span></>
            ) : (
              <>Showing <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span>–<span className="font-medium text-foreground">{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-medium text-foreground">{filtered.length}</span></>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {dict.common.prev}
            </Button>
            <span className="text-muted-foreground text-xs px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              {dict.common.next}
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
