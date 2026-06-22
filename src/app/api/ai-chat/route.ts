import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'
export const maxDuration = 60

// Check if the question needs dashboard data
function needsDashboardData(question: string): boolean {
  const keywords = ['shipments', 'client', 'driver', 'cod', 'finance', 'deliver',
    'شحن', 'عميل', 'مندوب', 'تحصيل', 'مال', 'توصيل', 'كم', 'عدد', 'اجمالي',
    'today', 'النهارده', 'اليوم', 'status', 'حالة', 'report', 'تقرير',
    'balance', 'رصيد', 'pending', 'معلق', 'how many']
  const lower = question.toLowerCase()
  return keywords.some(k => lower.includes(k))
}

// Ultra-fast context: only 2 queries
async function getFastContext(): Promise<string> {
  try {
    const [totalShipments, totalClients] = await Promise.all([
      db.shipment.count(),
      db.client.count(),
    ])
    return `Stats: Shipments=${totalShipments}, Clients=${totalClients}`
  } catch {
    return ''
  }
}

// Full context: more queries but only when needed
async function getFullContext(): Promise<string> {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [total, today, pending, delivered, clients, drivers, codAgg] = await Promise.all([
      db.shipment.count(),
      db.shipment.count({ where: { createdAt: { gte: todayStart } } }),
      db.shipment.count({ where: { status: 'PENDING' } }),
      db.shipment.count({ where: { status: 'DELIVERED' } }),
      db.client.count(),
      db.driver.count({ where: { status: 'ACTIVE' } }),
      db.shipment.aggregate({ _sum: { codAmount: true }, where: { status: 'DELIVERED' } }),
    ])

    return `Stats: Total=${total}, Today=${today}, Pending=${pending}, Delivered=${delivered}, Clients=${clients}, Drivers=${drivers}, COD=${codAgg._sum.codAmount || 0}`
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages } = await req.json()
    const lastMessages = messages.slice(-6)
    const lastQuestion = lastMessages.findLast?.(m => m.role === 'user')?.content || ''
    const lastUserMsg = [...lastMessages].reverse().find(m => m.role === 'user')
    const questionText = lastUserMsg?.content || ''

    // Only gather context if the question needs it
    const needData = needsDashboardData(questionText)
    const context = needData ? await getFullContext() : await getFastContext()

    const systemPrompt = `You are Wslahali AI Assistant for a shipping platform. Respond in the user's language (Arabic or English). Be concise and helpful.${context ? ' Dashboard: ' + context : ''}`

    // Call Pollinations AI with 15s timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

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
          max_tokens: 400,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (response.ok) {
        const data = await response.json()
        reply = data.choices?.[0]?.message?.content || ''
      }
    } catch (e: any) {
      clearTimeout(timeout)
    }

    // Fallback if AI failed
    if (!reply) {
      if (needData && context) {
        reply = `📊 بيانات لوحة التحكم:\n${context}\n\n(الخدمة الذكية مشغولة حالياً، حاول مرة أخرى)`
      } else {
        reply = 'مرحباً! أنا المساعد الذكي لوصلهالي. اسألني عن الشحنات، العملاء، المناديب، أو أي حاجة عن لوحة التحكم.'
      }
    }

    return NextResponse.json({ reply })
  } catch (e: any) {
    console.error('AI chat error:', e)
    return NextResponse.json({
      reply: 'حدث خطأ بسيط. حاول مرة أخرى من فضلك. 🔄',
    })
  }
}
