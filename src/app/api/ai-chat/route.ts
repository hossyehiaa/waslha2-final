import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'
export const maxDuration = 30

// Gather dashboard context for the AI
async function getDashboardContext(user: any): Promise<string> {
  const context: string[] = []

  try {
    // Run all queries in parallel for speed
    const [
      totalShipments, todayShipments, pendingShipments, deliveredShipments,
      totalClients, activeDrivers, totalBranches, pendingPickups,
      pendingTransfers, payoutRequests,
      codPending, codCollected, codPaid,
      statusCounts, topClients, recentShipments, drivers, branches,
    ] = await Promise.all([
      db.shipment.count(),
      db.shipment.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      db.shipment.count({ where: { status: 'PENDING' } }),
      db.shipment.count({ where: { status: 'DELIVERED' } }),
      db.client.count(),
      db.driver.count({ where: { status: 'ACTIVE' } }),
      db.branch.count(),
      db.pickupRequest.count({ where: { status: 'PENDING' } }),
      db.branchTransfer.count({ where: { status: 'PENDING_RECEIPT' } }),
      db.payoutRequest.count({ where: { status: 'PENDING' } }),
      db.shipment.aggregate({ _sum: { codAmount: true }, where: { paymentStatus: 'PENDING' } }),
      db.shipment.aggregate({ _sum: { codAmount: true }, where: { paymentStatus: 'COLLECTED' } }),
      db.shipment.aggregate({ _sum: { codAmount: true }, where: { paymentStatus: 'SETTLED' } }),
      db.shipment.groupBy({ by: ['status'], _count: { status: true } }),
      db.client.findMany({
        take: 5,
        orderBy: { totalShipments: 'desc' },
        select: { companyName: true, totalShipments: true, codCollected: true, codPending: true, rating: true },
      }),
      db.shipment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { companyName: true } },
          senderCity: { select: { name: true } },
          recipientCity: { select: { name: true } },
        },
      }),
      db.driver.findMany({
        take: 5,
        include: { user: { select: { fullName: true } } },
        orderBy: { totalDeliveries: 'desc' },
      }),
      db.branch.findMany({
        include: {
          city: { select: { name: true } },
          _count: { select: { clients: true, employees: true, drivers: true } },
        },
      }),
    ])

    context.push(`=== DASHBOARD OVERVIEW ===`)
    context.push(`Total Shipments: ${totalShipments}, Today: ${todayShipments}, Pending: ${pendingShipments}, Delivered: ${deliveredShipments}`)
    context.push(`Total Clients: ${totalClients}, Active Drivers: ${activeDrivers}, Branches: ${totalBranches}`)
    context.push(`Pending Pickups: ${pendingPickups}, Pending Transfers: ${pendingTransfers}, Payout Requests: ${payoutRequests}`)
    context.push(`\n=== FINANCIAL ===`)
    context.push(`COD Pending: ${codPending._sum.codAmount || 0} EGP, Collected: ${codCollected._sum.codAmount || 0} EGP, Settled: ${codPaid._sum.codAmount || 0} EGP`)
    context.push(`\n=== STATUS DISTRIBUTION ===`)
    for (const s of statusCounts) context.push(`${s.status.replace(/_/g, ' ')}: ${s._count.status}`)
    context.push(`\n=== TOP 5 CLIENTS ===`)
    topClients.forEach((c, i) => context.push(`${i + 1}. ${c.companyName} - ${c.totalShipments} shipments, ${c.codCollected} EGP collected, ${c.codPending} EGP pending, rating ${c.rating.toFixed(1)}`))
    context.push(`\n=== RECENT 5 SHIPMENTS ===`)
    recentShipments.forEach((s, i) => context.push(`${i + 1}. ${s.trackingNumber} - ${s.client.companyName} | ${s.senderCity.name}→${s.recipientCity.name} | ${s.status} | COD: ${s.codAmount} EGP`))
    context.push(`\n=== TOP 5 DRIVERS ===`)
    drivers.forEach((d, i) => context.push(`${i + 1}. ${d.user.fullName} (${d.driverCode}) - ${d.totalDeliveries} deliveries, ${d.pendingEarnings} EGP pending, rating ${d.rating.toFixed(1)}`))
    context.push(`\n=== BRANCHES ===`)
    branches.forEach((b, i) => context.push(`${i + 1}. ${b.name} (${b.code}) - ${b.city?.name || 'N/A'} | Clients: ${b._count.clients}, Staff: ${b._count.employees}, Drivers: ${b._count.drivers}`))
    context.push(`\n=== USER ===`)
    context.push(`Name: ${user.fullName}, Role: ${user.role}, Time: ${new Date().toISOString()}`)
  } catch (e: any) {
    context.push(`Error gathering context: ${e.message}`)
  }

  return context.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages } = await req.json()
    const lastMessages = messages.slice(-10)

    const dashboardContext = await getDashboardContext(user)

    const systemPrompt = `You are Wslahali AI Assistant, an intelligent helper integrated into the Wslahali shipping & logistics platform dashboard.

You have access to real-time dashboard data. Use this data to answer questions accurately:

${dashboardContext}

Your capabilities:
- Answer questions about shipments, clients, drivers, branches, COD, finances, expenses, settlements
- Provide insights and analytics based on the data
- Suggest actions (e.g., "approve pending settlements", "assign drivers to pending pickups")
- Summarize dashboard metrics
- Help with operational decisions

Rules:
- Always respond in the same language the user is asking in (English or Arabic)
- Be concise but informative
- Use numbers and data from the context when answering
- If you don't have the specific data, say so honestly
- Format numbers nicely (e.g., 1,234 EGP)
- You can use markdown formatting for readability`

    // Call Pollinations AI (free, OpenAI-compatible, no API key needed)
    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: systemPrompt },
          ...lastMessages.map((m: any) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Z.AI API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'AI service error', details: errorText.substring(0, 200) },
        { status: 500 }
      )
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'

    return NextResponse.json({ reply })
  } catch (e: any) {
    console.error('AI chat error:', e)
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
