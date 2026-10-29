const crypto = require('crypto');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { quote } = require('./pricing');
const v = require('./validate');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('Set JWT_SECRET (min. 32 characters)');
if (!ADMIN_TOKEN || ADMIN_TOKEN.length < 16) throw new Error('Set ADMIN_TOKEN (min. 16 characters)');

const STATUSES = ['pending', 'confirmed', 'driver_on_way', 'in_progress', 'completed', 'cancelled'];
// The only status changes a driver can make, one step at a time.
const DRIVER_NEXT = { confirmed: 'driver_on_way', driver_on_way: 'in_progress', in_progress: 'completed' };
const publicUser = ({ passwordHash, ...u }) => u;
const publicRide = (r) => r;

function sign(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '90d' });
}

function requireUser(req, _res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    const { sub } = jwt.verify(token, JWT_SECRET);
    req.user = db.users.find((u) => u.id === sub);
  } catch {}
  if (!req.user) return next(new v.HttpError(401, 'Sesja wygasła. Zaloguj się ponownie.'));
  next();
}

function requireDriver(req, res, next) {
  requireUser(req, res, (err) => {
    if (err) return next(err);
    if (req.user.role !== 'driver') return next(new v.HttpError(403, 'Tylko dla kierowców'));
    next();
  });
}

// What a driver sees about a ride. The customer's phone appears only once the driver has the job.
function driverView(ride, driverId) {
  const u = db.users.find((x) => x.id === ride.userId);
  const mine = ride.driverId === driverId;
  return {
    ...ride,
    customer: u && { name: mine ? `${u.firstName} ${u.lastName}` : u.firstName, phone: mine ? u.phone : undefined },
  };
}

function requireAdmin(req, _res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const a = Buffer.from(token);
  const b = Buffer.from(ADMIN_TOKEN);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return next(new v.HttpError(401, 'Brak dostępu'));
  next();
}

function checkUnique(email, phone, exceptId) {
  if (db.users.some((u) => u.id !== exceptId && u.email === email))
    throw v.bad('Konto z tym adresem e-mail już istnieje');
  if (db.users.some((u) => u.id !== exceptId && u.phone === phone))
    throw v.bad('Konto z tym numerem telefonu już istnieje');
}

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json({ limit: '50kb' }));

  const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // ---- Auth ----
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const b = req.body || {};
    const firstName = v.str(b.firstName, 'imię', 60);
    const lastName = v.str(b.lastName, 'nazwisko', 60);
    if (!v.isEmail(b.email)) throw v.bad('Niepoprawny adres e-mail');
    const email = b.email.trim().toLowerCase();
    const phone = v.normalizePhone(b.phone);
    if (!phone) throw v.bad('Niepoprawny numer telefonu');
    const pw = v.password(b.password);
    checkUnique(email, phone);
    const user = {
      id: crypto.randomUUID(),
      firstName,
      lastName,
      email,
      phone,
      marketingConsent: !!b.marketingConsent,
      role: 'customer',
      createdAt: new Date().toISOString(),
      passwordHash: await bcrypt.hash(pw, 10),
    };
    db.users.push(user);
    db.save();
    res.status(201).json({ user: publicUser(user), token: sign(user) });
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const login = String(req.body?.login || '').trim().toLowerCase();
    const phone = v.normalizePhone(login);
    const user = db.users.find((u) => u.email === login || (phone && u.phone === phone));
    const ok = user && (await bcrypt.compare(String(req.body?.password || ''), user.passwordHash));
    if (!ok) throw new v.HttpError(401, 'Nieprawidłowy login lub hasło');
    res.json({ user: publicUser(user), token: sign(user) });
  });

  // ---- Profile ----
  app.get('/api/me', requireUser, (req, res) => res.json(publicUser(req.user)));

  app.patch('/api/me', requireUser, (req, res) => {
    const b = req.body || {};
    const u = { ...req.user };
    if (b.firstName !== undefined) u.firstName = v.str(b.firstName, 'imię', 60);
    if (b.lastName !== undefined) u.lastName = v.str(b.lastName, 'nazwisko', 60);
    if (b.email !== undefined) {
      if (!v.isEmail(b.email)) throw v.bad('Niepoprawny adres e-mail');
      u.email = b.email.trim().toLowerCase();
    }
    if (b.phone !== undefined) {
      u.phone = v.normalizePhone(b.phone);
      if (!u.phone) throw v.bad('Niepoprawny numer telefonu');
    }
    if (b.companyName !== undefined) u.companyName = v.str(b.companyName, 'nazwa firmy', 200, false);
    if (b.nip !== undefined) {
      if (b.nip && !v.isNip(b.nip)) throw v.bad('Niepoprawny NIP');
      u.nip = b.nip ? String(b.nip).replace(/[\s-]/g, '') : undefined;
    }
    if (b.marketingConsent !== undefined) u.marketingConsent = !!b.marketingConsent;
    checkUnique(u.email, u.phone, u.id);
    Object.assign(req.user, u);
    db.save();
    res.json(publicUser(req.user));
  });

  // GDPR: remove account and personal data.
  app.delete('/api/me', requireUser, (req, res) => {
    db.users = db.users.filter((u) => u.id !== req.user.id);
    db.rides = db.rides.filter((r) => r.userId !== req.user.id);
    db.save();
    res.status(204).end();
  });

  // ---- Rides ----
  app.get('/api/rides', requireUser, (req, res) => {
    const rides = db.rides
      .filter((r) => r.userId === req.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(rides.map(publicRide));
  });

  app.get('/api/rides/:id', requireUser, (req, res) => {
    const ride = db.rides.find((r) => r.id === req.params.id && r.userId === req.user.id);
    if (!ride) throw new v.HttpError(404, 'Nie znaleziono przejazdu');
    res.json(publicRide(ride));
  });

  app.post('/api/rides', requireUser, (req, res) => {
    const input = v.rideInput(req.body || {});
    if (input.payment === 'invoice' && !req.user.nip)
      throw v.bad('Uzupełnij NIP w profilu, aby zamówić przejazd na fakturę');
    const active = db.rides.filter(
      (r) => r.userId === req.user.id && ['pending', 'confirmed', 'driver_on_way'].includes(r.status),
    );
    if (active.length >= 5) throw v.bad('Masz już 5 aktywnych zamówień. Zadzwoń do nas, jeśli potrzebujesz więcej.');
    const q = quote({ ...input, when: input.scheduledAt ? new Date(input.scheduledAt) : new Date() });
    const ride = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      ...input,
      distanceKm: q.distanceKm,
      priceEstimate: q.total,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.rides.push(ride);
    db.save();
    res.status(201).json(publicRide(ride));
  });

  app.post('/api/rides/:id/cancel', requireUser, (req, res) => {
    const ride = db.rides.find((r) => r.id === req.params.id && r.userId === req.user.id);
    if (!ride) throw new v.HttpError(404, 'Nie znaleziono przejazdu');
    if (!['pending', 'confirmed'].includes(ride.status))
      throw v.bad('Tego przejazdu nie można już anulować w aplikacji. Zadzwoń do nas.');
    ride.status = 'cancelled';
    ride.updatedAt = new Date().toISOString();
    db.save();
    res.json(publicRide(ride));
  });

  // ---- Driver ----
  app.get('/api/driver/rides', requireDriver, (req, res) => {
    const me = req.user.id;
    const when = (r) => r.scheduledAt || r.createdAt;
    const available = db.rides
      .filter((r) => r.status === 'pending' && !r.driverId && !r.driver)
      .sort((a, b) => when(a).localeCompare(when(b)));
    const mine = db.rides
      .filter((r) => r.driverId === me)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100);
    res.json({ available: available.map((r) => driverView(r, me)), mine: mine.map((r) => driverView(r, me)) });
  });

  app.post('/api/driver/rides/:id/accept', requireDriver, (req, res) => {
    const ride = db.rides.find((r) => r.id === req.params.id);
    if (!ride) throw new v.HttpError(404, 'Nie znaleziono zlecenia');
    if (ride.status !== 'pending' || ride.driverId || ride.driver)
      throw new v.HttpError(409, 'To zlecenie jest już nieaktualne');
    const d = req.user;
    ride.driverId = d.id;
    ride.driver = {
      name: `${d.firstName} ${d.lastName[0] || ''}.`.trim(),
      phone: d.phone,
      car: d.vehicle?.car || 'Tesla Model Y',
      plate: d.vehicle?.plate || '',
      rating: 5,
    };
    ride.status = 'confirmed';
    ride.updatedAt = new Date().toISOString();
    db.save();
    res.json(driverView(ride, d.id));
  });

  app.post('/api/driver/rides/:id/status', requireDriver, (req, res) => {
    const ride = db.rides.find((r) => r.id === req.params.id && r.driverId === req.user.id);
    if (!ride) throw new v.HttpError(404, 'Nie znaleziono zlecenia');
    if (DRIVER_NEXT[ride.status] !== req.body?.status) throw v.bad('Nie można zmienić statusu tego przejazdu');
    ride.status = req.body.status;
    ride.updatedAt = new Date().toISOString();
    db.save();
    res.json(driverView(ride, req.user.id));
  });

  // Driver gives the job back before setting off; it returns to the list of open orders.
  app.post('/api/driver/rides/:id/release', requireDriver, (req, res) => {
    const ride = db.rides.find((r) => r.id === req.params.id && r.driverId === req.user.id);
    if (!ride) throw new v.HttpError(404, 'Nie znaleziono zlecenia');
    if (ride.status !== 'confirmed') throw v.bad('Można oddać tylko zlecenie, do którego jeszcze nie jedziesz');
    delete ride.driverId;
    delete ride.driver;
    ride.status = 'pending';
    ride.updatedAt = new Date().toISOString();
    db.save();
    res.json(driverView(ride, req.user.id));
  });

  // ---- Dispatcher panel ----
  app.get('/api/admin/rides', requireAdmin, (_req, res) => {
    const byId = Object.fromEntries(db.users.map((u) => [u.id, u]));
    const rides = [...db.rides]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 500)
      .map((r) => {
        const u = byId[r.userId];
        return { ...r, customer: u && { name: `${u.firstName} ${u.lastName}`, phone: u.phone, email: u.email, companyName: u.companyName, nip: u.nip } };
      });
    res.json(rides);
  });

  app.get('/api/admin/drivers', requireAdmin, (_req, res) => {
    res.json(db.users.filter((u) => u.role === 'driver').map(publicUser));
  });

  // Driver accounts are created by the business, never through public sign-up.
  app.post('/api/admin/drivers', requireAdmin, async (req, res) => {
    const b = req.body || {};
    const phone = v.normalizePhone(b.phone);
    if (!phone) throw v.bad('Niepoprawny numer telefonu');
    const email = b.email ? String(b.email).trim().toLowerCase() : `kierowca-${phone.slice(1)}@kierowcy.local`;
    if (b.email && !v.isEmail(email)) throw v.bad('Niepoprawny adres e-mail');
    checkUnique(email, phone);
    const driver = {
      id: crypto.randomUUID(),
      firstName: v.str(b.firstName, 'imię', 60),
      lastName: v.str(b.lastName, 'nazwisko', 60),
      email,
      phone,
      role: 'driver',
      vehicle: { car: v.str(b.car, 'samochód', 80, false) || 'Tesla Model Y', plate: v.str(b.plate, 'rejestracja', 20) },
      marketingConsent: false,
      createdAt: new Date().toISOString(),
      passwordHash: await bcrypt.hash(v.password(b.password), 10),
    };
    db.users.push(driver);
    db.save();
    res.status(201).json(publicUser(driver));
  });

  app.delete('/api/admin/drivers/:id', requireAdmin, (req, res) => {
    const d = db.users.find((u) => u.id === req.params.id && u.role === 'driver');
    if (!d) throw new v.HttpError(404, 'Nie znaleziono kierowcy');
    db.users = db.users.filter((u) => u.id !== d.id);
    // Give back the driver's open jobs so they aren't stuck.
    for (const r of db.rides)
      if (r.driverId === d.id && r.status === 'confirmed') {
        delete r.driverId;
        delete r.driver;
        r.status = 'pending';
      }
    db.save();
    res.status(204).end();
  });

  app.patch('/api/admin/rides/:id', requireAdmin, (req, res) => {
    const ride = db.rides.find((r) => r.id === req.params.id);
    if (!ride) throw new v.HttpError(404, 'Nie znaleziono przejazdu');
    const b = req.body || {};
    if (b.status !== undefined) {
      if (!STATUSES.includes(b.status)) throw v.bad('Nieznany status');
      ride.status = b.status;
    }
    if (b.priceEstimate !== undefined) {
      const p = b.priceEstimate === null ? null : Number(b.priceEstimate);
      if (p !== null && (!Number.isFinite(p) || p < 0 || p > 100000)) throw v.bad('Niepoprawna cena');
      ride.priceEstimate = p;
    }
    if (b.driver !== undefined) {
      if (b.driver === null) {
        delete ride.driver;
        delete ride.driverId;
      } else {
        delete ride.driverId; // assigned by hand in the panel, not by a driver account
        const phone = v.normalizePhone(b.driver.phone);
        if (!phone) throw v.bad('Niepoprawny telefon kierowcy');
        ride.driver = {
          name: v.str(b.driver.name, 'kierowca', 80),
          phone,
          car: v.str(b.driver.car, 'samochód', 80),
          plate: v.str(b.driver.plate, 'rejestracja', 20),
          rating: Math.min(5, Math.max(0, Number(b.driver.rating) || 5)),
        };
      }
    }
    ride.updatedAt = new Date().toISOString();
    db.save();
    res.json(ride);
  });

  app.use('/admin', express.static(path.join(__dirname, '..', 'public')));

  app.use('/api', (_req, _res, next) => next(new v.HttpError(404, 'Nie znaleziono')));

  // Express 5 forwards async errors here.
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Niepoprawne dane' });
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Błąd serwera' : err.message });
  });

  return app;
}

module.exports = { createApp };
