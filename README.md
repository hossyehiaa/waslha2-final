# Wsalhali — Premium Shipping & Logistics Platform

A production-ready shipping and logistics platform built with Next.js 16, TypeScript, Prisma, and a premium modern UI/UX inspired by Linear / Stripe / Vercel.

## 🚀 Live Demo

**Production URL:** https://wsalhali.vercel.app

## 🔐 Demo Accounts

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Admin | `admin` | `admin123` | Full platform control |
| Client | `braa` | `client123` | Merchant dashboard |
| Employee | `manager` | `emp123` | Branch operations |
| Driver | `drv-001` | `driver123` | Driver app |

## ✨ Features

### Admin Console (17 modules)
- **Dashboard** — Real-time stats, charts, COD overview, top clients, recent shipments
- **Shipments** — List, create, track, detail with timeline & status updates
- **Clients** — Merchant management, onboarding, COD balances
- **Employees** — Staff management with positions & salaries
- **Drivers** — Fleet management with ratings & earnings
- **Branches** — Multi-branch network with stats
- **Warehouses** — Storage capacity tracking
- **Pickup Requests** — Customer pickup scheduling
- **Tracking** — Universal shipment tracking
- **Delivery** — Out-for-delivery management
- **Returns** — Return shipment processing
- **Branch Transfers** — Cross-branch shipment transfers
- **Print Labels** — Bulk label generation
- **Finance** — COD settlements with approve/pay workflow
- **Payouts** — Client withdrawal requests
- **Invoices** — Billing management
- **Expenses** — Operational cost tracking
- **Pricing Rules** — Configurable shipping rates
- **Reports** — Analytics with charts
- **Notifications** — System alerts
- **Settings** — System configuration

### Client Portal (9 modules)
- Dashboard with COD wallet
- Shipments (list + create + detail)
- Tracking
- Pickup requests
- COD settlements
- Invoices
- Addresses (CRUD)
- Notifications
- Profile management

### Premium UI/UX
- Custom emerald-teal & amber color palette
- Glassmorphism & mesh backgrounds
- Framer Motion animations
- Skeleton loaders & sonner toasts
- Fully responsive (mobile / tablet / desktop)
- Dark mode support

## 🛠 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Database:** PostgreSQL (Neon serverless)
- **ORM:** Prisma 6
- **Auth:** bcryptjs + httpOnly session cookies
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Deployment:** Vercel

## 📦 Local Development

```bash
# Install dependencies
bun install

# Set up environment
echo 'DATABASE_URL="your-postgresql-url"' > .env

# Push schema & seed
bun run db:push
bun run seed

# Start dev server
bun run dev
```

## 🗂 Project Structure

```
src/
├── app/
│   ├── api/              # REST API routes
│   │   ├── admin/        # Admin-only endpoints
│   │   ├── auth/         # Authentication
│   │   ├── client/       # Client endpoints
│   │   ├── shipments/    # Shipment CRUD
│   │   └── track/        # Public tracking
│   ├── admin/            # Admin dashboard pages
│   ├── dashboard/        # Client dashboard pages
│   ├── login/            # Auth page
│   ├── page.tsx          # Landing page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Design system
├── components/
│   ├── dashboard/        # Reusable dashboard components
│   ├── ui/               # shadcn/ui components
│   ├── theme-provider.tsx
│   └── auth-context.tsx
└── lib/
    ├── auth-helpers.ts   # Auth & session management
    ├── db.ts             # Prisma client
    ├── format.ts         # Formatting utilities
    └── utils.ts
prisma/
└── schema.prisma         # 24 Prisma models
scripts/
└── seed.ts               # Database seeder
```

## 🔒 Security

- bcrypt password hashing (12 rounds)
- httpOnly session cookies
- Role-based access control (RBAC)
- Audit logging on all key actions
- Input validation & sanitization
- CSRF protection via sameSite cookies
- SQL injection prevention via Prisma

## 📄 License

© 2026 Wsalhali. All rights reserved.
