// Wslahali Database Seed - Production-grade demo data
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Wslahali database...')

  // ============ Geography ============
  const cairo = await db.city.create({
    data: { name: 'Cairo', code: 'CAI', governorate: 'Cairo', status: 'ACTIVE' },
  })
  const giza = await db.city.create({
    data: { name: 'Giza', code: 'GIZ', governorate: 'Giza', status: 'ACTIVE' },
  })
  const alex = await db.city.create({
    data: { name: 'Alexandria', code: 'ALX', governorate: 'Alexandria', status: 'ACTIVE' },
  })
  const mansoura = await db.city.create({
    data: { name: 'Mansoura', code: 'MAN', governorate: 'Dakahlia', status: 'ACTIVE' },
  })
  const tanta = await db.city.create({
    data: { name: 'Tanta', code: 'TAN', governorate: 'Gharbia', status: 'ACTIVE' },
  })
  const aswan = await db.city.create({
    data: { name: 'Aswan', code: 'ASW', governorate: 'Aswan', status: 'ACTIVE' },
  })

  const zones = await db.zone.createMany({
    data: [
      { name: 'Nasr City', code: 'CAI-NSR', cityId: cairo.id },
      { name: 'Maadi', code: 'CAI-MAA', cityId: cairo.id },
      { name: 'Heliopolis', code: 'CAI-HLP', cityId: cairo.id },
      { name: 'Downtown Cairo', code: 'CAI-DWN', cityId: cairo.id },
      { name: '6th of October', code: 'GIZ-OCT', cityId: giza.id },
      { name: 'Mohandessin', code: 'GIZ-MOH', cityId: giza.id },
      { name: 'Smouha', code: 'ALX-SMO', cityId: alex.id },
      { name: 'Montaza', code: 'ALX-MNT', cityId: alex.id },
    ],
  })

  // ============ Branches ============
  const cairoBranch = await db.branch.create({
    data: { name: 'Cairo Main Hub', code: 'CAI-01', phone: '+20 2 2345 6789', cityId: cairo.id, address: 'Nasr City, Cairo', status: 'ACTIVE' },
  })
  const gizaBranch = await db.branch.create({
    data: { name: 'Giza Logistics Center', code: 'GIZ-01', phone: '+20 2 2456 7890', cityId: giza.id, address: '6th of October, Giza', status: 'ACTIVE' },
  })
  const alexBranch = await db.branch.create({
    data: { name: 'Alexandria Coastal Hub', code: 'ALX-01', phone: '+20 3 2567 8901', cityId: alex.id, address: 'Smouha, Alexandria', status: 'ACTIVE' },
  })
  const deltaBranch = await db.branch.create({
    data: { name: 'Delta Regional Branch', code: 'DLT-01', phone: '+20 50 2678 9012', cityId: mansoura.id, address: 'Mansoura, Dakahlia', status: 'ACTIVE' },
  })

  // ============ Warehouses ============
  await db.warehouse.createMany({
    data: [
      { name: 'Cairo Warehouse A', code: 'CAI-WH-A', branchId: cairoBranch.id, capacity: 5000, currentLoad: 1247 },
      { name: 'Cairo Warehouse B', code: 'CAI-WH-B', branchId: cairoBranch.id, capacity: 3000, currentLoad: 892 },
      { name: 'Giza Cross-Dock', code: 'GIZ-WH-1', branchId: gizaBranch.id, capacity: 4000, currentLoad: 1567 },
      { name: 'Alex Storage', code: 'ALX-WH-1', branchId: alexBranch.id, capacity: 2500, currentLoad: 423 },
    ],
  })

  // ============ Users ============
  // Admin
  const adminHash = await bcrypt.hash('admin123', 12)
  const adminUser = await db.user.create({
    data: {
      username: 'admin',
      email: 'admin@wsalhali.com',
      passwordHash: adminHash,
      fullName: 'Wslahali Administrator',
      phone: '+20 100 000 0000',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  })

  // Employees
  const empHash = await bcrypt.hash('emp123', 12)
  const emp1User = await db.user.create({
    data: {
      username: 'manager',
      email: 'manager@wsalhali.com',
      passwordHash: empHash,
      fullName: 'Ahmed Hassan',
      phone: '+20 100 111 1111',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    },
  })
  const emp1 = await db.employee.create({
    data: {
      userId: emp1User.id,
      employeeCode: 'EMP-001',
      position: 'MANAGER',
      branchId: cairoBranch.id,
      salary: 15000,
      hireDate: new Date('2024-01-15'),
      status: 'ACTIVE',
    },
  })

  const emp2User = await db.user.create({
    data: {
      username: 'clerk',
      email: 'clerk@wsalhali.com',
      passwordHash: empHash,
      fullName: 'Sara Ibrahim',
      phone: '+20 100 222 2222',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    },
  })
  await db.employee.create({
    data: {
      userId: emp2User.id,
      employeeCode: 'EMP-002',
      position: 'CLERK',
      branchId: gizaBranch.id,
      salary: 8000,
      hireDate: new Date('2024-03-20'),
      status: 'ACTIVE',
    },
  })

  // Drivers
  const driverHash = await bcrypt.hash('driver123', 12)
  const driverNames = [
    { name: 'Mohamed Ali', code: 'DRV-001', branch: cairoBranch.id, zone: 'CAI-NSR' },
    { name: 'Khaled Mostafa', code: 'DRV-002', branch: cairoBranch.id, zone: 'CAI-MAA' },
    { name: 'Omar Saleh', code: 'DRV-003', branch: gizaBranch.id, zone: 'GIZ-OCT' },
    { name: 'Youssef Adel', code: 'DRV-004', branch: alexBranch.id, zone: 'ALX-SMO' },
    { name: 'Tarek Mansour', code: 'DRV-005', branch: cairoBranch.id, zone: 'CAI-HLP' },
  ]

  for (const d of driverNames) {
    const u = await db.user.create({
      data: {
        username: d.code.toLowerCase(),
        email: `${d.code.toLowerCase()}@wsalhali.com`,
        passwordHash: driverHash,
        fullName: d.name,
        phone: `+20 100 ${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)}`,
        role: 'DRIVER',
        status: 'ACTIVE',
      },
    })
    const zone = await db.zone.findFirst({ where: { code: d.zone } })
    await db.driver.create({
      data: {
        userId: u.id,
        driverCode: d.code,
        vehicleType: 'MOTORCYCLE',
        vehiclePlate: `CA-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        licenseNumber: `LIC-${Math.floor(10000 + Math.random() * 90000)}`,
        branchId: d.branch,
        zoneId: zone?.id,
        rating: 4.5 + Math.random() * 0.5,
        totalDeliveries: Math.floor(120 + Math.random() * 800),
        totalEarnings: Math.floor(8000 + Math.random() * 20000),
        pendingEarnings: Math.floor(Math.random() * 3500),
        status: 'ACTIVE',
      },
    })
  }

  // ============ Clients ============
  const clientHash = await bcrypt.hash('client123', 12)
  const clientData = [
    { name: 'braa', company: 'BraaStore', email: 'braa@example.com', city: mansoura, branch: deltaBranch, balance: 45780 },
    { name: 'mohamed', company: 'TechHub Egypt', email: 'mohamed@techhub.com', city: cairo, branch: cairoBranch, balance: 128450 },
    { name: 'fatma', company: 'BeautyBox', email: 'fatma@beautybox.com', city: giza, branch: gizaBranch, balance: 23190 },
    { name: 'ahmed', company: 'Smart Gadgets', email: 'ahmed@smart.com', city: alex, branch: alexBranch, balance: 87340 },
    { name: 'nour', company: 'Nour Cosmetics', email: 'nour@cosmetics.com', city: tanta, branch: deltaBranch, balance: 56230 },
  ]

  const clients: any[] = []
  for (const c of clientData) {
    const u = await db.user.create({
      data: {
        username: c.name,
        email: c.email,
        passwordHash: clientHash,
        fullName: c.company,
        phone: `+20 100 ${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)}`,
        role: 'CLIENT',
        status: 'ACTIVE',
      },
    })
    const cl = await db.client.create({
      data: {
        userId: u.id,
        companyName: c.company,
        codBalance: c.balance,
        codCollected: c.balance + Math.floor(Math.random() * 50000),
        codPaid: Math.floor(Math.random() * 100000),
        codPending: c.balance,
        shippingBalance: 5000 + Math.floor(Math.random() * 20000),
        creditLimit: 100000,
        rating: 4 + Math.random(),
        totalShipments: Math.floor(50 + Math.random() * 800),
        activeShipments: Math.floor(5 + Math.random() * 50),
        status: 'ACTIVE',
        branchId: c.branch.id,
        cityId: c.city.id,
        address: `${c.city.name} branch office`,
        taxNumber: `TAX-${Math.floor(100000 + Math.random() * 900000)}`,
        commercialReg: `CR-${Math.floor(100000 + Math.random() * 900000)}`,
      },
    })
    clients.push(cl)

    // Address book
    await db.clientAddress.create({
      data: {
        clientId: cl.id,
        label: 'Main Warehouse',
        contactName: c.company,
        phone: u.phone || '+20 100 000 0000',
        cityId: c.city.id,
        address: `${c.city.name} Industrial Zone`,
        isDefault: true,
      },
    })
  }

  // ============ Shipments ============
  const sampleClients = clients
  const statuses = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'RETURNED', 'FAILED']
  const drivers = await db.driver.findMany()

  const cities = [cairo, giza, alex, mansoura, tanta, aswan]
  const descriptions = [
    'Electronics — Smartphone',
    'Fashion — T-shirt',
    'Beauty — Cosmetic Set',
    'Home Appliance — Kettle',
    'Books — Hardcover Novel',
    'Accessories — Watch',
    'Toys — Building Blocks',
    'Health — Supplements',
  ]

  for (let i = 0; i < 60; i++) {
    const client = sampleClients[i % sampleClients.length]
    const sender = cities[Math.floor(Math.random() * cities.length)]
    let recipient = cities[Math.floor(Math.random() * cities.length)]
    while (recipient.id === sender.id) {
      recipient = cities[Math.floor(Math.random() * cities.length)]
    }
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const codAmount = Math.floor(100 + Math.random() * 4900)
    const shippingCost = Math.floor(25 + Math.random() * 75)
    const codFee = Math.round(codAmount * 0.02 * 100) / 100
    const driver = status !== 'PENDING' && status !== 'CANCELLED' ? drivers[Math.floor(Math.random() * drivers.length)] : null

    const trackingNumber = `WSL${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(16).slice(2, 6).toUpperCase()}`

    const now = Date.now()
    const createdAt = new Date(now - Math.floor(Math.random() * 14 * 24 * 3600 * 1000))

    const shipment = await db.shipment.create({
      data: {
        trackingNumber,
        clientId: client.id,
        createdById: adminUser.id,
        senderName: client.companyName,
        senderPhone: '+20 100 000 0000',
        senderAddress: `${sender.name} Office`,
        senderCityId: sender.id,
        fromBranchId: client.branchId,
        recipientName: `Customer ${i + 1}`,
        recipientPhone: `+20 1${Math.floor(10 + Math.random() * 90)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)}`,
        recipientAddress: `${recipient.name} District ${i + 1}`,
        recipientCityId: recipient.id,
        toBranchId: recipient.id === cairo.id ? cairoBranch.id : recipient.id === giza.id ? gizaBranch.id : recipient.id === alex.id ? alexBranch.id : deltaBranch.id,
        type: 'DELIVERY',
        serviceType: Math.random() > 0.7 ? 'EXPRESS' : 'STANDARD',
        weight: Math.round((0.3 + Math.random() * 4) * 10) / 10,
        pieces: Math.floor(1 + Math.random() * 4),
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        shippingCost,
        codAmount,
        codFee,
        totalCost: shippingCost + codFee,
        driverId: driver?.id,
        status,
        paymentStatus: status === 'DELIVERED' ? (Math.random() > 0.5 ? 'SETTLED' : 'COLLECTED') : 'PENDING',
        codCollectedAt: status === 'DELIVERED' ? new Date(now - Math.floor(Math.random() * 7 * 24 * 3600 * 1000)) : null,
        priority: Math.random() > 0.85 ? 'URGENT' : Math.random() > 0.7 ? 'HIGH' : 'NORMAL',
        isFavorite: Math.random() > 0.92,
        pickupAt: status !== 'PENDING' ? new Date(createdAt.getTime() + 3600000) : null,
        deliveredAt: status === 'DELIVERED' ? new Date(createdAt.getTime() + 86400000 * (1 + Math.random() * 2)) : null,
        createdAt,
      },
    })

    // Status history
    const history = [{ s: 'PENDING', t: createdAt }]
    if (status !== 'PENDING') history.push({ s: 'PICKED_UP', t: new Date(createdAt.getTime() + 3600000) })
    if (['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'FAILED'].includes(status)) {
      history.push({ s: 'IN_TRANSIT', t: new Date(createdAt.getTime() + 7200000) })
    }
    if (['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'FAILED'].includes(status)) {
      history.push({ s: 'OUT_FOR_DELIVERY', t: new Date(createdAt.getTime() + 86400000) })
    }
    if (status === 'DELIVERED') history.push({ s: 'DELIVERED', t: shipment.deliveredAt || new Date() })
    if (status === 'RETURNED') history.push({ s: 'RETURNED', t: new Date(createdAt.getTime() + 86400000 * 3) })
    if (status === 'FAILED') {
      history.push({ s: 'FAILED', t: new Date(createdAt.getTime() + 86400000 * 2) })
      await db.shipment.update({ where: { id: shipment.id }, data: { failureReason: 'Customer not available' } })
    }

    for (const h of history) {
      await db.shipmentStatus.create({
        data: {
          shipmentId: shipment.id,
          status: h.s,
          note: 'Status updated automatically',
          createdAt: h.t,
        },
      })
    }
  }

  // ============ Pickup Requests ============
  for (let i = 0; i < 8; i++) {
    const client = sampleClients[i % sampleClients.length]
    const statuses = ['PENDING', 'CONFIRMED', 'ASSIGNED', 'PICKED_UP']
    await db.pickupRequest.create({
      data: {
        clientId: client.id,
        pickupAddress: `${client.companyName} warehouse`,
        pickupCityId: client.cityId!,
        contactName: client.companyName,
        contactPhone: '+20 100 000 0000',
        requestedDate: new Date(Date.now() + Math.floor(Math.random() * 7 * 86400000)),
        packagesCount: Math.floor(1 + Math.random() * 10),
        totalWeight: Math.round((1 + Math.random() * 30) * 10) / 10,
        notes: 'Pickup at loading dock',
        status: statuses[Math.floor(Math.random() * statuses.length)],
      },
    })
  }

  // ============ COD Settlements ============
  for (let i = 0; i < 5; i++) {
    const client = sampleClients[i]
    const totalAmount = Math.floor(5000 + Math.random() * 45000)
    const fees = Math.round(totalAmount * 0.02 * 100) / 100
    await db.codSettlement.create({
      data: {
        clientId: client.id,
        reference: `COD-${Date.now().toString(36).toUpperCase()}${i}`,
        period: '2026-06',
        totalAmount,
        fees,
        netAmount: totalAmount - fees,
        shipmentCount: Math.floor(10 + Math.random() * 60),
        status: i < 3 ? 'PAID' : 'PENDING',
        paidAt: i < 3 ? new Date() : null,
      },
    })
  }

  // ============ Invoices ============
  for (let i = 0; i < 8; i++) {
    const client = sampleClients[i % sampleClients.length]
    const amount = Math.floor(500 + Math.random() * 5000)
    const tax = Math.round(amount * 0.14 * 100) / 100
    await db.invoice.create({
      data: {
        invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}${i}`,
        clientId: client.id,
        type: 'SHIPPING',
        amount,
        tax,
        total: amount + tax,
        status: i < 5 ? 'PAID' : 'UNPAID',
        dueDate: new Date(Date.now() + 7 * 86400000),
        paidAt: i < 5 ? new Date() : null,
        period: '2026-06',
      },
    })
  }

  // ============ Payout Requests ============
  for (let i = 0; i < 4; i++) {
    const client = sampleClients[i]
    await db.payoutRequest.create({
      data: {
        clientId: client.id,
        amount: Math.floor(1000 + Math.random() * 20000),
        method: 'BANK_TRANSFER',
        bankAccount: 'EG-XX-XXXX-XXXX-' + Math.floor(1000 + Math.random() * 9000),
        status: i < 2 ? 'PENDING' : 'APPROVED',
        notes: 'Monthly COD payout',
      },
    })
  }

  // ============ Flyer Requests ============
  for (let i = 0; i < 3; i++) {
    const client = sampleClients[i]
    await db.flyerRequest.create({
      data: {
        clientId: client.id,
        quantity: Math.floor(100 + Math.random() * 1000),
        type: 'STANDARD',
        notes: 'Branded shipping flyers',
        status: i < 2 ? 'APPROVED' : 'PENDING',
      },
    })
  }

  // ============ Expenses ============
  const expenseCats = ['SALARIES', 'FUEL', 'MAINTENANCE', 'RENT', 'UTILITIES', 'OTHER']
  for (let i = 0; i < 20; i++) {
    await db.expense.create({
      data: {
        category: expenseCats[i % expenseCats.length],
        description: `${expenseCats[i % expenseCats.length].toLowerCase()} expense #${i + 1}`,
        amount: Math.floor(500 + Math.random() * 10000),
        branchId: [cairoBranch.id, gizaBranch.id, alexBranch.id, deltaBranch.id][i % 4],
        date: new Date(Date.now() - Math.floor(Math.random() * 30 * 86400000)),
      },
    })
  }

  // ============ Branch Transfers ============
  const transfers = [
    { from: cairoBranch.id, to: gizaBranch.id, count: 24, value: 4500 },
    { from: cairoBranch.id, to: alexBranch.id, count: 18, value: 3200 },
    { from: gizaBranch.id, to: deltaBranch.id, count: 12, value: 2100 },
    { from: alexBranch.id, to: cairoBranch.id, count: 8, value: 1800, received: true },
  ]
  for (const t of transfers) {
    await db.branchTransfer.create({
      data: {
        reference: `TRF-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 100)}`,
        fromBranchId: t.from,
        toBranchId: t.to,
        shipmentCount: t.count,
        totalValue: t.value,
        status: t.received ? 'RECEIVED' : 'PENDING_RECEIPT',
        sentAt: new Date(Date.now() - Math.floor(Math.random() * 3 * 86400000)),
        receivedAt: t.received ? new Date() : null,
      },
    })
  }

  // ============ Pricing Rules ============
  await db.pricingRule.create({
    data: {
      name: 'Standard Domestic',
      serviceType: 'STANDARD',
      baseWeight: 0.5,
      basePrice: 25,
      perKgPrice: 8,
      codFeePercent: 2,
      insuranceFeePercent: 0.5,
      status: 'ACTIVE',
    },
  })
  await db.pricingRule.create({
    data: {
      name: 'Express Domestic',
      serviceType: 'EXPRESS',
      baseWeight: 0.5,
      basePrice: 50,
      perKgPrice: 15,
      codFeePercent: 2,
      insuranceFeePercent: 0.5,
      status: 'ACTIVE',
    },
  })

  // ============ Notifications ============
  const users = await db.user.findMany()
  for (const u of users.slice(0, 5)) {
    await db.notification.create({
      data: {
        userId: u.id,
        type: 'SYSTEM',
        title: 'Welcome to Wslahali',
        message: 'Your premium shipping platform is ready to use.',
        isRead: false,
      },
    })
  }
  await db.notification.create({
    data: {
      userId: adminUser.id,
      type: 'SHIPMENT',
      title: 'New shipment created',
      message: 'A new shipment WSL-DEMO-001 has been created and is pending pickup.',
      isRead: false,
      link: '/admin/shipments',
    },
  })
  await db.notification.create({
    data: {
      userId: adminUser.id,
      type: 'PAYMENT',
      title: 'COD settlement pending',
      message: 'There are 3 COD settlements awaiting your approval.',
      isRead: false,
      link: '/admin/finance',
    },
  })

  // ============ Settings ============
  const settings = [
    { key: 'company_name', value: 'Wslahali', category: 'GENERAL' },
    { key: 'currency', value: 'EGP', category: 'GENERAL' },
    { key: 'timezone', value: 'Africa/Cairo', category: 'GENERAL' },
    { key: 'cod_fee_percent', value: '2', category: 'PRICING' },
    { key: 'insurance_fee_percent', value: '0.5', category: 'PRICING' },
    { key: 'max_cod_amount', value: '50000', category: 'PRICING' },
    { key: 'min_cod_amount', value: '50', category: 'PRICING' },
  ]
  for (const s of settings) {
    await db.systemSetting.create({ data: s })
  }

  console.log('✅ Seed completed!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Demo accounts:')
  console.log('  Admin:    admin / admin123')
  console.log('  Employee: manager / emp123')
  console.log('  Driver:   drv-001 / driver123')
  console.log('  Client:   braa / client123')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
