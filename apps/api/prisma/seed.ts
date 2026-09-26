import { PlatformRole, PrismaClient } from '@prisma/client';

import { hashPassword } from '../src/auth/password';
import { sourceProductSeed } from './sirohipoint-products.seed';

const prisma = new PrismaClient();
const customerId = '00000000-0000-4000-8000-000000000001';
const vendorUserId = '00000000-0000-4000-8000-000000000002';
const vendorId = '00000000-0000-4000-8000-000000000010';
const adminId = '00000000-0000-4000-8000-000000000099';
const defaultHsnIdByCategory: Record<string, string> = {
  Hardware: '00000000-0000-4000-8000-000000002006', Electrical: '00000000-0000-4000-8000-000000002004', Electronics: '00000000-0000-4000-8000-000000002005', Paint: '00000000-0000-4000-8000-000000002003', 'PVC PIPE': '00000000-0000-4000-8000-000000002001', 'PVC & Plumbing': '00000000-0000-4000-8000-000000002001', Sanitary: '00000000-0000-4000-8000-000000002002', Others: '00000000-0000-4000-8000-000000002007',
};

const taxonomy = [
  { name: 'Hardware', slug: 'hardware', subcategories: ['Machines', 'Nut Bolts'] },
  { name: 'Electrical', slug: 'electrical', subcategories: ['Bulb', 'Regulator', 'Socket', 'Switch', 'Wire'] },
  { name: 'Electronics', slug: 'electronics', subcategories: ['Iron', 'Juicer'] },
  { name: 'Paint', slug: 'paint', subcategories: ['Brush', 'MTO', 'Paint', 'Primer', 'Wall Paint', 'Wall Putty'] },
  {
    name: 'PVC PIPE',
    slug: 'plumbing',
    subcategories: [
      'Pvc Fitting',
      'PVC Pipe',
      'Upvc Fitting',
      'Upvc Pipes',
      'Fixtures and Appliances',
      'Valves and Controls',
      'Fittings and Connectors',
    ],
  },
  { name: 'Sanitary', slug: 'sanitary', subcategories: ['English Toilet Seat', 'Shower', 'Tap', 'Toilet Seat Hindi', 'Wash Basin'] },
  { name: 'Others', slug: 'others', subcategories: [] },
] as const;

const categorySlugByLegacyName: Record<string, string> = {
  Hardware: 'hardware',
  Electrical: 'electrical',
  Electronics: 'electronics',
  Paint: 'paint',
  Plumbing: 'plumbing',
  'PVC PIPE': 'plumbing',
  'PVC & Plumbing': 'plumbing',
  Sanitary: 'sanitary',
};

const subcategorySlugByProductId: Record<string, string> = {
  'sanitary-basin-mixer': 'tap',
  'electrical-modular-switch': 'switch',
  'pvc-elbow': 'pvc-fitting',
  'paint-interior-emulsion': 'paint',
  'hardware-pata-bolt': 'nut-bolts',
  'electrical-copper-wire': 'wire',
  'paint-wall-primer': 'primer',
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function inferSubcategorySlug(product: (typeof sourceProductSeed)[number]) {
  const explicit = subcategorySlugByProductId[product.id];
  if (explicit) return explicit;
  const productText = `${product.name} ${product.slug}`.toLowerCase();
  const rules: Record<string, Array<[string, RegExp]>> = {
    Hardware: [
      ['machines', /\b(machine|machines|chaff cutter|atta chakki)\b/],
      ['nut-bolts', /\b(pata bolt|nut bolt|nut-bolt|bolt)\b/],
    ],
    Electrical: [
      ['wire', /\b(wire|conduct pipe|conduit|copper)\b/],
      ['bulb', /\b(bulb|led)\b/],
      ['switch', /\b(switch|swich|rocker)\b/],
      ['socket', /\b(socket|3 pin top|junction box|juction box)\b/],
      ['regulator', /\b(regulator)\b/],
    ],
    Electronics: [
      ['iron', /\b(iron|hair dryer|torch)\b/],
      ['juicer', /\b(juicer|mixer|atta chaki|chakki)\b/],
    ],
    Paint: [
      ['brush', /\b(brush)\b/],
      ['mto', /\b(mto)\b/],
      ['primer', /\b(primer)\b/],
      ['wall-putty', /\b(putty)\b/],
      ['wall-paint', /\b(wall paint)\b/],
      ['paint', /\b(paint|nerolac|berger|indigo)\b/],
    ],
    'PVC PIPE': [
      ['pvc-pipe', /\b(pipe|pipes|sch40|sch80|sdr)\b/],
      ['valves-and-controls', /\b(ball valve|ballvale|valve)\b/],
      ['fixtures-and-appliances', /\b(water tank|monoblock|water heater)\b/],
      ['pvc-fitting', /\b(coupler|socket|elbow|tee|union|reducer|fta|mta|end cap|nipple|bend|fitting|solvent|plug|trap)\b/],
    ],
    Sanitary: [
      ['english-toilet-seat', /\b(english|canva|backbone|nobel)\b.*\b(seat|toilet)\b/],
      ['toilet-seat-hindi', /\b(hindi|tolit)\b.*\b(seat|toilet)\b/],
      ['wash-basin', /\b(wash basin|sink)\b/],
      ['shower', /\b(shower)\b/],
      ['tap', /\b(tap|faucet|angle valve|angle vale|nipple)\b/],
    ],
  };
  const categoryRules = rules[product.category] ?? [];
  return categoryRules.find(([, pattern]) => pattern.test(productText))?.[0]
    ?? taxonomy
      .find((category) => category.name === product.category)
      ?.subcategories.map((name) => slugify(name))
      .sort((a, b) => b.length - a.length)
      .find((slug) => product.slug.toLowerCase().includes(slug));
}

async function seed() {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required when seeding');
  }

  await prisma.user.upsert({
    where: { id: customerId },
    update: {},
    create: {
      id: customerId,
      name: 'Sirohi Demo Customer',
      phone: '+919999900001',
      email: 'customer@sirohipoint.local',
      role: PlatformRole.CUSTOMER,
    },
  });
  await prisma.user.upsert({
    where: { id: vendorUserId },
    update: {},
    create: {
      id: vendorUserId,
      name: 'Sirohi Network Vendor',
      phone: '+919999900002',
      email: 'vendor@sirohipoint.local',
      role: PlatformRole.VENDOR,
    },
  });
  await prisma.user.upsert({
    where: { id: adminId },
    update: {
      name: 'Sirohi Point Admin',
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: PlatformRole.SUPER_ADMIN,
      active: true,
    },
    create: {
      id: adminId,
      name: 'Sirohi Point Admin',
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: PlatformRole.SUPER_ADMIN,
      active: true,
    },
  });

  await prisma.vendor.upsert({
    where: { id: vendorId },
    update: { verified: true },
    create: {
      id: vendorId,
      userId: vendorUserId,
      storeName: 'Sirohi Network',
      verified: true,
    },
  });

  const categoryIdBySlug = new Map<string, string>();
  for (const [categorySortOrder, taxonomyCategory] of taxonomy.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: taxonomyCategory.slug },
      update: { name: taxonomyCategory.name, sortOrder: categorySortOrder },
      create: {
        name: taxonomyCategory.name,
        slug: taxonomyCategory.slug,
        sortOrder: categorySortOrder,
      },
    });
    categoryIdBySlug.set(taxonomyCategory.slug, category.id);

    for (const [subcategorySortOrder, name] of taxonomyCategory.subcategories.entries()) {
      await prisma.subcategory.upsert({
        where: { categoryId_name: { categoryId: category.id, name } },
        update: { slug: slugify(name), sortOrder: subcategorySortOrder },
        create: {
          categoryId: category.id,
          name,
          slug: slugify(name),
          sortOrder: subcategorySortOrder,
        },
      });
    }
  }

  // Keep historical orders intact while removing the previous catalog from the active storefront.
  await prisma.product.updateMany({ data: { active: false } });

  for (const product of sourceProductSeed) {
    const { stock, imageUrl, category: legacyCategory, sourceUrl: _sourceUrl, ...record } = product;
    const categoryId = categoryIdBySlug.get(categorySlugByLegacyName[legacyCategory] ?? 'others');
    if (!categoryId) {
      throw new Error(`Missing seeded category for legacy category: ${legacyCategory}`);
    }
    const subcategorySlug = inferSubcategorySlug(product);
    const subcategory = subcategorySlug
      ? await prisma.subcategory.findFirst({
          where: { categoryId, slug: subcategorySlug },
          select: { id: true },
        })
      : null;
    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        ...record,
        categoryId,
        hsnId: defaultHsnIdByCategory[legacyCategory],
        ...(subcategory ? { subcategoryId: subcategory.id } : {}),
        imageUrl,
        vendorId,
        active: true,
        b2cPriceInPaise: product.priceInPaise,
        b2bPriceInPaise: Math.round(product.priceInPaise * 0.9),
        minimumB2BQuantity: 10,
        allowB2BBackorder: false,
        codAvailable: true,
      },
      create: {
        ...record,
        categoryId,
        hsnId: defaultHsnIdByCategory[legacyCategory],
        ...(subcategory ? { subcategoryId: subcategory.id } : {}),
        imageUrl,
        vendorId,
        active: true,
        b2cPriceInPaise: product.priceInPaise,
        b2bPriceInPaise: Math.round(product.priceInPaise * 0.9),
        minimumB2BQuantity: 10,
        allowB2BBackorder: false,
        codAvailable: true,
      },
    });
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: { onHand: stock, reserved: 0, available: stock },
      create: { productId: product.id, onHand: stock, reserved: 0, available: stock },
    });
  }

  const banners = [
    {
      id: '10000000-0000-4000-8000-000000000001',
      audience: 'B2C' as const,
      title: 'Hardware deals',
      badge: 'SITE ESSENTIALS',
      productId: 'sirohipoint-006',
      ctaLabel: 'Shop now',
      backgroundColor: '#0B1F33',
      sortOrder: 0,
    },
    {
      id: '10000000-0000-4000-8000-000000000002',
      audience: 'B2C' as const,
      title: 'Electrical essentials',
      badge: 'POPULAR',
      productId: 'sirohipoint-030',
      ctaLabel: 'View product',
      backgroundColor: '#123F75',
      sortOrder: 1,
    },
    {
      id: '10000000-0000-4000-8000-000000000003',
      audience: 'B2C' as const,
      title: 'Paint & finish',
      badge: 'PROJECT READY',
      productId: 'sirohipoint-186',
      ctaLabel: 'Shop paint',
      backgroundColor: '#26384B',
      sortOrder: 2,
    },
  ];

  for (const banner of banners) {
    await prisma.banner.upsert({
      where: { id: banner.id },
      update: { ...banner, active: true },
      create: { ...banner, active: true },
    });
  }
}

seed()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
