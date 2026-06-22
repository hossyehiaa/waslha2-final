import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'
export const maxDuration = 60

// Check if the question is a data query we can answer instantly
function tryInstantAnswer(question: string, data: any): string | null {
  const q = question.toLowerCase().trim()

  // How many shipments
  if ((q.includes('كم') || q.includes('how many') || q.includes('عدد')) && q.includes('شحن')) {
    return `📦 إجمالي الشحنات: ${data.total}\nالنهارده: ${data.today}\nمعلقة: ${data.pending}\nتم توصيلها: ${data.delivered}`
  }

  // How many clients
  if ((q.includes('كم') || q.includes('how many') || q.includes('عدد')) && (q.includes('عميل') || q.includes('client'))) {
    return `👥 عدد العملاء: ${data.clients}`
  }

  // How many drivers
  if ((q.includes('كم') || q.includes('how many') || q.includes('عدد')) && (q.includes('مندوب') || q.includes('driver'))) {
    return `🚚 المناديب النشطون: ${data.drivers}`
  }

  // COD questions
  if (q.includes('cod') || q.includes('تحصيل') || q.includes('مبلغ') || q.includes('فلوس') || q.includes('money')) {
    return `💰 بيانات الـ COD:\nإجمالي المحصّل: ${data.codTotal.toLocaleString()} ج.م\nالشحنات المسدّدة: ${data.delivered}`
  }

  // Dashboard summary / overview
  if (q.includes('summary') || q.includes('ملخص') || q.includes('overview') || q.includes('لوحة') || q.includes('dashboard') || q.includes('حالة')) {
    return `📊 ملخص لوحة التحكم:\n\n📦 الشحنات: ${data.total} (النهارده: ${data.today})\n⏳ معلقة: ${data.pending}\n✅ تم توصيلها: ${data.delivered}\n👥 العملاء: ${data.clients}\n🚚 المناديب: ${data.drivers}\n💰 COD: ${data.codTotal.toLocaleString()} ج.م`
  }

  // Branches
  if (q.includes('فرع') || q.includes('branch')) {
    return `🏢 عدد الفروع: ${data.branches}`
  }

  return null
}

// Gather dashboard stats (fast, 1 batch)
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
    const lastMessages = messages.slice(-6)
    const lastUserMsg = [...lastMessages].reverse().find(m => m.role === 'user')
    const question = lastUserMsg?.content || ''

    // Step 1: Gather dashboard data (fast)
    const stats = await getDashboardStats()

    // Step 2: Try instant answer for data questions (no AI call needed!)
    const instant = tryInstantAnswer(question, stats)
    if (instant) {
      return NextResponse.json({ reply: instant })
    }

    // Step 3: For conversational questions, call AI with 12s timeout
    const context = `Stats: Total=${stats.total}, Today=${stats.today}, Pending=${stats.pending}, Delivered=${stats.delivered}, Clients=${stats.clients}, Drivers=${stats.drivers}, COD=${stats.codTotal}`
    const systemPrompt = `You are Wslahali AI Assistant for a shipping platform. Respond in the user's language. Be concise. ${context}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    let reply = ''
    try {
      const response = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: [
            { role: 'system', content: systemPrompt },
            ...lastMessages.map((m: any) => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (response.ok) {
        const data = await response.json()
        reply = data.choices?.[0]?.message?.content || ''
      }
    } catch {
      clearTimeout(timeout)
    }

    // Fallback
    if (!reply) {
      reply = `📊 بياناتك:\n📦 شحنات: ${stats.total} (اليوم: ${stats.today})\n✅ تم توصيل: ${stats.delivered}\n👥 عملاء: ${stats.clients}\n🚚 مناديب: ${stats.drivers}\n💰 COD: ${stats.codTotal.toLocaleString()} ج.م\n\nاسألني بشكل مباشر زي: "كم شحنة؟" أو "كم عميل؟"`
    }

    return NextResponse.json({ reply })
  } catch (e: any) {
    return NextResponse.json({
      reply: 'اسألني عن الشحنات، العملاء، المناديب، أو الفلوس! 💬',
    })
  }
}
