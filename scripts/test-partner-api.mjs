import assert from 'node:assert/strict'

const baseUrl = (process.env.PARTNER_API_BASE_URL || 'http://localhost:3000/api/integrations/v1').replace(/\/$/, '')
const legacyUrl = baseUrl.replace('/api/integrations/v1', '/api/public')
const apiKey = process.env.PARTNER_API_KEY
const readOnlyKey = process.env.PARTNER_READ_ONLY_API_KEY

async function request(url, options = {}) {
  const response = await fetch(url, options)
  const text = await response.text()
  let body = {}
  try { body = text ? JSON.parse(text) : {} } catch { body = { raw: text } }
  return { response, body }
}

function authHeaders(key = apiKey) {
  return key ? { Authorization: `Bearer ${key}` } : {}
}

async function run() {
  const missing = await request(`${baseUrl}/cities`)
  assert.equal(missing.response.status, 401, 'missing API key should return 401')

  const invalid = await request(`${baseUrl}/cities`, { headers: { Authorization: 'Bearer wsl_invalid_key' } })
  assert.equal(invalid.response.status, 401, 'invalid API key should return 401')

  if (!apiKey) {
    console.log('Authentication checks passed. Set PARTNER_API_KEY to run authenticated endpoint checks.')
    return
  }

  if (readOnlyKey) {
    const missingScope = await request(`${baseUrl}/shipments`, { method: 'POST', headers: { ...authHeaders(readOnlyKey), 'Content-Type': 'application/json' }, body: '{}' })
    assert.equal(missingScope.response.status, 403, 'missing write scope should return 403')
  }

  const cities = await request(`${baseUrl}/cities`, { headers: authHeaders() })
  assert.equal(cities.response.status, 200, 'cities endpoint should return 200')
  assert.ok(Array.isArray(cities.body.data), 'cities should return data')
  const cairo = cities.body.data.find((city) => city.code === 'CAI')
  const alex = cities.body.data.find((city) => city.code === 'ALX')
  assert.ok(cairo && alex, 'seed data should include CAI and ALX')

  const shipmentBody = {
    sender: { name: 'Partner Warehouse', phone: '01000000000', address: 'Nasr City, Cairo', cityCode: 'CAI' },
    recipient: { name: 'Partner Customer', phone: '01111111111', address: 'Smouha, Alexandria', cityCode: 'ALX' },
    serviceType: 'STANDARD', priority: 'NORMAL', weight: 1, pieces: 1, codAmount: 750,
  }
  const idempotencyKey = `partner-test-${Date.now()}`
  const created = await request(`${baseUrl}/shipments`, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(shipmentBody) })
  assert.equal(created.response.status, 201, 'create shipment should return 201')
  assert.ok(created.body.data?.trackingNumber?.startsWith('WSL'), 'tracking number should start with WSL')
  assert.ok(Number(created.body.data?.totalCost) > 0, 'totalCost should be server-calculated')

  const duplicate = await request(`${baseUrl}/shipments`, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ ...shipmentBody, shippingCost: 999999 }) })
  assert.equal(duplicate.response.status, 201, 'same idempotency key should replay the original response')
  assert.equal(duplicate.body.data.trackingNumber, created.body.data.trackingNumber, 'idempotency replay should return the same shipment')

  const listed = await request(`${baseUrl}/shipments?search=${encodeURIComponent(created.body.data.trackingNumber)}`, { headers: authHeaders() })
  assert.equal(listed.response.status, 200, 'list shipments should return 200')
  assert.ok(listed.body.data.some((shipment) => shipment.trackingNumber === created.body.data.trackingNumber), 'list should include created shipment')

  const tracked = await request(`${baseUrl}/shipments/${created.body.data.trackingNumber}`, { headers: authHeaders() })
  assert.equal(tracked.response.status, 200, 'track should return 200')
  assert.ok(Array.isArray(tracked.body.data.statusHistory), 'track should return statusHistory')

  const missingTracking = await request(`${baseUrl}/shipments/WSL-NOT-FOUND`, { headers: authHeaders() })
  assert.equal(missingTracking.response.status, 404, 'invalid tracking should return 404')

  const bulk = await request(`${baseUrl}/shipments/bulk`, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json', 'Idempotency-Key': `bulk-${Date.now()}` }, body: JSON.stringify({ shipments: [shipmentBody, { ...shipmentBody, recipient: { ...shipmentBody.recipient, phone: 'invalid' } }] }) })
  assert.equal(bulk.response.status, 200, 'bulk create should return 200')
  assert.equal(bulk.body.data.successCount, 1, 'bulk create should report one successful row')
  assert.equal(bulk.body.data.failureCount, 1, 'bulk create should report one failed row')

  const legacy = await request(`${legacyUrl}?page=1&limit=1`, { headers: authHeaders() })
  assert.equal(legacy.response.headers.get('x-deprecated'), 'Use /api/integrations/v1 instead', 'legacy endpoint should return deprecation header')
  console.log('Partner API integration checks passed.')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
