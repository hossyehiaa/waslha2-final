import { GET as getAdminLoyalty } from '@/app/api/admin/loyalty/route'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  return getAdminLoyalty(req as any)
}
