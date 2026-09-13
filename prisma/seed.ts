import { PrismaClient, UserRole, RiderStatus, CustomerType, VehicleStatus, OrderStatus, PaymentMethod, PaymentStatus, OtpType, AlertType, PartnerStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // --- USERS ---
  const passwordHash = await bcrypt.hash('password123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@fiatlux.cg' },
    update: {},
    create: {
      email: 'admin@fiatlux.cg',
      name: 'Admin FiatLux',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'dispatcher@fiatlux.cg' },
    update: {},
    create: {
      email: 'dispatcher@fiatlux.cg',
      name: 'Jean Dispatch',
      passwordHash,
      role: UserRole.DISPATCHER,
    },
  });

  // --- PARTNERS ---
  const partner1 = await prisma.partner.upsert({
    where: { email: 'pharmacie.paix@email.cg' },
    update: {},
    create: {
      companyName: 'Pharmacie de la Paix',
      contactName: 'Dr. Mavoungou',
      email: 'pharmacie.paix@email.cg',
      passwordHash,
      phone: '+242061234567',
      status: PartnerStatus.ACTIVE,
    },
  });

  const partner2 = await prisma.partner.upsert({
    where: { email: 'casino.pn@email.cg' },
    update: {},
    create: {
      companyName: 'Supermarché Casino',
      contactName: 'Jean Casino',
      email: 'casino.pn@email.cg',
      passwordHash,
      phone: '+242055554433',
      status: PartnerStatus.ACTIVE,
    },
  });

  // --- PRICING ZONES ---
  const zones = [
    'Centre-ville',
    'Tié-Tié',
    'Loandjili',
    'Mongo-Mpoukou',
    'Ngoyo',
    'Mpaka'
  ];

  const zoneMap: Record<string, string> = {};
  for (const zoneName of zones) {
    const zone = await prisma.pricingZone.upsert({
      where: { zoneName },
      update: {},
      create: { zoneName },
    });
    zoneMap[zoneName] = zone.id;
  }

  // --- PRICING RULES ---
  const rules = [
    { from: 'Centre-ville', to: 'Centre-ville', amount: 1000 },
    { from: 'Centre-ville', to: 'Tié-Tié', amount: 1500 },
    { from: 'Centre-ville', to: 'Loandjili', amount: 2000 },
    { from: 'Tié-Tié', to: 'Loandjili', amount: 1500 },
    { from: 'Mongo-Mpoukou', to: 'Centre-ville', amount: 2500 },
    { from: 'Ngoyo', to: 'Centre-ville', amount: 3000 },
    { from: 'Mpaka', to: 'Tié-Tié', amount: 1500 },
    { from: 'Loandjili', to: 'Ngoyo', amount: null }, // Sur devis
  ];

  for (const r of rules) {
    await prisma.pricingRule.create({
      data: {
        zoneFromId: zoneMap[r.from],
        zoneToId: zoneMap[r.to],
        fixedAmount: r.amount,
      },
    });
  }

  // --- LANDMARKS (repères géolocalisés) ---
  // ⚠️ Coordonnées APPROXIMATIVES (centre-ville Pointe-Noire ≈ -4.7761,
  // 11.8636 comme point de référence) — à corriger avec les vraies
  // positions via l'admin (page Repères) avant mise en production réelle.
  const landmarks = [
    { name: 'Ngoyo Péage', aliases: ['ngoyo peage', 'peage ngoyo'], lat: -4.8102, lng: 11.8544, zone: 'Ngoyo' },
    { name: 'Ngoyo Station', aliases: ['ngoyo station', 'station ngoyo'], lat: -4.8067, lng: 11.8571, zone: 'Ngoyo' },
    { name: 'Tchimbamba SNE', aliases: ['tchimbamba sne'], lat: -4.7889, lng: 11.8502, zone: 'Mongo-Mpoukou' },
    { name: 'Tchimbamba Vacherot', aliases: ['tchimbamba vacherot', 'vacherot'], lat: -4.7912, lng: 11.8467, zone: 'Mongo-Mpoukou' },
    { name: 'Centre-ville / Grand Marché', aliases: ['grand marche', 'grand marché', 'centre ville'], lat: -4.7761, lng: 11.8636, zone: 'Centre-ville' },
    { name: 'Rond-point Lumumba', aliases: ['rond point lumumba', 'lumumba'], lat: -4.7799, lng: 11.8598, zone: 'Centre-ville' },
    { name: 'Tié-Tié', aliases: ['tietie', 'tie tie'], lat: -4.7942, lng: 11.8355, zone: 'Tié-Tié' },
    { name: 'Mongo-Mpoukou', aliases: ['mongo mpoukou'], lat: -4.7875, lng: 11.8489, zone: 'Mongo-Mpoukou' },
    { name: 'Loandjili', aliases: ['loandjili'], lat: -4.7602, lng: 11.8867, zone: 'Loandjili' },
  ];

  for (const lm of landmarks) {
    await prisma.landmark.upsert({
      where: { id: `seed-${lm.name}` }, // pas de champ unique naturel, on force un id stable pour le upsert
      update: {},
      create: {
        id: `seed-${lm.name}`,
        name: lm.name,
        aliases: lm.aliases,
        lat: lm.lat,
        lng: lm.lng,
        pricingZoneId: zoneMap[lm.zone] || null,
      },
    });
  }

  // --- RIDERS ---
  const rider1 = await prisma.rider.upsert({
    where: { phone: '+242061234567' },
    update: {},
    create: {
      name: 'Arnaud Mavoungou',
      phone: '+242061234567',
      vehiclePlate: 'PN-123-AB',
      status: RiderStatus.ACTIVE,
      currentLat: -4.7794,
      currentLng: 11.8594,
      currentAddress: 'Avenue Charles de Gaulle, Centre-ville, Pointe-Noire',
      rating: 4.8,
    },
  });

  const rider2 = await prisma.rider.upsert({
    where: { phone: '+242055556677' },
    update: {},
    create: {
      name: 'Brice Makosso',
      phone: '+242055556677',
      vehiclePlate: 'PN-456-CD',
      status: RiderStatus.BUSY,
      currentLat: -4.7933,
      currentLng: 11.8842,
      currentAddress: 'Marché de Tié-Tié, Pointe-Noire',
      rating: 4.5,
    },
  });

  // --- VEHICLES ---
  await prisma.vehicle.upsert({
    where: { plate: 'PN-123-AB' },
    update: {},
    create: {
      plate: 'PN-123-AB',
      model: 'Yamaha Crux 110',
      status: VehicleStatus.IN_SERVICE,
      mileage: 12500,
      riderId: rider1.id,
    },
  });

  await prisma.vehicle.upsert({
    where: { plate: 'PN-456-CD' },
    update: {},
    create: {
      plate: 'PN-456-CD',
      model: 'TVS HLX 125',
      status: VehicleStatus.IN_SERVICE,
      mileage: 8400,
      riderId: rider2.id,
    },
  });

  // --- CUSTOMERS ---
  const customers = [
    { name: 'Boutique Maman Bene', phone: '+242069874512', type: CustomerType.BUSINESS, address: 'Grand Marché, Pointe-Noire' },
    { name: 'Soco-Congo SARL', phone: '+242051239874', type: CustomerType.BUSINESS, address: 'Zone Industrielle, Pointe-Noire', billingMode: 'MONTHLY' },
    { name: 'Espace Mode Brazza', phone: '+242064512398', type: CustomerType.BUSINESS, address: 'Poto-Poto, Brazzaville' },
    { name: 'Pierre Tchikaya', phone: '+242059998877', type: CustomerType.INDIVIDUAL, address: 'Mongo-Mpoukou, Pointe-Noire' },
    { name: 'Marie Louvouezo', phone: '+242061112233', type: CustomerType.INDIVIDUAL, address: 'Loandjili, Pointe-Noire' },
  ];

  const createdCustomers = [];
  for (const c of customers) {
    const cust = await prisma.customer.create({ data: c });
    createdCustomers.push(cust);
  }

  // --- ORDERS ---
  const orderData = [
    {
      trackingNumber: 'EXP-PN-1001',
      customerId: createdCustomers[0].id,
      pickupAddress: 'Grand Marché, Pointe-Noire',
      pickupLat: -4.7850,
      pickupLng: 11.8550,
      dropoffAddress: 'Loandjili, Villa 45',
      dropoffLat: -4.7430,
      dropoffLng: 11.8680,
      recipientName: 'Alice Zola',
      recipientPhone: '+242061234455',
      packageDescription: 'Sèche-cheveux et produits cosmétiques',
      amount: 3500,
      paymentMethod: PaymentMethod.CASH_AT_PICKUP,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.DELIVERED,
      riderId: rider1.id,
    },
    {
      trackingNumber: 'EXP-PN-1002',
      customerId: createdCustomers[1].id,
      pickupAddress: 'Zone Industrielle, Entrepôt B',
      pickupLat: -4.8050,
      pickupLng: 11.8350,
      dropoffAddress: 'Centre-ville, Immeuble CNSS',
      dropoffLat: -4.7790,
      dropoffLng: 11.8590,
      recipientName: 'Directeur Logistique',
      recipientPhone: '+242055551122',
      packageDescription: 'Documents administratifs urgents',
      amount: 2500,
      paymentMethod: PaymentMethod.ONLINE,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.DELIVERED,
      riderId: rider1.id,
    },
    {
      trackingNumber: 'EXP-PN-1003',
      customerId: createdCustomers[3].id,
      pickupAddress: 'Mongo-Mpoukou, Chez Pierre',
      pickupLat: -4.7550,
      pickupLng: 11.8900,
      dropoffAddress: 'Tié-Tié, Arrêt de bus',
      dropoffLat: -4.7930,
      dropoffLng: 11.8840,
      recipientName: 'M. Makosso',
      recipientPhone: '+242054443322',
      packageDescription: 'Sac de voyage',
      amount: 4000,
      paymentMethod: PaymentMethod.CASH_AT_PICKUP,
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.IN_TRANSIT,
      riderId: rider2.id,
    },
    {
      trackingNumber: 'EXP-PN-1004',
      guestCustomerName: 'Julie Bitemo',
      guestCustomerPhone: '+242067778899',
      pickupAddress: 'Avenue de la Paix, Pointe-Noire',
      pickupLat: -4.7750,
      pickupLng: 11.8650,
      dropoffAddress: 'Quartier Mpaka',
      dropoffLat: -4.8200,
      dropoffLng: 11.9050,
      recipientName: 'Cyrille',
      recipientPhone: '+242058887766',
      packageDescription: 'Plat de nourriture (Traiteur)',
      amount: 2000,
      paymentMethod: PaymentMethod.CASH_AT_PICKUP,
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.PENDING,
    },
    {
      trackingNumber: 'EXP-PN-1005',
      customerId: createdCustomers[2].id,
      pickupAddress: 'Brazzaville, Poto-Poto',
      pickupLat: -4.2630,
      pickupLng: 15.2830,
      dropoffAddress: 'Brazzaville, Bacongo',
      dropoffLat: -4.2850,
      dropoffLng: 15.2550,
      recipientName: 'Franck',
      recipientPhone: '+242065554433',
      packageDescription: 'Vêtements (Commande Facebook)',
      amount: 3000,
      paymentMethod: PaymentMethod.ONLINE,
      paymentStatus: PaymentStatus.FAILED,
      status: OrderStatus.CANCELLED,
      cancelReason: 'Client injoignable',
    },
    {
      trackingNumber: 'EXP-PN-1006',
      customerId: createdCustomers[0].id,
      pickupAddress: 'Grand Marché, Pointe-Noire',
      pickupLat: -4.7850,
      pickupLng: 11.8550,
      dropoffAddress: 'Siafoumou, Villa 12',
      dropoffLat: -4.7200,
      dropoffLng: 11.8900,
      recipientName: 'Mme Mpika',
      recipientPhone: '+242061239988',
      packageDescription: 'Bijoux fantaisie',
      amount: 1500,
      paymentMethod: PaymentMethod.CASH_AT_PICKUP,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.DELIVERED,
      riderId: rider1.id,
    },
    {
      trackingNumber: 'EXP-PN-1007',
      customerId: createdCustomers[4].id,
      pickupAddress: 'Loandjili, Chez Marie',
      pickupLat: -4.7430,
      pickupLng: 11.8680,
      dropoffAddress: 'Centre-ville, Air France',
      dropoffLat: -4.7700,
      dropoffLng: 11.8500,
      recipientName: 'Kévin',
      recipientPhone: '+242051234567',
      packageDescription: 'Clés oubliées',
      amount: 1000,
      paymentMethod: PaymentMethod.CASH_AT_PICKUP,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.DELIVERED,
      riderId: rider2.id,
    },
    {
      trackingNumber: 'EXP-PN-1008',
      customerId: createdCustomers[1].id,
      pickupAddress: 'Zone Industrielle, Pointe-Noire',
      pickupLat: -4.8050,
      pickupLng: 11.8350,
      dropoffAddress: 'Mongo-Mpoukou, École Inter-États',
      dropoffLat: -4.7550,
      dropoffLng: 11.8900,
      recipientName: 'Secrétariat',
      recipientPhone: '+242056667788',
      packageDescription: 'Ramettes de papier',
      amount: 5000,
      paymentMethod: PaymentMethod.ONLINE,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.DELIVERED,
      riderId: rider1.id,
    },
    {
      trackingNumber: 'EXP-PN-1009',
      customerId: createdCustomers[2].id,
      pickupAddress: 'Brazzaville, Moungali',
      pickupLat: -4.2500,
      pickupLng: 15.2700,
      dropoffAddress: 'Brazzaville, Ouenzé',
      dropoffLat: -4.2400,
      dropoffLng: 15.2900,
      recipientName: 'Bertrand',
      recipientPhone: '+242068889900',
      packageDescription: 'Chaussures sport',
      amount: 2500,
      paymentMethod: PaymentMethod.CASH_AT_PICKUP,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.DELIVERED,
      riderId: rider2.id,
    },
    {
      trackingNumber: 'EXP-PN-1010',
      guestCustomerName: 'Davy',
      guestCustomerPhone: '+242054445566',
      pickupAddress: 'Pointe-Noire, Côte Sauvage',
      pickupLat: -4.8100,
      pickupLng: 11.8200,
      dropoffAddress: 'Tié-Tié, Marché',
      dropoffLat: -4.7930,
      dropoffLng: 11.8840,
      recipientName: 'Maman Rose',
      recipientPhone: '+242065556677',
      packageDescription: 'Poisson frais',
      amount: 4500,
      paymentMethod: PaymentMethod.CASH_AT_PICKUP,
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.ACCEPTED,
      riderId: rider1.id,
    },
    {
      trackingNumber: 'EXP-PN-1011',
      customerId: createdCustomers[3].id,
      pickupAddress: 'Mongo-Mpoukou',
      pickupLat: -4.7550,
      pickupLng: 11.8900,
      dropoffAddress: 'Loandjili',
      dropoffLat: -4.7430,
      dropoffLng: 11.8680,
      recipientName: 'Sylvie',
      recipientPhone: '+242061112244',
      packageDescription: 'Documents',
      amount: 1500,
      paymentMethod: PaymentMethod.CASH_AT_PICKUP,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.DELIVERED,
      riderId: rider2.id,
    },
    {
      trackingNumber: 'EXP-PN-1012',
      customerId: createdCustomers[0].id,
      pickupAddress: 'Grand Marché',
      pickupLat: -4.7850,
      pickupLng: 11.8550,
      dropoffAddress: 'Centre-ville',
      dropoffLat: -4.7790,
      dropoffLng: 11.8590,
      recipientName: 'Paul',
      recipientPhone: '+242068887755',
      packageDescription: 'Cosmétiques',
      amount: 1000,
      paymentMethod: PaymentMethod.CASH_AT_PICKUP,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.DELIVERED,
      riderId: rider1.id,
    },
    {
      trackingNumber: 'EXP-PN-1013',
      customerId: createdCustomers[1].id,
      pickupAddress: 'Zone Industrielle',
      pickupLat: -4.8050,
      pickupLng: 11.8350,
      dropoffAddress: 'Tié-Tié',
      dropoffLat: -4.7930,
      dropoffLng: 11.8840,
      recipientName: 'Jean',
      recipientPhone: '+242054443322',
      packageDescription: 'Pièces détachées',
      amount: 6000,
      paymentMethod: PaymentMethod.ONLINE,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.DELIVERED,
      riderId: rider1.id,
    },
    {
      trackingNumber: 'EXP-PN-1014',
      guestCustomerName: 'Rodrigue',
      guestCustomerPhone: '+242065554422',
      pickupAddress: 'L\'OCH',
      pickupLat: -4.7700,
      pickupLng: 11.8700,
      dropoffAddress: 'Fond Tié-Tié',
      dropoffLat: -4.8000,
      dropoffLng: 11.8900,
      recipientName: 'Arlette',
      recipientPhone: '+242068887744',
      packageDescription: 'Gâteau d\'anniversaire',
      amount: 3000,
      paymentMethod: PaymentMethod.CASH_AT_PICKUP,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.DELIVERED,
      riderId: rider2.id,
    },
    {
      trackingNumber: 'EXP-PN-1015',
      customerId: createdCustomers[4].id,
      pickupAddress: 'Loandjili',
      pickupLat: -4.7430,
      pickupLng: 11.8680,
      dropoffAddress: 'Mongo-Mpoukou',
      dropoffLat: -4.7550,
      dropoffLng: 11.8900,
      recipientName: 'M. Tchicaya',
      recipientPhone: '+242051112233',
      packageDescription: 'Petit colis',
      amount: 1500,
      paymentMethod: PaymentMethod.CASH_AT_PICKUP,
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.EN_ROUTE_TO_PICKUP,
      riderId: rider1.id,
    },
  ];

  for (const o of orderData) {
    const order = await prisma.order.create({
      data: {
        ...o,
        statusHistory: {
          create: [
            { status: OrderStatus.PENDING, note: 'Commande créée' },
            ...(o.riderId ? [{ status: OrderStatus.ASSIGNED, note: 'Livreur assigné' }] : []),
            ...(o.status === OrderStatus.IN_TRANSIT ? [{ status: OrderStatus.PICKED_UP, note: 'Colis récupéré' }] : []),
            ...(o.status === OrderStatus.DELIVERED ? [
              { status: OrderStatus.PICKED_UP, note: 'Colis récupéré' },
              { status: OrderStatus.DELIVERED, note: 'Livré avec succès' }
            ] : []),
            ...(o.status === OrderStatus.CANCELLED ? [{ status: OrderStatus.CANCELLED, note: o.cancelReason }] : []),
          ]
        },
        otpCodes: {
          create: [
            { type: OtpType.PICKUP, code: '123456', expiresAt: new Date(Date.now() + 3600000), verified: o.status !== OrderStatus.PENDING },
            { type: OtpType.DROPOFF, code: '654321', expiresAt: new Date(Date.now() + 3600000), verified: o.status === OrderStatus.DELIVERED }
          ]
        }
      }
    });

    // --- ALERTS ---
    if (o.status === OrderStatus.CANCELLED) {
      await prisma.alert.create({
        data: {
          type: AlertType.PAYMENT,
          title: 'Échec de paiement',
          description: `La commande ${o.trackingNumber} a échoué suite à un problème de paiement.`,
          orderId: order.id,
          resolved: true,
          resolvedAt: new Date(),
        }
      });
    }
  }

  // --- GPS PINGS ---
  await prisma.gpsPing.createMany({
    data: [
      { riderId: rider2.id, lat: -4.7550, lng: 11.8900, speed: 25, heading: 180 },
      { riderId: rider2.id, lat: -4.7650, lng: 11.8880, speed: 30, heading: 175 },
      { riderId: rider2.id, lat: -4.7750, lng: 11.8860, speed: 20, heading: 185 },
    ]
  });

  // --- MORE ALERTS ---
  await prisma.alert.create({
    data: {
      type: AlertType.STALL,
      title: 'Livreur immobile',
      description: 'Arnaud Mavoungou est immobile depuis plus de 15 minutes au Centre-ville.',
      riderId: rider1.id,
    }
  });

  await prisma.alert.create({
    data: {
      type: AlertType.DEVIATION,
      title: 'Déviation de trajet',
      description: 'Brice Makosso s\'éloigne de la route prévue pour la livraison EXP-PN-1003.',
      riderId: rider2.id,
      orderId: (await prisma.order.findUnique({ where: { trackingNumber: 'EXP-PN-1003' } }))?.id,
    }
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
