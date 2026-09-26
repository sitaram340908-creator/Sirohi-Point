import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { hashPassword } from '../src/auth/password';

// Opt-in integration suite: only a fresh, uniquely named schema on local PostgreSQL.
const databaseSuite = process.env.RUN_DATABASE_WORKFLOWS === '1' ? describe : describe.skip;
databaseSuite('Database-backed role workflows', () => {
  jest.setTimeout(120000);
  let app: INestApplication;
  let database: PrismaClient;
  let owner: PrismaClient;
  let schemaCreated = false;
  const schema = 'workflow_test_' + randomUUID().replace(/-/g, '');
  const originalUrl = process.env.DATABASE_URL;
  const password = 'WorkflowTestOnly#2026';
  let admin: string, customer: string, otherCustomer: string, business: string, technician: string;
  let customerId: string, profileId: string;
  const base = '/api/v1';
  const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, token?: string) => {
    const query = request(app.getHttpServer())[method](base + path);
    return token ? query.set('Authorization', 'Bearer ' + token) : query;
  };
  const account = (name: string) => ({ name, email: name.toLowerCase() + '@workflow.test', password });
  const customerAccount = (name: string) => ({ ...account(name), customerLocation: 'Hapur' });
  async function product(stock = 50, backorder = false) {
    const response = await call('post', '/admin/products', admin).send({ name: 'Workflow Product ' + randomUUID().slice(0, 8), brand: 'Workflow', category: 'Hardware', description: 'Isolated test product', b2cPriceInPaise: 10000, b2bPriceInPaise: 8000, minimumB2BQuantity: 10, stock, allowB2BBackorder: backorder }).expect(201);
    return response.body.data;
  }
  async function order(productId: string, quantity: number, token = customer) {
    return call('post', '/orders', token).send({ items: [{ productId, quantity }], deliveryAddress: '42 Test Street, Hapur 245205', paymentMethod: 'COD' });
  }
  async function login(name: string) { return call('post', '/auth/login').send({ email: account(name).email, password }); }
  beforeAll(async () => {
    if (!originalUrl) throw new Error('DATABASE_URL must be configured to run database workflows');
    const url = new URL(originalUrl);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Database workflow tests only run on a local PostgreSQL server');
    owner = new PrismaClient({ datasourceUrl: originalUrl });
    if (!/^workflow_test_[a-f0-9]{32}$/.test(schema)) throw new Error('Invalid isolated schema name');
    await owner.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
    schemaCreated = true;
    url.searchParams.set('schema', schema);
    process.env.DATABASE_URL = url.toString();
    execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema', resolve(__dirname, '../prisma/schema.prisma')], { env: process.env, stdio: 'pipe', timeout: 60000 });
    database = new PrismaClient({ datasourceUrl: url.toString() });
    await database.user.create({ data: { name: 'Admin', email: account('Admin').email, passwordHash: await hashPassword(password), role: 'SUPER_ADMIN' } });
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
    admin = (await login('Admin')).body.data.token;
    const first = await call('post', '/auth/register').send(customerAccount('Customer')).expect(201);
    customer = first.body.data.token; customerId = first.body.data.user.id;
    expect(first.body.data.user.customerLocation).toBe('Hapur');
    otherCustomer = (await call('post', '/auth/register').send(customerAccount('OtherCustomer')).expect(201)).body.data.token;
  });

  afterAll(async () => {
    await app?.close();
    await database?.$disconnect();
    // Only the exact schema created above is removed; never public or any existing schema.
    if (schemaCreated && /^workflow_test_[a-f0-9]{32}$/.test(schema)) await owner.$executeRawUnsafe('DROP SCHEMA "' + schema + '" CASCADE');
    await owner?.$disconnect();
    if (originalUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalUrl;
  });

  it('validates registration fields and enforces business/technician approval, rejection and reapproval', async () => {
    await call('post', '/auth/register').send({ name: 'X', email: 'invalid', password: 'short' }).expect(400);
    const signup = await call('post', '/auth/register-business').send({ ...account('Business'), businessName: 'Workflow Shop', gstin: 'WF-UNIQUE', billingAddress: '42 Business Road, Hapur' }).expect(201);
    await login('Business').then((r) => expect(r.status).toBe(403));
    await call('get', '/catalog/b2b', signup.body.data.token).expect(401);
    const businesses = (await call('get', '/admin/businesses', admin).expect(200)).body.data;
    const id = businesses.find((item: { email: string }) => item.email === account('Business').email).id;
    await call('patch', '/admin/businesses/' + id + '/reject', admin).expect(200);
    await login('Business').then((r) => expect(r.status).toBe(403));
    await call('patch', '/admin/businesses/' + id + '/reapprove', admin).expect(200);
    business = (await login('Business')).body.data.token;
    await call('post', '/auth/register-business').send({ ...account('DuplicateGst'), businessName: 'Other Shop', gstin: 'WF-UNIQUE', billingAddress: '42 Business Road, Hapur' }).expect(409);
    const tech = await call('post', '/auth/register-contractor').send({ ...account('Technician'), phone: '', skills: ['Electrical'], serviceArea: 'Hapur', latitude: 28.73, longitude: 77.78, services: [{ serviceType: 'Electrician Booking', visitChargeInPaise: 50000 }] }).expect(201);
    await login('Technician').then((r) => expect(r.status).toBe(403));
    await call('get', '/services/contractor/profile', tech.body.data.token).expect(401);
    const profiles = (await call('get', '/admin/contractors', admin)).body.data;
    profileId = profiles.find((item: { email: string }) => item.email === account('Technician').email).id;
    await call('patch', '/admin/contractors/' + profileId + '/reject', admin).expect(200);
    await login('Technician').then((r) => expect(r.status).toBe(403));
    await call('patch', '/admin/contractors/' + profileId + '/reapprove', admin).expect(200);
    technician = (await login('Technician')).body.data.token;
  });

  it('protects roles, B2B pricing, search, MOQ, stock and quantities above 99', async () => {
    const p = await product(150, true);
    await call('get', '/catalog/b2b').expect(401);
    await call('get', '/catalog/b2b', customer).expect(403);
    const retail = (await call('get', '/catalog/b2c/' + p.id).expect(200)).body.data;
    expect(retail.priceInPaise).toBe(10000); expect(retail.b2bPriceInPaise).toBeUndefined();
    const bulk = (await call('get', '/catalog/b2b?search=' + encodeURIComponent(p.name) + '&category=Hardware&sort=price-asc&inStock=true', business).expect(200)).body.data;
    expect(bulk).toHaveLength(1); expect(bulk[0].priceInPaise).toBe(8000);
    expect((await call('get', '/catalog/b2b?offset=99', business)).body.data).toHaveLength(0);
    expect((await order(p.id, 9, business)).status).toBe(400);
    const placed = await order(p.id, 160, business);
    expect(placed.status).toBe(201); expect(placed.body.data.totalInPaise).toBe(1280000);
    expect((await order(p.id, 1, customer)).status).toBe(400);
    await call('post', '/orders', business).send({ items: [{ productId: p.id, quantity: 10 }, { productId: p.id, quantity: 10 }], deliveryAddress: '42 Test Street, Hapur', paymentMethod: 'COD' }).expect(400);
  });

  it('reserves concurrent stock safely and returns stock only once on rejection', async () => {
    const p = await product(1);
    const results = await Promise.all([order(p.id, 1), order(p.id, 1, otherCustomer)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
    const id = results.find((r) => r.status === 201)!.body.data.id;
    const rejected = await call('patch', '/admin/orders/' + id + '/reject', admin).send({ reason: 'Supplier cannot fulfil this item' }).expect(200);
    expect(rejected.body.data.cancellationReason).toBe('Supplier cannot fulfil this item');
    await call('patch', '/admin/orders/' + id + '/reject', admin).send({ reason: 'Supplier cannot fulfil this item' }).expect(400);
    const stock = await database.inventory.findUnique({ where: { productId: p.id } });
    expect(stock?.available).toBe(1); expect(stock?.reserved).toBe(0); expect(stock?.onHand).toBe(1);
  });

  it('tracks admin fulfilment changes in the buyer account and protects other orders', async () => {
    const p = await product(30);
    const created = await order(p.id, 10, business);
    const id = created.body.data.id;
    await call('get', '/orders/' + id, customer).expect(404);
    await call('patch', '/admin/orders/' + id + '/status', admin).send({ status: 'PACKED' }).expect(400);
    await call('patch', '/admin/orders/' + id + '/approve', admin).expect(200);
    for (const status of ['PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
      await call('patch', '/admin/orders/' + id + '/status', admin).send({ status }).expect(200);
      expect((await call('get', '/orders/' + id, business)).body.data.status).toBe(status);
    }
    await call('patch', '/admin/orders/' + id + '/status', admin).send({ status: 'DELIVERED' }).expect(200);
    await call('patch', '/admin/orders/' + id + '/approve', admin).expect(400);
    const stock = await database.inventory.findUnique({ where: { productId: p.id } });
    expect(stock?.onHand).toBe(20); expect(stock?.available).toBe(20); expect(stock?.reserved).toBe(0);
  });

  it('loads real technician data, persists profile edits, and searches by actual area/location', async () => {
    const profile = (await call('get', '/services/contractor/profile', technician).expect(200)).body.data;
    expect(profile.name).toBe('Technician'); expect(profile.skills).toEqual(['Electrical']);
    await call('post', '/services/contractor/profile', technician).send({ skills: ['Electrical', 'Wiring'], serviceArea: 'Hapur', latitude: 28.73, longitude: 77.78, serviceRadiusKm: 20, bio: 'Updated real technician profile', availability: 'AVAILABLE', services: [{ serviceType: 'Electrician Booking', visitChargeInPaise: 50000 }, { serviceType: 'Wiring Work', visitChargeInPaise: 75000 }] }).expect(201);
    expect((await call('get', '/services/contractor/profile', technician)).body.data.bio).toBe('Updated real technician profile');
    const near = (await call('get', '/services/contractors/nearby?area=Hapur&latitude=28.73&longitude=77.78').expect(200)).body.data;
    expect(near[0].id).toBe(profileId); expect(near[0].distanceKm).toBe(0);
    const wiringMatches = (await call('get', '/services/contractors/nearby?serviceType=Wiring%20Work&latitude=28.73&longitude=77.78&nearbyOnly=true').expect(200)).body.data;
    expect(wiringMatches).toHaveLength(1); expect(wiringMatches[0]).toMatchObject({ id: profileId, isNearby: true });
    const fartherMatches = (await call('get', '/services/contractors/nearby?latitude=0&longitude=0')).body.data;
    expect(fartherMatches[0]).toMatchObject({ id: profileId, isNearby: false });
    const publicProfile = (await call('get', '/services/contractors/' + profileId)).body.data;
    expect(JSON.stringify(publicProfile)).not.toContain('passwordHash');
  });

  it('saves a customer address, ranks nearby technicians, and exposes full admin user details', async () => {
    const saved = (await call('post', '/addresses', customer).send({ label: 'Home', line1: '42 Test Street, Hapur 245205', city: 'Hapur', latitude: 28.73, longitude: 77.78, isDefault: true }).expect(201)).body.data;
    expect((await call('get', '/addresses', customer).expect(200)).body.data[0].id).toBe(saved.id);
    const matches = (await call('get', '/services/contractors/nearby?serviceType=Electrician%20Booking&latitude=28.73&longitude=77.78&radiusKm=15').expect(200)).body.data;
    expect(matches[0]).toMatchObject({ id: profileId, isNearby: true, distanceKm: 0 });
    const matchingProfile = await database.contractorProfile.create({
      data: {
        user: { create: { name: 'Another Hapur electrician', email: 'another-hapur@workflow.test', role: 'CONTRACTOR' } },
        skills: ['Electrical'], serviceArea: 'Hapur', serviceRadiusKm: 15, availability: 'AVAILABLE', verified: true, approvalStatus: 'APPROVED',
        services: { create: { serviceType: 'Electrician Booking', visitChargeInPaise: 50000 } },
      },
    });
    const otherProfile = await database.contractorProfile.create({
      data: {
        user: { create: { name: 'Mumbai electrician', email: 'mumbai-electrician@workflow.test', role: 'CONTRACTOR' } },
        skills: ['Electrical'], serviceArea: 'Mumbai', serviceRadiusKm: 15, availability: 'AVAILABLE', verified: true, approvalStatus: 'APPROVED',
        services: { create: { serviceType: 'Electrician Booking', visitChargeInPaise: 50000 } },
      },
    });
    const locationRanked = (await call('get', '/services/contractors/nearby?serviceType=Electrician%20Booking&area=Hapur&latitude=0&longitude=0&radiusKm=15').expect(200)).body.data;
    const ids = locationRanked.map((technician: { id: string }) => technician.id);
    expect(ids).toEqual(expect.arrayContaining([profileId, matchingProfile.id, otherProfile.id]));
    expect(Math.max(ids.indexOf(profileId), ids.indexOf(matchingProfile.id))).toBeLessThan(ids.indexOf(otherProfile.id));
    const booking = (await call('post', '/services/bookings', customer).send({ contractorId: profileId, serviceType: 'Electrician Booking', address: '42 Test Street, Hapur 245205', addressId: saved.id }).expect(201)).body.data;
    expect(booking.addressId).toBe(saved.id);
    const detail = (await call('get', '/admin/users/' + customerId, admin).expect(200)).body.data;
    expect(detail.addresses[0].id).toBe(saved.id); expect(detail.serviceRequestCount).toBeGreaterThan(0);
    expect((await call('get', '/auth/business-profile', business).expect(200)).body.data.businessName).toBe('Workflow Shop');
  });

  it('calculates real discounts and enforces admin-before-technician booking decisions', async () => {
    const offer = (await call('post', '/admin/service-offers', admin).send({ title: 'Visit discount', discountInPaise: 15000, contractorId: profileId }).expect(201)).body.data;
    await call('post', '/services/bookings').send({}).expect(401);
    await call('post', '/services/bookings', business).send({}).expect(403);
    const input = { contractorId: profileId, serviceType: 'Electrician Booking', address: '42 Test Street, Hapur', requestedPriceInPaise: 1, offerId: offer.id, notes: 'Inspect wiring' };
    const booking = (await call('post', '/services/bookings', customer).send(input).expect(201)).body.data;
    expect(booking.requestedPriceInPaise).toBe(50000); expect(booking.finalPriceInPaise).toBe(35000); expect(booking.notes).toBe('Inspect wiring');
    expect((await call('get', '/services/contractor/bookings', technician)).body.data).toHaveLength(0);
    await call('patch', '/services/bookings/' + booking.id + '/accept', technician).expect(404);
    await call('patch', '/admin/service-bookings/' + booking.id + '/approve', admin).expect(200);
    await call('patch', '/services/bookings/' + booking.id + '/complete', technician).expect(400);
    await call('patch', '/services/bookings/' + booking.id + '/accept', technician).expect(200);
    await call('patch', '/services/bookings/' + booking.id + '/reject', technician).expect(400);
    await call('patch', '/services/bookings/' + booking.id + '/complete', technician).expect(200);
    const history = (await call('get', '/services/bookings', customer)).body.data;
    expect(history.find((b: { id: string }) => b.id === booking.id).status).toBe('COMPLETED');
    expect(JSON.stringify(history)).not.toContain('passwordHash');
    expect((await call('get', '/services/bookings', otherCustomer)).body.data).toHaveLength(0);
    await call('patch', '/admin/service-offers/' + offer.id, admin).send({ title: 'Changed offer', discountInPaise: 20000, active: false }).expect(200);
    expect((await database.serviceBooking.findUnique({ where: { id: booking.id } }))?.finalPriceInPaise).toBe(35000);
    await call('post', '/services/bookings', customer).send(input).expect(400);
  });

  it('requires an owned delivered product order, caps the discount and prevents repeated redemption', async () => {
    const p = await product(10);
    const created = await order(p.id, 1); const orderId = created.body.data.id;
    const offer = (await call('post', '/admin/service-offers', admin).send({ title: 'Free visit with purchase', discountInPaise: 90000, productId: p.id }).expect(201)).body.data;
    const input = { contractorId: profileId, serviceType: 'Electrician Booking', address: '42 Test Street, Hapur', offerId: offer.id, orderId };
    await call('post', '/services/bookings', customer).send(input).expect(400);
    await call('patch', '/admin/orders/' + orderId + '/approve', admin).expect(200);
    await call('patch', '/admin/orders/' + orderId + '/status', admin).send({ status: 'DELIVERED' }).expect(200);
    await call('post', '/services/bookings', otherCustomer).send(input).expect(400);
    const booked = (await call('post', '/services/bookings', customer).send(input).expect(201)).body.data;
    expect(booked.discountInPaise).toBe(50000); expect(booked.finalPriceInPaise).toBe(0);
    await call('post', '/services/bookings', customer).send(input).expect(400);
  });

  it('restores revoked accounts and separates B2B/B2C banners', async () => {
    await call('delete', '/admin/users/' + customerId, admin).expect(200);
    await call('get', '/auth/me', customer).expect(401);
    await call('patch', '/admin/users/' + customerId + '/restore', admin).expect(200);
    await login('Customer').then((r) => expect(r.status).toBe(201));
    const b2b = (await call('post', '/admin/banners', admin).send({ title: 'Wholesale only', audience: 'B2B', active: true }).expect(201)).body.data;
    expect((await call('get', '/banners/b2b')).body.data.some((b: { id: string }) => b.id === b2b.id)).toBe(true);
    expect((await call('get', '/banners/b2c')).body.data.some((b: { id: string }) => b.id === b2b.id)).toBe(false);
  });
});
