import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'
export const maxDuration = 30

const GROQ_KEY = process.env.GROQ_API_KEY || ''
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.1-8b-instant'

function text(value: unknown) {
  return typeof value === 'string' ? value.slice(0, 2000) : ''
}

function adminInstantAnswer(question: string, data: AdminStats): string | null {
  const q = question.toLowerCase().trim()
  if ((q.includes('كم') || q.includes('how many') || q.includes('عدد')) && q.includes('شحن')) {
    return `إجمالي الشحنات: ${data.total}\nالنهارده: ${data.today}\nمعلقة: ${data.pending}\nتم توصيلها: ${data.delivered}`
  }
  if ((q.includes('كم') || q.includes('how many') || q.includes('عدد')) && (q.includes('عميل') || q.includes('client'))) return `عدد العملاء: ${data.clients}`
  if ((q.includes('كم') || q.includes('how many') || q.includes('عدد')) && (q.includes('مندوب') || q.includes('driver'))) return `المناديب النشطون: ${data.drivers}`
  if (q.includes('cod') || q.includes('تحصيل') || q.includes('مبلغ') || q.includes('فلوس') || q.includes('money')) return `بيانات الـ COD:\nإجمالي المحصّل: ${data.codTotal.toLocaleString()} ج.م\nالشحنات المسلّمة: ${data.delivered}`
  if (q.includes('summary') || q.includes('ملخص') || q.includes('overview') || q.includes('dashboard') || q.includes('حالة')) return `ملخص لوحة الإدارة:\n\nالشحنات: ${data.total} (اليوم: ${data.today})\nمعلقة: ${data.pending}\nتم توصيلها: ${data.delivered}\nالعملاء: ${data.clients}\nالمناديب: ${data.drivers}\nCOD: ${data.codTotal.toLocaleString()} ج.م`
  if (q.includes('فرع') || q.includes('branch')) return `عدد الفروع: ${data.branches}`
  return null
}

function clientInstantAnswer(question: string, data: ClientStats): string | null {
  const q = question.toLowerCase().trim()
  if ((q.includes('شحن') || q.includes('shipment')) && (q.includes('كم') || q.includes('how many') || q.includes('عدد') || q.includes('status') || q.includes('حالة'))) {
    return `بيانات شحناتك:\nإجمالي الشحنات: ${data.total}\nالنشطة: ${data.active}\nمعلقة: ${data.pending}\nتم توصيلها: ${data.delivered}\nاليوم: ${data.today}`
  }
  if (q.includes('cod') || q.includes('تحصيل') || q.includes('مبلغ') || q.includes('فلوس') || q.includes('balance') || q.includes('رصيد')) {
    return `بيانات حسابك:\nالرصيد المستحق COD: ${data.codPending.toLocaleString()} ج.م\nرصيد COD الكلي: ${data.codBalance.toLocaleString()} ج.م`
  }
  if (q.includes('summary') || q.includes('ملخص') || q.includes('overview') || q.includes('dashboard')) {
    return `ملخص حسابك:\n\nإجمالي الشحنات: ${data.total}\nالشحنات النشطة: ${data.active}\nمعلقة: ${data.pending}\nتم توصيلها: ${data.delivered}\nرصيد COD المستحق: ${data.codPending.toLocaleString()} ج.م`
  }
  if (q.includes('عميل') || q.includes('client') || q.includes('مندوب') || q.includes('driver') || q.includes('فرع') || q.includes('branch') || q.includes('financial') || q.includes('finance') || q.includes('مالية')) {
    return 'أستطيع مساعدتك فقط في بيانات حسابك وشحناتك. لا يمكنني عرض بيانات العملاء أو المناديب أو الإدارة.'
  }
  return null
}

type AdminStats = { total: number; today: number; pending: number; delivered: number; clients: number; drivers: number; branches: number; codTotal: number }
type ClientStats = { total: number; today: number; pending: number; active: number; delivered: number; codPending: number; codBalance: number }

async function getAdminDashboardStats(): Promise<AdminStats> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const [total, today, pending, delivered, clients, drivers, branches, codAgg] = await Promise.all([
    db.shipment.count(),
    db.shipment.count({ where: { createdAt: { gte: todayStart } } }),
    db.shipment.count({ where: { status: 'PENDING' } }),
    db.shipment.count({ where: { status: 'DELIVERED' } }),
    db.client.count(),
    db.driver.count({ where: { status: 'ACTIVE' } }),
    db.branch.count(),
    db.shipment.aggregate({ _sum: { codAmount: true }, where: { status: 'DELIVERED' } }),
  ])
  return { total, today, pending, delivered, clients, drivers, branches, codTotal: codAgg._sum.codAmount || 0 }
}

async function getClientDashboardStats(clientId: string): Promise<ClientStats> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const where = { clientId }
  const [client, total, today, pending, active, delivered] = await Promise.all([
    db.client.findUnique({ where: { id: clientId }, select: { codPending: true, codBalance: true } }),
    db.shipment.count({ where }),
    db.shipment.count({ where: { ...where, createdAt: { gte: todayStart } } }),
    db.shipment.count({ where: { ...where, status: 'PENDING' } }),
    db.shipment.count({ where: { ...where, status: { in: ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } } }),
    db.shipment.count({ where: { ...where, status: 'DELIVERED' } }),
  ])
  if (!client) throw new Error('Client account not found')
  return { total, today, pending, active, delivered, codPending: client.codPending, codBalance: client.codBalance }
}

function safeClientFallback(data: ClientStats) {
  return `بيانات حسابك:\nالشحنات: ${data.total}\nالنشطة: ${data.active}\nمعلقة: ${data.pending}\nتم توصيلها: ${data.delivered}\nرصيد COD المستحق: ${data.codPending.toLocaleString()} ج.م`
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json().catch(() => null) as { messages?: unknown }
    if (!Array.isArray(body?.messages)) return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    const messages = body.messages
      .filter((message): message is { role: 'user' | 'assistant'; content: string } => Boolean(message && typeof message === 'object' && ((message as any).role === 'user' || (message as any).role === 'assistant')))
      .map((message) => ({ role: message.role, content: text(message.content) }))
      .filter((message) => message.content.length > 0)
      .slice(-8)
    const question = [...messages].reverse().find((message) => message.role === 'user')?.content || ''

    if (user.role === 'CLIENT') {
      if (!user.clientId) return NextResponse.json({ error: 'Client account is required' }, { status: 403 })
      const stats = await getClientDashboardStats(user.clientId)
      const instant = clientInstantAnswer(question, stats)
      return NextResponse.json({ reply: instant || safeClientFallback(stats) })
    }

    if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const stats = await getAdminDashboardStats()
    const instant = adminInstantAnswer(question, stats)
    if (instant) return NextResponse.json({ reply: instant })

    const context = `Admin stats: Shipments=${stats.total} (today=${stats.today}), Pending=${stats.pending}, Delivered=${stats.delivered}, Clients=${stats.clients}, Drivers=${stats.drivers}, Branches=${stats.branches}, COD=${stats.codTotal} EGP`
    const systemPrompt = `You are Wslahali AI Assistant for authorized administration staff. Respond in the user's language. Be concise and helpful. You may discuss only the following current administration statistics: ${context}. Never invent data or reveal secrets.`
    let reply = ''
    if (GROQ_KEY) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      try {
        const response = await fetch(GROQ_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'system', content: systemPrompt }, ...messages], temperature: 0.2, max_tokens: 500 }),
          signal: controller.signal,
        })
        if (response.ok) {
          const data = await response.json()
          reply = data.choices?.[0]?.message?.content || ''
        }
      } catch {
        reply = ''
      } finally {
        clearTimeout(timeout)
      }
    }
    return NextResponse.json({ reply: reply || `ملخص لوحة الإدارة:\nالشحنات: ${stats.total}\nاليوم: ${stats.today}\nمعلقة: ${stats.pending}\nتم توصيلها: ${stats.delivered}\nالعملاء: ${stats.clients}\nالمناديب: ${stats.drivers}\nCOD: ${stats.codTotal.toLocaleString()} ج.م` })
  } catch {
    return NextResponse.json({ error: 'Unable to answer this request' }, { status: 500 })
  }
}
