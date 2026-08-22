import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, generateTrackingNumber } from '@/lib/auth-helpers'
import { calculateShippingCost } from '@/lib/partner-api'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { shipments, clientId } = body

    if (!shipments || !Array.isArray(shipments) || shipments.length === 0) {
      return NextResponse.json({ error: 'No shipments data provided' }, { status: 400 })
    }
    if (shipments.length > 1000) return NextResponse.json({ error: 'Bulk import is limited to 1000 shipments per request' }, { status: 400 })
    if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE' && user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const targetClientId = user.role === 'CLIENT' ? user.clientId : clientId
    if (!targetClientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    const client = await db.client.findUnique({ where: { id: targetClientId }, include: { user: { select: { phone: true } } } })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    // Create bulk import log
    const bulkImport = await db.bulkImport.create({
      data: {
        filename: body.filename || 'bulk_import.csv',
        uploadedBy: user.id,
        totalCount: shipments.length,
        status: 'PROCESSING',
      },
    })

    const results: any[] = []
    let successCount = 0
    let failCount = 0
    const errors: any[] = []

    for (let i = 0; i < shipments.length; i++) {
      const row = shipments[i]
      try {
        // Validate required fields
        if (!row.recipientName || !row.recipientPhone || !row.recipientAddress || !row.recipientCity) {
          throw new Error(`Row ${i + 1}: Missing required fields (recipientName, recipientPhone, recipientAddress, recipientCity)`)
        }

        // Find city by name
        const city = await db.city.findFirst({
          where: { status: 'ACTIVE', OR: [{ id: String(row.recipientCity) }, { code: String(row.recipientCity).trim().toUpperCase() }, { name: { contains: String(row.recipientCity), mode: 'insensitive' } }] },
        })
        if (!city) throw new Error(`Row ${i + 1}: City "${row.recipientCity}" not found`)

        // Find sender city
        let senderCityId = client.cityId
        if (row.senderCity) {
          const senderCity = await db.city.findFirst({
            where: { status: 'ACTIVE', OR: [{ id: String(row.senderCity) }, { code: String(row.senderCity).trim().toUpperCase() }, { name: { contains: String(row.senderCity), mode: 'insensitive' } }] },
          })
          if (!senderCity) throw new Error(`Row ${i + 1}: Sender city not found`)
          senderCityId = senderCity.id
        }
        if (!senderCityId) throw new Error(`Row ${i + 1}: Sender city is required for pricing`)

        const codAmount = Math.min(100000000, Math.max(0, Number(row.codAmount) || 0))
        const weight = Math.min(1000, Math.max(0.1, Number(row.weight) || 0.5))
        const pieces = Math.min(1000, Math.max(1, Math.floor(Number(row.pieces) || 1)))
        const serviceType = row.serviceType === 'EXPRESS' || row.serviceType === 'SAME_DAY' ? row.serviceType : 'STANDARD'
        const priority = row.priority === 'LOW' || row.priority === 'HIGH' || row.priority === 'URGENT' ? row.priority : 'NORMAL'
        const quote = await calculateShippingCost({
          sender: { name: row.senderName || client.companyName, phone: row.senderPhone || client.user?.phone || '', address: row.senderAddress || client.address || '', cityCode: String(senderCityId) },
          recipient: { name: row.recipientName, phone: row.recipientPhone, address: row.recipientAddress, cityCode: city.code },
          serviceType,
          priority,
          weight,
          pieces,
          description: row.description || null,
          codAmount,
        }, senderCityId, city.id)
        const { shippingCost, codFee, totalCost } = quote
        const trackingNumber = generateTrackingNumber()

        const shipment = await db.shipment.create({
          data: {
            trackingNumber,
            clientId: targetClientId,
            createdById: user.id,
            senderName: row.senderName || client.companyName,
            senderPhone: row.senderPhone || client.user?.phone || '',
            senderAddress: row.senderAddress || client.address || '',
            senderCityId: senderCityId || '',
            recipientName: row.recipientName,
            recipientPhone: row.recipientPhone,
            recipientAddress: row.recipientAddress,
            recipientCityId: city.id,
            type: row.type === 'RETURN' || row.type === 'EXCHANGE' ? row.type : 'DELIVERY',
            serviceType,
            priority,
            weight,
            pieces,
            description: row.description || null,
            shippingCost,
            codAmount,
            codFee,
            totalCost,
            status: 'PENDING',
            paymentStatus: 'PENDING',
          },
        })

        results.push({ row: i + 1, trackingNumber: shipment.trackingNumber, status: 'success' })
        successCount++
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message, data: row })
        failCount++
      }
    }

    // Update client counters
    if (successCount > 0) {
      await db.client.update({
        where: { id: targetClientId },
        data: {
          totalShipments: { increment: successCount },
          activeShipments: { increment: successCount },
        },
      })
    }

    // Update bulk import log
    await db.bulkImport.update({
      where: { id: bulkImport.id },
      data: {
        successCount,
        failCount,
        errors: JSON.stringify(errors),
        status: 'COMPLETED',
      },
    })

    return NextResponse.json({
      success: true,
      total: shipments.length,
      successCount,
      failCount,
      errors: errors.slice(0, 20), // Return first 20 errors
      results: results.slice(0, 50), // Return first 50 successes
      importId: bulkImport.id,
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
