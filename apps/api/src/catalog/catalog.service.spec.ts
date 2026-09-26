import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;

  beforeAll(() => {
    delete process.env.DATABASE_URL;
  });

  afterAll(() => {
    if (previousDatabaseUrl) process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it('filters fallback products by category', async () => {
    const service = new CatalogService({} as never);
    const products = await service.findAll({ category: 'Paint', limit: 24 });
    expect(products).toHaveLength(2);
    expect(products.every((product) => product.category === 'Paint')).toBe(
      true,
    );
  });

  it('finds products by search text', async () => {
    const service = new CatalogService({} as never);
    const products = await service.findAll({ search: 'Havells', limit: 24 });
    expect(products.map((product) => product.id)).toEqual([
      'electronics-led-panel',
    ]);
  });
});
