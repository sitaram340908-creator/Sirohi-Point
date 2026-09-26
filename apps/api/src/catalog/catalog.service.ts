import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AdminProduct,
  AdminProductInput,
  CatalogQuery,
  Product,
} from '../shared/contracts';

import { PrismaService } from '../prisma/prisma.service';
import { fallbackCatalog } from './catalog.data';

type CatalogSegment = 'B2C' | 'B2B';

function getCompareAtPriceFromSpecifications(specifications: unknown, priceInPaise: number) {
  if (!specifications || typeof specifications !== 'object') return undefined;
  const label = (specifications as Record<string, unknown>).sourceDiscountLabel;
  if (typeof label !== 'string') return undefined;
  const match = label.match(/(\d+(?:\.\d+)?)\s*%/);
  const discountPercent = match ? Number(match[1]) : 0;
  if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent >= 100) return undefined;
  return Math.round(priceInPaise / (1 - discountPercent / 100));
}

const categoryIdsByLegacyName: Record<string, string> = {
  Hardware: '00000000-0000-4000-8000-000000001001',
  Electrical: '00000000-0000-4000-8000-000000001002',
  Electronics: '00000000-0000-4000-8000-000000001003',
  Paint: '00000000-0000-4000-8000-000000001004',
  Plumbing: '00000000-0000-4000-8000-000000001005',
  'PVC & Plumbing': '00000000-0000-4000-8000-000000001005',
  Sanitary: '00000000-0000-4000-8000-000000001006',
  Others: '00000000-0000-4000-8000-000000001007',
};
const fallbackHsnCodeByCategory: Record<string, string> = { Hardware: '7318', Electrical: '8536', Electronics: '8509', Paint: '3209', 'PVC PIPE': '3917', 'PVC & Plumbing': '3917', Sanitary: '6910', Others: '3926' };

const fallbackCategories = [
  {
    id: categoryIdsByLegacyName.Hardware,
    name: 'Hardware',
    slug: 'hardware',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000002001', name: 'Machines', slug: 'machines' },
      { id: '00000000-0000-4000-8000-000000002002', name: 'Nut Bolts', slug: 'nut-bolts' },
    ],
  },
  {
    id: categoryIdsByLegacyName.Electrical,
    name: 'Electrical',
    slug: 'electrical',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000002003', name: 'Bulb', slug: 'bulb' },
      { id: '00000000-0000-4000-8000-000000002004', name: 'Regulator', slug: 'regulator' },
      { id: '00000000-0000-4000-8000-000000002005', name: 'Socket', slug: 'socket' },
      { id: '00000000-0000-4000-8000-000000002006', name: 'Switch', slug: 'switch' },
      { id: '00000000-0000-4000-8000-000000002007', name: 'Wire', slug: 'wire' },
    ],
  },
  {
    id: categoryIdsByLegacyName.Electronics,
    name: 'Electronics',
    slug: 'electronics',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000002008', name: 'Iron', slug: 'iron' },
      { id: '00000000-0000-4000-8000-000000002009', name: 'Juicer', slug: 'juicer' },
    ],
  },
  {
    id: categoryIdsByLegacyName.Paint,
    name: 'Paint',
    slug: 'paint',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000002010', name: 'Brush', slug: 'brush' },
      { id: '00000000-0000-4000-8000-000000002011', name: 'MTO', slug: 'mto' },
      { id: '00000000-0000-4000-8000-000000002012', name: 'Paint', slug: 'paint' },
      { id: '00000000-0000-4000-8000-000000002013', name: 'Primer', slug: 'primer' },
      { id: '00000000-0000-4000-8000-000000002014', name: 'Wall Paint', slug: 'wall-paint' },
      { id: '00000000-0000-4000-8000-000000002015', name: 'Wall Putty', slug: 'wall-putty' },
    ],
  },
  {
    id: categoryIdsByLegacyName.Plumbing,
    name: 'PVC PIPE',
    slug: 'plumbing',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000002016', name: 'Pvc Fitting', slug: 'pvc-fitting' },
      { id: '00000000-0000-4000-8000-000000002017', name: 'PVC Pipe', slug: 'pvc-pipe' },
      { id: '00000000-0000-4000-8000-000000002018', name: 'Upvc Fitting', slug: 'upvc-fitting' },
      { id: '00000000-0000-4000-8000-000000002019', name: 'Upvc Pipes', slug: 'upvc-pipes' },
      { id: '00000000-0000-4000-8000-000000002020', name: 'Fixtures and Appliances', slug: 'fixtures-and-appliances' },
      { id: '00000000-0000-4000-8000-000000002021', name: 'Valves and Controls', slug: 'valves-and-controls' },
      { id: '00000000-0000-4000-8000-000000002022', name: 'Fittings and Connectors', slug: 'fittings-and-connectors' },
    ],
  },
  {
    id: categoryIdsByLegacyName.Sanitary,
    name: 'Sanitary',
    slug: 'sanitary',
    subcategories: [
      { id: '00000000-0000-4000-8000-000000002023', name: 'English Toilet Seat', slug: 'english-toilet-seat' },
      { id: '00000000-0000-4000-8000-000000002024', name: 'Shower', slug: 'shower' },
      { id: '00000000-0000-4000-8000-000000002025', name: 'Tap', slug: 'tap' },
      { id: '00000000-0000-4000-8000-000000002026', name: 'Toilet Seat Hindi', slug: 'toilet-seat-hindi' },
      { id: '00000000-0000-4000-8000-000000002027', name: 'Wash Basin', slug: 'wash-basin' },
    ],
  },
  { id: categoryIdsByLegacyName.Others, name: 'Others', slug: 'others', subcategories: [] },
];

const fallbackSubcategorySlugById: Record<string, string> = Object.fromEntries(
  fallbackCategories.flatMap((category) => category.subcategories.map((subcategory) => [subcategory.id, subcategory.slug])),
);

const subcategorySlugByProductId: Record<string, string> = {
  'sanitary-basin-mixer': 'tap',
  'electrical-modular-switch': 'switch',
  'pvc-elbow': 'pvc-fitting',
  'paint-interior-emulsion': 'paint',
  'hardware-pata-bolt': 'nut-bolts',
  'electrical-copper-wire': 'wire',
  'paint-wall-primer': 'primer',
};

const fallbackSubcategoryIdBySlug = Object.fromEntries(
  Object.entries(fallbackSubcategorySlugById).map(([id, slug]) => [slug, id]),
);

const fallbackSubcategorySlugs = Object.values(fallbackSubcategorySlugById).sort((a, b) => b.length - a.length);

function inferFallbackSubcategorySlug(product: Product) {
  return subcategorySlugByProductId[product.id]
    ?? fallbackSubcategorySlugs.find((slug) => product.slug.toLowerCase().includes(slug));
}

@Injectable()
export class CatalogService {
  private readonly memoryProducts: AdminProduct[] = fallbackCatalog.map(
    (product) => ({
      ...product,
      b2cPriceInPaise: product.b2cPriceInPaise ?? product.priceInPaise,
      categoryId: categoryIdsByLegacyName[product.category] ?? categoryIdsByLegacyName.Others,
      hsnCode: fallbackHsnCodeByCategory[product.category] ?? '3926',
      ...(inferFallbackSubcategorySlug(product)
        ? { subcategoryId: fallbackSubcategoryIdBySlug[inferFallbackSubcategorySlug(product)!] }
        : {}),
      minimumB2BQuantity: product.minimumB2BQuantity ?? 1,
      allowB2BBackorder: product.allowB2BBackorder ?? false,
      codAvailable: product.codAvailable ?? true,
      active: true,
    }),
  );

  constructor(private readonly prisma: PrismaService) {}

  async findCategories() {
    if (!process.env.DATABASE_URL) return fallbackCategories;
    try {
      const categories = await this.prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          subcategories: {
            select: { id: true, name: true, slug: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });

      // Keep the catalog usable while an existing database is being brought up
      // to date or has categories seeded before their subcategories. Once real
      // rows exist, they remain the source of truth.
      return categories.map((category) => {
        if (category.subcategories.length) return category;
        const fallback = fallbackCategories.find((item) => item.slug === category.slug);
        return fallback ? { ...category, subcategories: fallback.subcategories } : category;
      });
    } catch {
      // A missing/out-of-date taxonomy table should not make the filter render
      // with empty data; use the same seeded taxonomy as the no-DB demo mode.
      return fallbackCategories;
    }
  }

  async findAll(query: CatalogQuery): Promise<Product[]> {
    return this.findAllForSegment(query, 'B2C');
  }

  async findAllForSegment(query: CatalogQuery, segment: CatalogSegment, priceVisible = true): Promise<Product[]> {
    const subcategoryIds = await this.resolveSubcategoryIds(query.subcategoryIds);
    if (subcategoryIds === null) return [];
    await this.validateSubcategoryFilter(query.categoryIds, subcategoryIds);
    let products = (await this.readAdminCatalog())
      .filter((product) => product.active)
      .filter((product) => !query.categoryIds?.length || query.categoryIds.includes(product.categoryId ?? ''))
      .filter((product) => !subcategoryIds?.length || subcategoryIds.includes(product.subcategoryId ?? ''))
      .map((product) => this.toPublicProduct(product, segment, priceVisible));
    const search = query.search?.toLowerCase();
    if (query.category) products = products.filter((product) => product.category === query.category);
    if (search) {
      products = products.filter((product) =>
        `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(search),
      );
    }
    if (query.inStock === 'true') products = products.filter((product) => product.stock >= (segment === 'B2B' ? product.minimumB2BQuantity ?? 1 : 1));
    if (query.sort === 'price-asc') products.sort((a, b) => a.priceInPaise - b.priceInPaise);
    if (query.sort === 'price-desc') products.sort((a, b) => b.priceInPaise - a.priceInPaise);
    return products.slice(query.offset ?? 0, (query.offset ?? 0) + query.limit);
  }

  async findOne(id: string): Promise<Product> {
    return this.findOneForSegment(id, 'B2C');
  }

  async findOneForSegment(id: string, segment: CatalogSegment, priceVisible = true): Promise<Product> {
    const product = (await this.readAdminCatalog()).find(
      (item) => item.id === id && item.active,
    );
    if (!product) throw new NotFoundException(`Product ${id} was not found`);
    return this.toPublicProduct(product, segment, priceVisible);
  }

  async findAllAdmin(): Promise<AdminProduct[]> {
    return this.readAdminCatalog();
  }

  async create(input: AdminProductInput): Promise<AdminProduct> {
    const b2cPriceInPaise = input.b2cPriceInPaise ?? input.priceInPaise!;
    const slug = this.slugify(input.name);
    const id = `${slug}-${randomUUID().slice(0, 8)}`;
    if (!process.env.DATABASE_URL) {
      const product: AdminProduct = {
        id,
        slug,
        name: input.name,
        category: input.category,
        categoryId: input.categoryId ?? categoryIdsByLegacyName[input.category] ?? categoryIdsByLegacyName.Others,
        ...(input.hsnId ? { hsnId: input.hsnId } : {}),
        ...(input.subcategoryId ? { subcategoryId: input.subcategoryId } : {}),
        brand: input.brand,
        description: input.description,
        priceInPaise: b2cPriceInPaise,
        b2cPriceInPaise,
        deliveryChargeInPaise: input.deliveryChargeInPaise ?? 5000,
        gstRate: input.gstRate ?? 18,
        ...(input.b2bPriceInPaise !== undefined ? { b2bPriceInPaise: input.b2bPriceInPaise } : {}),
        minimumB2BQuantity: input.minimumB2BQuantity ?? 1,
        allowB2BBackorder: input.allowB2BBackorder ?? false,
        codAvailable: input.codAvailable ?? true,
        ...(input.specifications ? { specifications: input.specifications } : {}),
        ...(input.compareAtPriceInPaise ? { compareAtPriceInPaise: input.compareAtPriceInPaise } : {}),
        rating: 0,
        reviewCount: 0,
        stock: input.stock,
        ...(input.badge ? { badge: input.badge } : {}),
        tone: input.tone,
        serviceAvailable: input.serviceAvailable,
        active: input.active,
        ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
      };
      this.memoryProducts.unshift(product);
      return product;
    }

    const categoryId = await this.resolveCategoryId(input);
    await this.validateSubcategoryForCategory(input.subcategoryId, categoryId);
    const record = await this.prisma.product.create({
      data: {
        id,
        slug,
        name: input.name,
        category: { connect: { id: categoryId } },
        ...(input.hsnId ? { hsn: { connect: { id: input.hsnId } } } : {}),
        ...(input.subcategoryId ? { subcategory: { connect: { id: input.subcategoryId } } } : {}),
        brand: input.brand,
        description: input.description,
        priceInPaise: b2cPriceInPaise,
        b2cPriceInPaise,
        deliveryChargeInPaise: input.deliveryChargeInPaise ?? 5000,
        gstRate: input.gstRate ?? 18,
        b2bPriceInPaise: input.b2bPriceInPaise,
        minimumB2BQuantity: input.minimumB2BQuantity ?? 1,
        allowB2BBackorder: input.allowB2BBackorder ?? false,
        codAvailable: input.codAvailable ?? true,
        specifications: input.specifications,
        compareAtPriceInPaise: input.compareAtPriceInPaise,
        badge: input.badge,
        tone: input.tone,
        serviceAvailable: input.serviceAvailable,
        active: input.active,
        imageUrl: input.imageUrl,
        inventory: { create: { onHand: input.stock, reserved: 0, available: input.stock } },
      },
      include: { inventory: true, category: true, subcategory: true, hsn: true },
    });
    return this.mapRecord(record);
  }

  async update(id: string, input: AdminProductInput): Promise<AdminProduct> {
    if (!process.env.DATABASE_URL) {
      const index = this.memoryProducts.findIndex((product) => product.id === id);
      if (index < 0) throw new NotFoundException(`Product ${id} was not found`);
      const existing = this.memoryProducts[index];
      const b2cPriceInPaise = input.b2cPriceInPaise ?? input.priceInPaise ?? existing.b2cPriceInPaise ?? existing.priceInPaise;
      const product: AdminProduct = {
        ...existing,
        ...input,
        categoryId: input.categoryId ?? existing.categoryId,
        priceInPaise: b2cPriceInPaise,
        b2cPriceInPaise,
        deliveryChargeInPaise: input.deliveryChargeInPaise ?? existing.deliveryChargeInPaise ?? 5000,
        gstRate: input.gstRate ?? existing.gstRate ?? 18,
        minimumB2BQuantity: input.minimumB2BQuantity ?? existing.minimumB2BQuantity ?? 1,
        allowB2BBackorder: input.allowB2BBackorder ?? existing.allowB2BBackorder ?? false,
        codAvailable: input.codAvailable ?? existing.codAvailable ?? true,
      };
      if (!input.compareAtPriceInPaise) delete product.compareAtPriceInPaise;
      if (!input.badge) delete product.badge;
      if (!input.imageUrl) delete product.imageUrl;
      this.memoryProducts[index] = product;
      return product;
    }

    const b2cPriceInPaise = input.b2cPriceInPaise ?? input.priceInPaise!;
    const record = await this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({ where: { productId: id } });
      const categoryId = await this.resolveCategoryId(input, tx);
      await this.validateSubcategoryForCategory(input.subcategoryId, categoryId, tx);
      return tx.product.update({
      where: { id },
      data: {
        name: input.name,
        category: { connect: { id: categoryId } },
        ...(input.hsnId ? { hsn: { connect: { id: input.hsnId } } } : { hsn: { disconnect: true } }),
        ...(input.subcategoryId ? { subcategory: { connect: { id: input.subcategoryId } } } : {}),
        brand: input.brand,
        description: input.description,
        priceInPaise: b2cPriceInPaise,
        b2cPriceInPaise,
        deliveryChargeInPaise: input.deliveryChargeInPaise ?? 5000,
        gstRate: input.gstRate ?? 18,
        b2bPriceInPaise: input.b2bPriceInPaise,
        minimumB2BQuantity: input.minimumB2BQuantity ?? 1,
        allowB2BBackorder: input.allowB2BBackorder ?? false,
        codAvailable: input.codAvailable ?? true,
        specifications: input.specifications,
        compareAtPriceInPaise: input.compareAtPriceInPaise,
        badge: input.badge,
        tone: input.tone,
        serviceAvailable: input.serviceAvailable,
        active: input.active,
        imageUrl: input.imageUrl,
        inventory: {
          upsert: {
            create: { onHand: input.stock, reserved: 0, available: input.stock },
            update: { onHand: input.stock + (inventory?.reserved ?? 0), available: input.stock },
          },
        },
      },
      include: { inventory: true, category: true, subcategory: true, hsn: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.mapRecord(record);
  }

  async remove(id: string): Promise<AdminProduct> {
    if (!process.env.DATABASE_URL) {
      const product = this.memoryProducts.find((item) => item.id === id);
      if (!product) throw new NotFoundException(`Product ${id} was not found`);
      product.active = false;
      return product;
    }
    const record = await this.prisma.product.update({ where: { id }, data: { active: false }, include: { inventory: true, category: true, subcategory: true, hsn: true } });
    return this.mapRecord(record);
  }

  private async readAdminCatalog(): Promise<AdminProduct[]> {
    if (!process.env.DATABASE_URL) return this.memoryProducts;
    try {
    const records = await this.prisma.product.findMany({ include: { inventory: true, category: true, subcategory: true, hsn: true }, orderBy: { updatedAt: 'desc' } });
      const products = records.map((record) => this.mapRecord(record));
      return products.some((product) => product.active) ? products : this.memoryProducts;
    } catch {
      return this.memoryProducts;
    }
  }

  private mapRecord(record: {
    id: string;
    name: string;
    slug: string;
    category: { name: string };
    categoryId: string;
    hsnId: string | null;
    hsn: { code: string; igstRate: number } | null;
    gstRate: number;
    subcategoryId: string | null;
    brand: string;
    description: string;
    priceInPaise: number;
    b2cPriceInPaise: number;
    b2bPriceInPaise: number | null;
    deliveryChargeInPaise: number;
    minimumB2BQuantity: number;
    allowB2BBackorder: boolean;
    codAvailable: boolean;
    specifications: unknown;
    compareAtPriceInPaise: number | null;
    rating: number;
    reviewCount: number;
    badge: string | null;
    tone: string;
    serviceAvailable: boolean;
    imageUrl: string | null;
    active: boolean;
    inventory: { available: number } | null;
  }): AdminProduct {
    const specifications = record.specifications;
    const configuredCompareAtPrice = record.compareAtPriceInPaise && record.compareAtPriceInPaise > record.b2cPriceInPaise
      ? record.compareAtPriceInPaise
      : undefined;
    const sourceCompareAtPrice = getCompareAtPriceFromSpecifications(specifications, record.b2cPriceInPaise);
    const compareAtPriceInPaise = configuredCompareAtPrice ?? sourceCompareAtPrice;
    return {
      id: record.id,
      name: record.name,
      slug: record.slug,
      category: record.category.name as Product['category'],
      categoryId: record.categoryId,
      ...(record.hsnId && record.hsn ? { hsnId: record.hsnId, hsnCode: record.hsn.code, gstRate: record.hsn.igstRate } : {}),
      gstRate: record.gstRate ?? record.hsn?.igstRate ?? 18,
      ...(record.subcategoryId ? { subcategoryId: record.subcategoryId } : {}),
      brand: record.brand,
      description: record.description,
      priceInPaise: record.b2cPriceInPaise,
      b2cPriceInPaise: record.b2cPriceInPaise,
      ...(record.b2bPriceInPaise !== null ? { b2bPriceInPaise: record.b2bPriceInPaise } : {}),
      deliveryChargeInPaise: record.deliveryChargeInPaise ?? 5000,
      minimumB2BQuantity: record.minimumB2BQuantity,
      allowB2BBackorder: record.allowB2BBackorder,
      codAvailable: record.codAvailable,
      ...(specifications && typeof specifications === 'object' ? { specifications: specifications as Record<string, string | number | boolean> } : {}),
      ...(compareAtPriceInPaise ? { compareAtPriceInPaise } : {}),
      rating: record.rating,
      reviewCount: record.reviewCount,
      stock: record.inventory?.available ?? 0,
      ...(record.badge ? { badge: record.badge } : {}),
      tone: record.tone,
      serviceAvailable: record.serviceAvailable,
      active: record.active,
      ...(record.imageUrl ? { imageUrl: record.imageUrl } : {}),
    };
  }

  private toPublicProduct(product: AdminProduct, segment: CatalogSegment, priceVisible = true): Product {
    const publicProduct: Partial<AdminProduct> = { ...product };
    delete publicProduct.active;
    publicProduct.priceInPaise = segment === 'B2B'
      ? product.b2bPriceInPaise ?? product.b2cPriceInPaise ?? product.priceInPaise
      : product.b2cPriceInPaise ?? product.priceInPaise;
    if (segment === 'B2C') {
      delete publicProduct.b2bPriceInPaise;
      delete publicProduct.minimumB2BQuantity;
      delete publicProduct.allowB2BBackorder;
    }
    if (!priceVisible) {
      publicProduct.priceInPaise = 0;
      delete publicProduct.b2cPriceInPaise;
      delete publicProduct.b2bPriceInPaise;
      delete publicProduct.compareAtPriceInPaise;
    }
    (publicProduct as Product).priceVisible = priceVisible;
    return publicProduct as Product;
  }

  private slugify(name: string) {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product';
  }

  private async resolveCategoryId(
    input: AdminProductInput,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const slug = this.slugify(input.category === 'PVC & Plumbing' ? 'Plumbing' : input.category);
    if (input.categoryId) {
      const category = await client.category.findUnique({ where: { id: input.categoryId }, select: { slug: true } });
      if (!category || category.slug !== slug) {
        throw new BadRequestException('The selected category does not match the category ID');
      }
      return input.categoryId;
    }
    const category = await client.category.findUnique({ where: { slug }, select: { id: true } });
    if (!category) throw new BadRequestException(`Unknown category: ${input.category}`);
    return category.id;
  }

  private async validateSubcategoryForCategory(
    subcategoryId: string | undefined,
    categoryId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    if (!subcategoryId) return;
    const subcategory = await client.subcategory.findUnique({
      where: { id: subcategoryId },
      select: { categoryId: true },
    });
    if (!subcategory || subcategory.categoryId !== categoryId) {
      throw new BadRequestException('The selected subcategory must belong to the selected category');
    }
  }

  private async validateSubcategoryFilter(categoryIds?: string[], subcategoryIds?: string[]) {
    if (!categoryIds?.length || !subcategoryIds?.length || !process.env.DATABASE_URL) return;
    const ids = [...new Set(subcategoryIds)];
    const matching = await this.prisma.subcategory.findMany({
      where: { id: { in: ids }, categoryId: { in: categoryIds } },
      select: { id: true },
    });
    if (matching.length !== ids.length) {
      throw new BadRequestException('Each subcategoryId must belong to one of the supplied categoryIds');
    }
  }

  /**
   * The no-database fallback uses stable taxonomy IDs so the filter can render,
   * while seeded databases may have UUIDs generated for the same slugs. Resolve
   * those fallback IDs to the database IDs before filtering and validating.
   */
  private async resolveSubcategoryIds(subcategoryIds?: string[]): Promise<string[] | null | undefined> {
    if (!subcategoryIds?.length || !process.env.DATABASE_URL) return subcategoryIds;

    const ids = [...new Set(subcategoryIds)];
    const directRows = await this.prisma.subcategory.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const resolvedByInputId = new Map(directRows.map((row) => [row.id, row.id]));
    const missingIds = ids.filter((id) => !resolvedByInputId.has(id));
    if (!missingIds.length) return ids;

    const missingSlugs = missingIds
      .map((id) => fallbackSubcategorySlugById[id])
      .filter((slug): slug is string => Boolean(slug));
    if (missingSlugs.length !== missingIds.length) return null;

    const fallbackRows = await this.prisma.subcategory.findMany({
      where: { slug: { in: missingSlugs } },
      select: { id: true, slug: true },
    });
    const idBySlug = new Map(fallbackRows.map((row) => [row.slug, row.id]));
    if (missingSlugs.some((slug) => !idBySlug.has(slug))) return null;

    return ids.map((id) => resolvedByInputId.get(id) ?? idBySlug.get(fallbackSubcategorySlugById[id]!)!);
  }
}
