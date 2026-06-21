import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, generateTrackingNumber } from '@/lib/auth-helpers'

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

    const targetClientId = user.role === 'CLIENT' ? user.clientId : clientId
    if (!targetClientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    const client = await db.client.findUnique({ where: { id: targetClientId } })
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
          where: { name: { contains: row.recipientCity, mode: 'insensitive' } },
        })
        if (!city) throw new Error(`Row ${i + 1}: City "${row.recipientCity}" not found`)

        // Find sender city
        let senderCityId = client.cityId
        if (row.senderCity) {
          const senderCity = await db.city.findFirst({
            where: { name: { contains: row.senderCity, mode: 'insensitive' } },
          })
          if (senderCity) senderCityId = senderCity.id
        }

        const codAmount = Number(row.codAmount) || 0
        const shippingCost = Number(row.shippingCost) || 25
        const codFee = Math.round(codAmount * 0.02 * 100) / 100
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
            type: row.type || 'DELIVERY',
            serviceType: row.serviceType || 'STANDARD',
            weight: Number(row.weight) || 0.5,
            pieces: Number(row.pieces) || 1,
            description: row.description || null,
            shippingCost,
            codAmount,
            codFee,
            totalCost: shippingCost + codFee,
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
