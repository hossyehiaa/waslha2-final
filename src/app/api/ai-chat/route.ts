import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'
export const maxDuration = 30

const GROQ_KEY = process.env.GROQ_API_KEY || ''
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.1-8b-instant'

// Instant answers for data questions (no AI needed)
function tryInstantAnswer(question: string, data: any): string | null {
  const q = question.toLowerCase().trim()
  if ((q.includes('كم') || q.includes('how many') || q.includes('عدد')) && q.includes('شحن')) {
    return `📦 إجمالي الشحنات: ${data.total}\nالنهارده: ${data.today}\nمعلقة: ${data.pending}\nتم توصيلها: ${data.delivered}`
  }
  if ((q.includes('كم') || q.includes('how many') || q.includes('عدد')) && (q.includes('عميل') || q.includes('client'))) {
    return `👥 عدد العملاء: ${data.clients}`
  }
  if ((q.includes('كم') || q.includes('how many') || q.includes('عدد')) && (q.includes('مندوب') || q.includes('driver'))) {
    return `🚚 المناديب النشطون: ${data.drivers}`
  }
  if (q.includes('cod') || q.includes('تحصيل') || q.includes('مبلغ') || q.includes('فلوس') || q.includes('money')) {
    return `💰 بيانات الـ COD:\nإجمالي المحصّل: ${data.codTotal.toLocaleString()} ج.م\nالشحنات المسدّدة: ${data.delivered}`
  }
  if (q.includes('summary') || q.includes('ملخص') || q.includes('overview') || q.includes('dashboard') || q.includes('حالة')) {
    return `📊 ملخص لوحة التحكم:\n\n📦 الشحنات: ${data.total} (النهارده: ${data.today})\n⏳ معلقة: ${data.pending}\n✅ تم توصيلها: ${data.delivered}\n👥 العملاء: ${data.clients}\n🚚 المناديب: ${data.drivers}\n💰 COD: ${data.codTotal.toLocaleString()} ج.م`
  }
  if (q.includes('فرع') || q.includes('branch')) {
    return `🏢 عدد الفروع: ${data.branches}`
  }
  return null
}

async function getDashboardStats() {
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

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages } = await req.json()
    const lastMessages = messages.slice(-8)
    const lastUserMsg = [...lastMessages].reverse().find(m => m.role === 'user')
    const question = lastUserMsg?.content || ''

    // Get dashboard data
    const stats = await getDashboardStats()

    // Try instant answer first
    const instant = tryInstantAnswer(question, stats)
    if (instant) {
      return NextResponse.json({ reply: instant })
    }

    // Use Groq AI for conversational questions
    const context = `Stats: Shipments=${stats.total} (today=${stats.today}), Pending=${stats.pending}, Delivered=${stats.delivered}, Clients=${stats.clients}, Drivers=${stats.drivers}, Branches=${stats.branches}, COD=${stats.codTotal} EGP`
    const systemPrompt = `You are Wslahali AI Assistant for a shipping & logistics platform. Respond in the user's language (Arabic or English). Be concise and helpful. Dashboard data: ${context}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    let reply = ''
    try {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            ...lastMessages.map((m: any) => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (response.ok) {
        const data = await response.json()
        reply = data.choices?.[0]?.message?.content || ''
      } else {
        // If Groq fails, try Pollinations as fallback
        clearTimeout(timeout)
        const pollResponse = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai',
            messages: [
              { role: 'system', content: systemPrompt },
              ...lastMessages.map((m: any) => ({ role: m.role, content: m.content })),
            ],
            temperature: 0.7,
            max_tokens: 400,
          }),
        })
        if (pollResponse.ok) {
          const pollData = await pollResponse.json()
          reply = pollData.choices?.[0]?.message?.content || ''
        }
      }
    } catch {
      clearTimeout(timeout)
    }

    // Fallback
    if (!reply) {
      reply = `📊 بياناتك:\n📦 شحنات: ${stats.total} (اليوم: ${stats.today})\n✅ تم توصيل: ${stats.delivered}\n👥 عملاء: ${stats.clients}\n🚚 مناديب: ${stats.drivers}\n💰 COD: ${stats.codTotal.toLocaleString()} ج.م\n\nاسألني: "كم شحنة؟" أو "كم عميل؟" أو "ملخص"`
    }

    return NextResponse.json({ reply })
  } catch (e: any) {
    return NextResponse.json({
      reply: 'اسألني عن الشحنات، العملاء، المناديب، أو الفلوس! 💬',
    })
  }
}
