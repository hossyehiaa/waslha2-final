import { GET as getAdminFinance } from '@/app/api/admin/finance/route'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  return getAdminFinance(req as any)
}
