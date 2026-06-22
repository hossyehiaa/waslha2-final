import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'
export const maxDuration = 60

// Optimized: minimal DB queries for fast response
async function getDashboardContext(user: any): Promise<string> {
  try {
    // Single batch of parallel queries - keep it minimal
    const [shipments, clients, drivers, codAgg] = await Promise.all([
      db.shipment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { companyName: true } },
          senderCity: { select: { name: true } },
          recipientCity: { select: { name: true } },
        },
      }),
      db.client.count(),
      db.driver.count({ where: { status: 'ACTIVE' } }),
      db.shipment.aggregate({
        _sum: { codAmount: true },
        where: { status: 'DELIVERED' },
      }),
    ])

    const totalShipments = await db.shipment.count()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayShipments = await db.shipment.count({
      where: { createdAt: { gte: todayStart } },
    })
    const pendingCount = await db.shipment.count({ where: { status: 'PENDING' } })
    const deliveredCount = await db.shipment.count({ where: { status: 'DELIVERED' } })

    const lines = [
      `Dashboard: Total=${totalShipments}, Today=${todayShipments}, Pending=${pendingCount}, Delivered=${deliveredCount}`,
      `Clients=${clients}, ActiveDrivers=${drivers}, TotalCOD=${codAgg._sum.codAmount || 0} EGP`,
      `Recent: ${shipments.map(s => `${s.trackingNumber}(${s.status},${s.codAmount}EGP,${s.client.companyName})`).join('; ')}`,
    ]
    return lines.join('\n')
  } catch (e: any) {
    return 'Dashboard data unavailable'
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages } = await req.json()
    const lastMessages = messages.slice(-6)

    // Gather minimal context
    const dashboardContext = await getDashboardContext(user)

    const systemPrompt = `You are Wslahali AI Assistant for a shipping platform. Respond in the user's language (Arabic or English). Be concise. Dashboard data: ${dashboardContext}`

    // Call Pollinations AI with a short timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000) // 20s timeout

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
        max_tokens: 500,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      // Fallback: provide a basic response with dashboard data
      return NextResponse.json({
        reply: `عذراً، حدث خطأ في الاتصال بالخدمة. لكن يمكنني مساعدتك:\n\n📊 بيانات لوحة التحكم:\n${dashboardContext}\n\nجرّب إعادة السؤال مرة أخرى.`,
      })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || 'عذراً، لم أتمكن من توليد رد. حاول مرة أخرى.'

    return NextResponse.json({ reply })
  } catch (e: any) {
    // If timeout or any error, return a helpful fallback
    if (e.name === 'AbortError') {
      return NextResponse.json({
        reply: '⏳ استغرق الرد وقتاً أطول من المتوقع. حاول مرة أخرى - السؤال البسيط هيرد أسرع.',
      })
    }

    console.error('AI chat error:', e)
    return NextResponse.json({
      reply: 'حدث خطأ. حاول مرة أخرى من فضلك.',
    })
  }
}
