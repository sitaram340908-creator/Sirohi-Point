/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Sirohi API (e2e)', () => {
  let app: INestApplication<App>;
  const previous = {
    databaseUrl: process.env.DATABASE_URL,
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
    tokenSecret: process.env.AUTH_TOKEN_SECRET,
  };

  beforeAll(() => {
    process.env.DATABASE_URL = '';
    process.env.ADMIN_EMAIL = 'admin@sirohipoint.local';
    process.env.ADMIN_PASSWORD = 'SirohiAdmin#2026';
    process.env.AUTH_TOKEN_SECRET =
      'test-only-token-secret-with-more-than-32-characters';
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });

  it('serves health status', () =>
    request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((response) => {
        expect(response.body.data.status).toBe('ok');
        expect(response.body.data.service).toBe('sirohi-api');
      }));

  it('enforces roles and supports the complete customer/admin flow', async () => {
    const customer = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Customer',
        email: 'customer@example.com',
        password: 'Customer#2026',
        customerLocation: 'Hapur',
      })
      .expect(201);
    const customerToken = customer.body.data.token as string;
    expect(customer.body.data.user.role).toBe('CUSTOMER');
    expect(customer.body.data.user.customerLocation).toBe('Hapur');

    await request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    const admin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@sirohipoint.local', password: 'SirohiAdmin#2026' })
      .expect(201);
    const adminToken = admin.body.data.token as string;
    expect(admin.body.data.user.role).toBe('SUPER_ADMIN');
    expect(admin.body.data.user.passwordHash).toBeUndefined();

    const product = await request(app.getHttpServer())
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Industrial Drill',
        category: 'Hardware',
        brand: 'Sirohi Test',
        description: 'Test product for protected catalogue flow.',
        priceInPaise: 129900,
        stock: 12,
        tone: '#1769FF',
        serviceAvailable: false,
        active: true,
      })
      .expect(201);
    const productId = product.body.data.id as string;

    const catalog = await request(app.getHttpServer())
      .get('/api/v1/catalog')
      .expect(200);
    expect(
      catalog.body.data.some((item: { id: string }) => item.id === productId),
    ).toBe(true);

    const order = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        deliveryAddress: '123 Test Road, Hapur, Uttar Pradesh 245205',
        paymentMethod: 'COD',
        items: [{ productId, quantity: 2 }],
      })
      .expect(201);
    expect(order.body.data.itemCount).toBe(2);
    expect(order.body.data.totalInPaise).toBe(259800);

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const updatedCatalog = await request(app.getHttpServer())
      .get('/api/v1/catalog')
      .expect(200);
    expect(
      updatedCatalog.body.data.some(
        (item: { id: string }) => item.id === productId,
      ),
    ).toBe(false);

    const users = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const customerRecord = users.body.data.find(
      (item: { email: string }) => item.email === 'customer@example.com',
    );
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/users/${customerRecord.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
  afterAll(() => {
    if (previous.databaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous.databaseUrl;
    if (previous.adminEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previous.adminEmail;
    if (previous.adminPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previous.adminPassword;
    if (previous.tokenSecret === undefined)
      delete process.env.AUTH_TOKEN_SECRET;
    else process.env.AUTH_TOKEN_SECRET = previous.tokenSecret;
  });
});
