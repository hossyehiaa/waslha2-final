'use client'

import { useEffect, useState } from 'react'
import { ListChecks, Plus, Edit, Trash2, MoreVertical, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog'
import { toast } from 'sonner'

type Entity = Record<string, any>

export default function Page() {
  const [data, setData] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Entity | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [extraData, setExtraData] = useState<Record<string, any[]>>({})

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/expense-types')
      const d = await res.json()
      setData(d['types'] || d['types'] || [])
      
    } catch { toast.error('فشل تحميل البيانات') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    const initial: Record<string, any> = {}
    initial['name'] = ''
    initial['description'] = ''
    setForm(initial)
    setModalOpen(true)
  }

  function openEdit(item: Entity) {
    setEditing(item)
    const initial: Record<string, any> = {}
    initial['name'] = item['name'] || ''
    initial['description'] = item['description'] || ''
    setForm(initial)
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const isEdit = !!editing
      const url = isEdit ? '/api/admin/expense-types' : '/api/admin/expense-types'
      const method = isEdit ? 'PATCH' : 'POST'
      const body = isEdit ? { id: editing.id, ...form } : form
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || 'فشل الحفظ'); return }
      toast.success(isEdit ? 'تم التعديل بنجاح' : 'تم الإضافة بنجاح')
      setModalOpen(false)
      load()
    } catch { toast.error('خطأ في الشبكة') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch('/api/admin/expense-types?id=' + deleteTarget.id, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'فشل الحذف'); return }
      toast.success('تم الحذف بنجاح')
      setDeleteTarget(null)
      load()
    } catch { toast.error('خطأ في الشبكة') }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="أنواع المصروفات"
        subtitle="إدارة أنواع وفئات المصروفات"
        icon={ListChecks}
        actions={
          <Button className="shadow-premium" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> إضافة جديد
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد بيانات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right py-3 px-4 font-medium">النوع</th>
                  <th className="text-right py-3 px-4 font-medium">الوصف</th>
                  <th className="text-right py-3 px-4 font-medium">الحالة</th>
                  <th className="text-right py-3 px-4 font-medium">خيارات</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={item.id || i} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="py-3 px-4">{item.name || '-'}</td>
                    <td className="py-3 px-4">{item.description || '-'}</td>
                    <td className="py-3 px-4"><span className={'text-xs px-2 py-1 rounded ' + (item.isActive === true || item.isActive === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>{item.isActive === true || item.isActive === 'ACTIVE' ? 'نشط' : 'موقوف'}</span></td>
                    <td className="py-3 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(item)}><Edit className="w-4 h-4 mr-2" /> تعديل</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(item)}><Trash2 className="w-4 h-4 mr-2" /> حذف</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-card rounded-2xl max-w-lg w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{editing ? 'تعديل' : 'إضافة جديد'}</h2>
                <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)}><X className="w-5 h-5" /></Button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم النوع</Label>
                  <Input value={form['name'] || ''} onChange={(e) => setForm({ ...form, 'name': e.target.value })} placeholder="رواتب" />
                </div>
                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Textarea value={form['description'] || ''} onChange={(e) => setForm({ ...form, 'description': e.target.value })} placeholder="وصف النوع" rows={2} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setModalOpen(false)}>إلغاء</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="تأكيد الحذف"
        description={'هل أنت متأكد من حذف ' + (deleteTarget?.name || '') + '؟'}
        onConfirm={handleDelete}
        destructive
        confirmLabel="حذف"
      />
    </div>
  )
}
