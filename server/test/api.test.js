const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'taxitesla-'));
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.ADMIN_TOKEN = 'admin-token-123456';
const { createApp } = require('../src/app');

let server, base;
before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

async function call(method, p, body, token) {
  const res = await fetch(base + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: res.status === 204 ? null : await res.json() };
}

const user = { firstName: 'Jan', lastName: 'Kowalski', email: 'Jan@Example.com', phone: '600 123 456', password: 'haslo1234', marketingConsent: false };
const ride = {
  pickup: { address: 'Poznań Główny', lat: 52.4017, lng: 16.9119 },
  destination: { address: 'Lotnisko Ławica', lat: 52.421, lng: 16.8263 },
  scheduledAt: null,
  carClass: 'model_y',
  passengers: 2,
  extras: ['meet_greet'],
  payment: 'card',
  priceEstimate: 1, // ignored, server recomputes
};

let token, rideId;

test('register validates input and normalizes phone/email', async () => {
  assert.equal((await call('POST', '/auth/register', { ...user, phone: '123' })).status, 400);
  assert.equal((await call('POST', '/auth/register', { ...user, password: 'short' })).status, 400);
  const r = await call('POST', '/auth/register', user);
  assert.equal(r.status, 201);
  assert.equal(r.data.user.phone, '+48600123456');
  assert.equal(r.data.user.email, 'jan@example.com');
  assert.equal(r.data.user.passwordHash, undefined);
  token = r.data.token;
  const dup = await call('POST', '/auth/register', { ...user, email: 'other@example.com' });
  assert.equal(dup.status, 400);
});

test('login by phone or email', async () => {
  assert.equal((await call('POST', '/auth/login', { login: '+48 600 123 456', password: 'haslo1234' })).status, 200);
  assert.equal((await call('POST', '/auth/login', { login: 'jan@example.com', password: 'haslo1234' })).status, 200);
  assert.equal((await call('POST', '/auth/login', { login: 'jan@example.com', password: 'wrong1234' })).status, 401);
});

test('profile requires auth and validates NIP', async () => {
  assert.equal((await call('GET', '/me')).status, 401);
  assert.equal((await call('PATCH', '/me', { nip: '1234567890' }, token)).status, 400);
  const ok = await call('PATCH', '/me', { nip: '526-000-12-46', companyName: 'Firma' }, token);
  assert.equal(ok.status, 200);
  assert.equal(ok.data.nip, '5260001246');
});

test('create ride recomputes price server-side', async () => {
  assert.equal((await call('POST', '/rides', { ...ride, passengers: 6 }, token)).status, 400);
  const r = await call('POST', '/rides', ride, token);
  assert.equal(r.status, 201);
  assert.equal(r.data.status, 'pending');
  assert.ok(r.data.priceEstimate >= 70, `price ${r.data.priceEstimate}`); // ~8 km + meet & greet
  rideId = r.data.id;
  const list = await call('GET', '/rides', null, token);
  assert.equal(list.data.length, 1);
});

test('dispatcher assigns driver; user sees it; cancel rules', async () => {
  assert.equal((await call('GET', '/admin/rides', null, 'nope')).status, 401);
  const all = await call('GET', '/admin/rides', null, 'admin-token-123456');
  assert.equal(all.data[0].customer.phone, '+48600123456');
  const upd = await call(
    'PATCH',
    `/admin/rides/${rideId}`,
    { status: 'driver_on_way', driver: { name: 'Marek', phone: '600111222', car: 'Tesla Model Y', plate: 'PO 12345' } },
    'admin-token-123456',
  );
  assert.equal(upd.status, 200);
  const mine = await call('GET', `/rides/${rideId}`, null, token);
  assert.equal(mine.data.driver.name, 'Marek');
  assert.equal((await call('POST', `/rides/${rideId}/cancel`, null, token)).status, 400);
});

test('delete account removes data', async () => {
  assert.equal((await call('DELETE', '/me', null, token)).status, 204);
  assert.equal((await call('GET', '/me', null, token)).status, 401);
});

test('driver: admin creates account, driver accepts and completes a ride', async () => {
  const admin = 'admin-token-123456';
  const c = await call('POST', '/auth/register', { ...user, email: 'klient2@example.com', phone: '601 000 111' });
  const customer = c.data.token;
  const d = await call('POST', '/admin/drivers', { firstName: 'Mateusz', lastName: 'S', phone: '500 100 200', password: 'kierowca1', plate: 'PO 1234Y' }, admin);
  assert.equal(d.status, 201);
  assert.equal(d.data.role, 'driver');
  assert.equal(d.data.passwordHash, undefined);
  // public sign-up never creates drivers, and customers can't use driver routes
  assert.equal((await call('GET', '/driver/rides', null, customer)).status, 403);

  const login = await call('POST', '/auth/login', { login: '500100200', password: 'kierowca1' });
  const driver = login.data.token;
  assert.equal(login.data.user.role, 'driver');

  const r = await call('POST', '/rides', ride, customer);
  let jobs = await call('GET', '/driver/rides', null, driver);
  const job = jobs.data.available.find((x) => x.id === r.data.id);
  assert.ok(job, 'new ride is listed for drivers');
  assert.equal(job.customer.phone, undefined, 'phone hidden before accepting');

  // can't skip ahead before accepting
  assert.equal((await call('POST', `/driver/rides/${r.data.id}/status`, { status: 'in_progress' }, driver)).status, 404);
  const acc = await call('POST', `/driver/rides/${r.data.id}/accept`, null, driver);
  assert.equal(acc.status, 200);
  assert.equal(acc.data.status, 'confirmed');
  assert.equal(acc.data.customer.phone, '+48601000111');
  assert.equal((await call('POST', `/driver/rides/${r.data.id}/accept`, null, driver)).status, 409);

  // customer sees the driver
  const seen = await call('GET', `/rides/${r.data.id}`, null, customer);
  assert.equal(seen.data.driver.plate, 'PO 1234Y');

  // release returns it to the pool, then accept again and drive it through
  assert.equal((await call('POST', `/driver/rides/${r.data.id}/release`, null, driver)).data.status, 'pending');
  await call('POST', `/driver/rides/${r.data.id}/accept`, null, driver);
  assert.equal((await call('POST', `/driver/rides/${r.data.id}/status`, { status: 'completed' }, driver)).status, 400);
  for (const status of ['driver_on_way', 'in_progress', 'completed']) {
    const s = await call('POST', `/driver/rides/${r.data.id}/status`, { status }, driver);
    assert.equal(s.data.status, status);
  }
  jobs = await call('GET', '/driver/rides', null, driver);
  assert.equal(jobs.data.mine[0].status, 'completed');
  assert.equal((await call('GET', `/rides/${r.data.id}`, null, customer)).data.status, 'completed');
});
