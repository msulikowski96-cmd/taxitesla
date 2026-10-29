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
  carClass: 'business',
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
  assert.ok(r.data.priceEstimate > 60, `price ${r.data.priceEstimate}`);
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
    { status: 'driver_on_way', driver: { name: 'Marek', phone: '600111222', car: 'Tesla Model S', plate: 'PO 12345' } },
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
