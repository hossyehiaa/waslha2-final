'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, X, Save } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'

type Field = {
  key: string
  label: string
  type: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox'
  placeholder?: string
  required?: boolean
  options?: { label: string; value: string }[]
  defaultValue?: string | boolean | number
  helperText?: string
}

export function EntityFormModal({
  open,
  onOpenChange,
  title,
  fields,
  onSubmit,
  initialData,
  submitLabel,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  fields: Field[]
  onSubmit: (data: Record<string, any>) => Promise<void>
  initialData?: Record<string, any>
  submitLabel?: string
}) {
  const { dict } = useLanguage()
  const [form, setForm] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      const initial: Record<string, any> = {}
      fields.forEach((f) => {
        initial[f.key] = initialData?.[f.key] ?? f.defaultValue ?? (f.type === 'checkbox' ? false : f.type === 'number' ? 0 : '')
      })
      setForm(initial)
    }
  }, [open, initialData, fields])

  function setField(k: string, v: any) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Validate required fields
    for (const f of fields) {
      if (f.required && !form[f.key] && form[f.key] !== 0) {
        toast.error(`${f.label} ${dict.common.required}`)
        return
      }
    }
    setLoading(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || dict.common.noData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {fields.map((f) => {
              const colSpan = f.type === 'textarea' ? 'md:col-span-2' : ''
              return (
                <div key={f.key} className={`space-y-2 ${colSpan}`}>
                  <Label className="text-sm font-medium">
                    {f.label} {f.required && <span className="text-destructive">*</span>}
                  </Label>
                  {f.type === 'text' && (
                    <Input
                      type="text"
                      value={form[f.key] ?? ''}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      required={f.required}
                    />
                  )}
                  {f.type === 'number' && (
                    <Input
                      type="number"
                      step="0.01"
                      value={form[f.key] ?? ''}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      required={f.required}
                    />
                  )}
                  {f.type === 'email' && (
                    <Input
                      type="email"
                      value={form[f.key] ?? ''}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      required={f.required}
                    />
                  )}
                  {f.type === 'password' && (
                    <Input
                      type="password"
                      value={form[f.key] ?? ''}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      required={f.required}
                    />
                  )}
                  {f.type === 'textarea' && (
                    <Textarea
                      value={form[f.key] ?? ''}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      rows={2}
                      required={f.required}
                    />
                  )}
                  {f.type === 'select' && (
                    <Select
                      value={form[f.key] ?? ''}
                      onValueChange={(v) => setField(f.key, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={f.placeholder || f.label} />
                      </SelectTrigger>
                      <SelectContent>
                        {f.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {f.type === 'checkbox' && (
                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox
                        id={f.key}
                        checked={!!form[f.key]}
                        onCheckedChange={(v) => setField(f.key, !!v)}
                      />
                      <Label htmlFor={f.key} className="text-sm text-muted-foreground cursor-pointer">
                        {f.helperText || f.label}
                      </Label>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-2" />
              {dict.common.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {loading ? dict.common.loading : (submitLabel || dict.common.save)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
