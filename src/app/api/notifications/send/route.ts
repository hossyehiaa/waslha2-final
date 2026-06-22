import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

// This endpoint handles sending notifications via Email, SMS, and WhatsApp
// In production, integrate with:
// - Email: Resend (resend.com), SendGrid, or AWS SES
// - SMS: Twilio, Vonage, or AWS SNS
// - WhatsApp: WhatsApp Business API (via Twilio or Meta)

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { channel, recipient, subject, body, shipmentId } = await req.json()

    if (!channel || !recipient || !body) {
      return NextResponse.json({ error: 'channel, recipient, and body required' }, { status: 400 })
    }

    let status = 'SENT'
    let errorMessage = null

    try {
      if (channel === 'EMAIL') {
        // TODO: Integrate with email provider (Resend/SendGrid)
        // For now, log the email
        console.log(`[EMAIL] To: ${recipient}, Subject: ${subject}, Body: ${body}`)
        // In production:
        // await sendEmail(recipient, subject, body)
      } else if (channel === 'SMS') {
        // TODO: Integrate with SMS provider (Twilio)
        console.log(`[SMS] To: ${recipient}, Body: ${body}`)
        // In production:
        // await sendSMS(recipient, body)
      } else if (channel === 'WHATSAPP') {
        // TODO: Integrate with WhatsApp Business API
        console.log(`[WHATSAPP] To: ${recipient}, Body: ${body}`)
        // In production:
        // await sendWhatsApp(recipient, body)
      }
    } catch (err: any) {
      status = 'FAILED'
      errorMessage = err.message
    }

    // Log the notification
    const log = await db.notificationLog.create({
      data: {
        userId: user.id,
        recipient,
        channel,
        subject: subject || null,
        body,
        status,
        errorMessage,
        metadata: JSON.stringify({ shipmentId }),
      },
    })

    return NextResponse.json({ success: true, log, status })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET - list notification logs
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const channel = searchParams.get('channel')
    const limit = Math.min(100, Number(searchParams.get('limit') || 50))

    const where: any = {}
    if (channel && channel !== 'all') where.channel = channel

    const logs = await db.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ logs })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
