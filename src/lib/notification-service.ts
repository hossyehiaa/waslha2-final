// Notification service - handles Email, SMS, and WhatsApp notifications
// In production, integrate with:
// - Email: Resend (https://resend.com) - free tier: 100 emails/day
// - SMS: Twilio (https://twilio.com) - pay per message
// - WhatsApp: WhatsApp Business API via Twilio or Meta

import { db } from '@/lib/db'

// ============ EMAIL TEMPLATES ============

export function getEmailTemplate(type: string, data: Record<string, any>): { subject: string; body: string } {
  const templates: Record<string, { subject: string; body: string }> = {
    SHIPMENT_PICKED_UP: {
      subject: `Shipment ${data.trackingNumber} has been picked up`,
      body: `Dear ${data.clientName},

Your shipment ${data.trackingNumber} has been picked up and is now in transit.

From: ${data.fromCity}
To: ${data.toCity}
COD Amount: ${data.codAmount} EGP

You can track your shipment anytime at: https://wsalhali.vercel.app/track?q=${data.trackingNumber}

Best regards,
Wsalhali Team`,
    },
    SHIPMENT_OUT_FOR_DELIVERY: {
      subject: `Shipment ${data.trackingNumber} is out for delivery`,
      body: `Dear ${data.clientName},

Your shipment ${data.trackingNumber} is now out for delivery and will arrive today.

Recipient: ${data.recipientName}
Address: ${data.recipientAddress}
COD Amount: ${data.codAmount} EGP

Please ensure someone is available to receive the package.

Best regards,
Wsalhali Team`,
    },
    SHIPMENT_DELIVERED: {
      subject: `Shipment ${data.trackingNumber} has been delivered`,
      body: `Dear ${data.clientName},

Your shipment ${data.trackingNumber} has been successfully delivered.

Delivered to: ${data.recipientName}
COD Collected: ${data.codAmount} EGP

Thank you for using Wsalhali!

Best regards,
Wsalhali Team`,
    },
    COD_SETTLEMENT_PAID: {
      subject: `COD Settlement ${data.reference} has been paid`,
      body: `Dear ${data.clientName},

Your COD settlement ${data.reference} has been paid to your account.

Settlement Amount: ${data.netAmount} EGP
Period: ${data.period}
Shipments Included: ${data.shipmentCount}

The funds have been transferred to your registered account.

Best regards,
Wsalhali Team`,
    },
    PAYOUT_APPROVED: {
      subject: `Your payout request has been approved`,
      body: `Dear ${data.clientName},

Your payout request of ${data.amount} EGP has been approved and is being processed.

Method: ${data.method}

You will receive the funds shortly.

Best regards,
Wsalhali Team`,
    },
    PAYOUT_PAID: {
      subject: `Your payout of ${data.amount} EGP has been sent`,
      body: `Dear ${data.clientName},

Your payout of ${data.amount} EGP has been transferred to your account.

Thank you for using Wsalhali!

Best regards,
Wsalhali Team`,
    },
  }

  return templates[type] || { subject: 'Wsalhali Notification', body: 'You have a new notification from Wsalhali.' }
}

// ============ SMS TEMPLATES ============

export function getSMSTemplate(type: string, data: Record<string, any>): string {
  const templates: Record<string, string> = {
    SHIPMENT_OUT_FOR_DELIVERY: `Wsalhali: Your shipment ${data.trackingNumber} is out for delivery today. Recipient: ${data.recipientName}. COD: ${data.codAmount} EGP. Track: wsalhali.vercel.app/track?q=${data.trackingNumber}`,
    SHIPMENT_DELIVERED: `Wsalhali: Shipment ${data.trackingNumber} delivered successfully to ${data.recipientName}. COD ${data.codAmount} EGP collected. Thank you!`,
    SHIPMENT_FAILED: `Wsalhali: Delivery attempt failed for ${data.trackingNumber}. Reason: ${data.reason}. We will retry tomorrow.`,
  }
  return templates[type] || `Wsalhali: Update on shipment ${data.trackingNumber}`
}

// ============ WHATSAPP TEMPLATES ============

export function getWhatsAppTemplate(type: string, data: Record<string, any>): string {
  const templates: Record<string, string> = {
    SHIPMENT_OUT_FOR_DELIVERY: `🚚 *Wsalhali - Out for Delivery*

Your shipment *${data.trackingNumber}* is out for delivery today!

📦 *Recipient:* ${data.recipientName}
📍 *Address:* ${data.recipientAddress}
💰 *COD Amount:* ${data.codAmount} EGP

Please ensure someone is available to receive the package.

Track: wsalhali.vercel.app/track?q=${data.trackingNumber}`,
    SHIPMENT_DELIVERED: `✅ *Wsalhali - Delivered*

Your shipment *${data.trackingNumber}* has been delivered successfully!

📦 *Delivered to:* ${data.recipientName}
💰 *COD Collected:* ${data.codAmount} EGP

Thank you for using Wsalhali! 🙏`,
    COD_SETTLEMENT_PAID: `💰 *Wsalhali - COD Settlement Paid*

Your settlement *${data.reference}* has been paid!

💵 *Amount:* ${data.netAmount} EGP
📅 *Period:* ${data.period}
📦 *Shipments:* ${data.shipmentCount}

The funds have been transferred to your account.`,
  }
  return templates[type] || `*Wsalhali:* Update on ${data.trackingNumber}`
}

// ============ SEND FUNCTIONS ============

// Log notification to database
export async function logNotification(
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP',
  recipient: string,
  subject: string | null,
  body: string,
  status: string = 'SENT',
  errorMessage?: string,
  metadata?: Record<string, any>
) {
  try {
    await db.notificationLog.create({
      data: {
        recipient,
        channel,
        subject,
        body,
        status,
        errorMessage: errorMessage || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })
  } catch (e) {
    console.error('Failed to log notification:', e)
  }
}

// Send email (placeholder - integrate with Resend in production)
export async function sendEmail(to: string, subject: string, body: string) {
  // TODO: Integrate with Resend
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'Wsalhali <noreply@wsalhali.com>',
  //   to,
  //   subject,
  //   text: body,
  // })

  console.log(`[EMAIL SENT] To: ${to}, Subject: ${subject}`)
  await logNotification('EMAIL', to, subject, body, 'SENT')
  return { success: true }
}

// Send SMS (placeholder - integrate with Twilio in production)
export async function sendSMS(to: string, body: string) {
  // TODO: Integrate with Twilio
  // const twilio = require('twilio')(accountSid, authToken)
  // await twilio.messages.create({ body, from: '+1234567890', to })

  console.log(`[SMS SENT] To: ${to}, Body: ${body}`)
  await logNotification('SMS', to, null, body, 'SENT')
  return { success: true }
}

// Send WhatsApp message (placeholder - integrate with WhatsApp Business API)
export async function sendWhatsApp(to: string, body: string) {
  // TODO: Integrate with WhatsApp Business API
  console.log(`[WHATSAPP SENT] To: ${to}, Body: ${body}`)
  await logNotification('WHATSAPP', to, null, body, 'SENT')
  return { success: true }
}

// Send shipment notification via all relevant channels
export async function sendShipmentNotification(
  type: string,
  shipment: any,
  client: any
) {
  const data = {
    trackingNumber: shipment.trackingNumber,
    clientName: client?.companyName || 'Customer',
    fromCity: shipment.senderCity?.name || '',
    toCity: shipment.recipientCity?.name || '',
    recipientName: shipment.recipientName,
    recipientAddress: shipment.recipientAddress,
    codAmount: shipment.codAmount,
    reason: shipment.failureReason,
  }

  // Send email to client
  if (client?.user?.email) {
    const template = getEmailTemplate(type, data)
    await sendEmail(client.user.email, template.subject, template.body)
  }

  // Send SMS to recipient
  if (shipment.recipientPhone && (type === 'SHIPMENT_OUT_FOR_DELIVERY' || type === 'SHIPMENT_DELIVERED' || type === 'SHIPMENT_FAILED')) {
    const smsBody = getSMSTemplate(type, data)
    await sendSMS(shipment.recipientPhone, smsBody)
  }

  // Send WhatsApp to recipient
  if (shipment.recipientPhone && (type === 'SHIPMENT_OUT_FOR_DELIVERY' || type === 'SHIPMENT_DELIVERED')) {
    const waBody = getWhatsAppTemplate(type, data)
    await sendWhatsApp(shipment.recipientPhone, waBody)
  }
}
