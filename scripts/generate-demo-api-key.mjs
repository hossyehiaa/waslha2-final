import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const username = process.argv[2] || process.env.DEMO_CLIENT_USERNAME || 'braa'
const name = process.argv[3] || 'Demo Partner Integration'

try {
  const user = await db.user.findUnique({ where: { username }, include: { clientProfile: true } })
  if (!user?.clientProfile) throw new Error(`No client profile found for username: ${username}`)
  const rawKey = `wsl_${crypto.randomBytes(24).toString('base64url').slice(0, 32)}`
  const record = await db.apiKey.create({
    data: {
      clientId: user.clientProfile.id,
      keyHash: await bcrypt.hash(rawKey, 12),
      keyPrefix: rawKey.slice(0, 12),
      name,
      scopes: 'shipments:read,shipments:write',
      isActive: true,
    },
  })
  console.log(`Created API key ${record.id} for client ${user.clientProfile.companyName}.`)
  console.log('Save this full key now; it will not be shown again:')
  console.log(rawKey)
} finally {
  await db.$disconnect()
}
