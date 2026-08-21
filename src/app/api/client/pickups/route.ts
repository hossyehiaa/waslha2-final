import { GET as getAdminPickups } from '@/app/api/admin/pickups/route'

export const runtime = 'nodejs'

export async function GET() {
  return getAdminPickups()
}
