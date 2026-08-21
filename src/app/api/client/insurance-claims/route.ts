import { GET as getAdminClaims, POST as postAdminClaim } from '@/app/api/admin/insurance-claims/route'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  return getAdminClaims(req as any)
}

export async function POST(req: Request) {
  return postAdminClaim(req as any)
}
