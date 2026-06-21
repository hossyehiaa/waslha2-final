import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'
export const maxDuration = 30

// Gather dashboard context for the AI
async function getDashboardContext(user: any): Promise<string> {
  const context: string[] = []

  try {
    const [
      totalShipments, todayShipments, pendingShipments, deliveredShipments,
      totalClients, activeDrivers, totalBranches, pendingPickups,
      pendingTransfers, payoutRequests,
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
    ])

    context.push(`=== DASHBOARD OVERVIEW ===`)
    context.push(`Total Shipments: ${totalShipments}`)
    context.push(`Today's Shipments: ${todayShipments}`)
    context.push(`Pending Shipments: ${pendingShipments}`)
    context.push(`Delivered Shipments: ${deliveredShipments}`)
    context.push(`Total Clients: ${totalClients}`)
    context.push(`Active Drivers: ${activeDrivers}`)
    context.push(`Total Branches: ${totalBranches}`)
    context.push(`Pending Pickups: ${pendingPickups}`)
    context.push(`Pending Transfers: ${pendingTransfers}`)
    context.push(`Pending Payout Requests: ${payoutRequests}`)

    const [codPending, codCollected, codPaid] = await Promise.all([
      db.shipment.aggregate({ _sum: { codAmount: true }, where: { paymentStatus: 'PENDING' } }),
      db.shipment.aggregate({ _sum: { codAmount: true }, where: { paymentStatus: 'COLLECTED' } }),
      db.shipment.aggregate({ _sum: { codAmount: true }, where: { paymentStatus: 'SETTLED' } }),
    ])
    context.push(`\n=== FINANCIAL SUMMARY ===`)
    context.push(`COD Pending Collection: ${codPending._sum.codAmount || 0} EGP`)
    context.push(`COD Collected (Ready to Pay): ${codCollected._sum.codAmount || 0} EGP`)
    context.push(`COD Settled (Paid to Clients): ${codPaid._sum.codAmount || 0} EGP`)

    const statusCounts = await db.shipment.groupBy({
      by: ['status'],
      _count: { status: true },
    })
    context.push(`\n=== SHIPMENT STATUS DISTRIBUTION ===`)
    for (const s of statusCounts) {
      context.push(`${s.status.replace(/_/g, ' ')}: ${s._count.status}`)
    }

    const topClients = await db.client.findMany({
      take: 5,
      orderBy: { totalShipments: 'desc' },
      select: { companyName: true, totalShipments: true, codCollected: true, codPending: true, rating: true },
    })
    context.push(`\n=== TOP 5 CLIENTS ===`)
    topClients.forEach((c, i) => {
      context.push(`${i + 1}. ${c.companyName} - ${c.totalShipments} shipments, ${c.codCollected} EGP collected, ${c.codPending} EGP pending, rating ${c.rating.toFixed(1)}`)
    })

    const recentShipments = await db.shipment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { companyName: true } },
        senderCity: { select: { name: true } },
        recipientCity: { select: { name: true } },
      },
    })
    context.push(`\n=== RECENT 10 SHIPMENTS ===`)
    recentShipments.forEach((s, i) => {
      context.push(`${i + 1}. ${s.trackingNumber} - ${s.client.companyName} | ${s.senderCity.name} → ${s.recipientCity.name} | Status: ${s.status} | COD: ${s.codAmount} EGP | ${s.createdAt.toISOString().split('T')[0]}`)
    })

    const drivers = await db.driver.findMany({
      take: 10,
      include: { user: { select: { fullName: true } } },
      orderBy: { totalDeliveries: 'desc' },
    })
    context.push(`\n=== TOP DRIVERS ===`)
    drivers.forEach((d, i) => {
      context.push(`${i + 1}. ${d.user.fullName} (${d.driverCode}) - ${d.totalDeliveries} deliveries, ${d.pendingEarnings} EGP pending, rating ${d.rating.toFixed(1)}, status: ${d.status}`)
    })

    const branches = await db.branch.findMany({
      include: {
        city: { select: { name: true } },
        _count: { select: { clients: true, employees: true, drivers: true } },
      },
    })
    context.push(`\n=== BRANCHES ===`)
    branches.forEach((b, i) => {
      context.push(`${i + 1}. ${b.name} (${b.code}) - ${b.city?.name || 'N/A'} | Clients: ${b._count.clients}, Staff: ${b._count.employees}, Drivers: ${b._count.drivers}`)
    })

    const expenses = await db.expense.findMany({
      take: 10,
      orderBy: { date: 'desc' },
      include: { branch: { select: { name: true } } },
    })
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    context.push(`\n=== RECENT EXPENSES (last 10) ===`)
    context.push(`Total recent expenses: ${totalExpenses} EGP`)
    expenses.forEach((e, i) => {
      context.push(`${i + 1}. ${e.category} - ${e.description} - ${e.amount} EGP - ${e.branch?.name || 'N/A'} - ${e.date.toISOString().split('T')[0]}`)
    })

    const settlements = await db.codSettlement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { companyName: true } } },
    })
    context.push(`\n=== RECENT COD SETTLEMENTS ===`)
    if (settlements.length === 0) {
      context.push('No settlements yet')
    } else {
      settlements.forEach((s, i) => {
        context.push(`${i + 1}. ${s.reference} - ${s.client.companyName} | Period: ${s.period} | Total: ${s.totalAmount} EGP | Net: ${s.netAmount} EGP | Status: ${s.status}`)
      })
    }

    context.push(`\n=== CURRENT USER ===`)
    context.push(`Name: ${user.fullName}`)
    context.push(`Role: ${user.role}`)
    context.push(`Time: ${new Date().toISOString()}`)
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

    const systemPrompt = `You are Wsalhali AI Assistant, an intelligent helper integrated into the Wsalhali shipping & logistics platform dashboard.

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

    // Use z-ai-web-dev-sdk
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...lastMessages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      thinking: { type: 'disabled' },
      temperature: 0.7,
      max_tokens: 1024,
    })

    const reply = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'

    return NextResponse.json({ reply })
  } catch (e: any) {
    console.error('AI chat error:', e)
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
