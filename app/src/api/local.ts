// Demo backend that keeps accounts and rides on the device.
// Lets the app be tried without running the server.
import * as Crypto from 'expo-crypto';
import { getItem, setItem } from './storage';
import {
  Api,
  ApiError,
  ProfileUpdate,
  RegisterInput,
  Ride,
  RideInput,
  User,
} from './types';
import { isEmail, normalizePhone } from '../lib/validation';
import { DRIVER_NEXT } from '../lib/driver';

type StoredUser = User & { passwordHash: string; salt: string };
type DB = { users: StoredUser[]; rides: Ride[]; sessions: Record<string, string> };

const DB_KEY = 'demo_db_v1';

// Built-in driver account so the demo can show both sides on one phone.
export const DEMO_DRIVER = { phone: '500 000 000', password: 'kierowca1' };

async function hash(password: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

async function seedDriver(db: DB) {
  if (db.users.some((u) => u.role === 'driver')) return;
  const salt = 'demo-driver';
  db.users.push({
    id: 'demo-driver',
    firstName: 'Kierowca',
    lastName: 'Demo',
    email: 'kierowca@demo.local',
    phone: normalizePhone(DEMO_DRIVER.phone)!,
    role: 'driver',
    vehicle: { car: 'Tesla Model Y', plate: 'PO 7E5LY' },
    marketingConsent: false,
    createdAt: new Date().toISOString(),
    salt,
    passwordHash: await hash(DEMO_DRIVER.password, salt),
  });
}

async function load(): Promise<DB> {
  let db: DB = { users: [], rides: [], sessions: {} };
  const raw = await getItem(DB_KEY);
  if (raw) {
    try {
      db = JSON.parse(raw) as DB;
    } catch {}
  }
  await seedDriver(db);
  return db;
}

const save = (db: DB) => setItem(DB_KEY, JSON.stringify(db));

const strip = ({ passwordHash, salt, ...u }: StoredUser): User => u;

function userFor(db: DB, token: string): StoredUser {
  const id = db.sessions[token];
  const user = id && db.users.find((u) => u.id === id);
  if (!user) throw new ApiError('Sesja wygasła. Zaloguj się ponownie.', 401);
  return user;
}

function driverFor(db: DB, token: string): StoredUser {
  const user = userFor(db, token);
  if (user.role !== 'driver') throw new ApiError('Tylko dla kierowców', 403);
  return user;
}

// Same rule as the server: the customer's phone shows only after the driver accepts.
function driverView(db: DB, ride: Ride, driverId: string): Ride {
  const u = db.users.find((x) => x.id === ride.userId);
  const mine = ride.driverId === driverId;
  return {
    ...ride,
    customer: u && { name: mine ? `${u.firstName} ${u.lastName}` : u.firstName, phone: mine ? u.phone : undefined },
  };
}

function ownJob(db: DB, driver: StoredUser, id: string): Ride {
  const ride = db.rides.find((r) => r.id === id && r.driverId === driver.id);
  if (!ride) throw new ApiError('Nie znaleziono zlecenia', 404);
  return ride;
}

async function startSession(db: DB, user: StoredUser) {
  const token = Crypto.randomUUID();
  db.sessions[token] = user.id;
  await save(db);
  return { user: strip(user), token };
}

function checkUnique(db: DB, email: string, phone: string, exceptId?: string) {
  if (db.users.some((u) => u.id !== exceptId && u.email === email))
    throw new ApiError('Konto z tym adresem e-mail już istnieje');
  if (db.users.some((u) => u.id !== exceptId && u.phone === phone))
    throw new ApiError('Konto z tym numerem telefonu już istnieje');
}

export const localApi: Api = {
  async register(input: RegisterInput) {
    const db = await load();
    const email = input.email.trim().toLowerCase();
    const phone = normalizePhone(input.phone);
    if (!isEmail(email)) throw new ApiError('Niepoprawny adres e-mail');
    if (!phone) throw new ApiError('Niepoprawny numer telefonu');
    checkUnique(db, email, phone);
    const salt = Crypto.randomUUID();
    const user: StoredUser = {
      id: Crypto.randomUUID(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      phone,
      role: 'customer',
      marketingConsent: input.marketingConsent,
      createdAt: new Date().toISOString(),
      salt,
      passwordHash: await hash(input.password, salt),
    };
    db.users.push(user);
    return startSession(db, user);
  },

  async login(login: string, password: string) {
    const db = await load();
    const l = login.trim().toLowerCase();
    const phone = normalizePhone(l);
    const user = db.users.find((u) => u.email === l || (phone && u.phone === phone));
    if (!user || (await hash(password, user.salt)) !== user.passwordHash)
      throw new ApiError('Nieprawidłowy login lub hasło', 401);
    return startSession(db, user);
  },

  async me(token) {
    return strip(userFor(await load(), token));
  },

  async updateProfile(token, update: ProfileUpdate) {
    const db = await load();
    const user = userFor(db, token);
    const next = { ...user, ...update };
    if (update.email != null) next.email = update.email.trim().toLowerCase();
    if (update.phone != null) {
      const p = normalizePhone(update.phone);
      if (!p) throw new ApiError('Niepoprawny numer telefonu');
      next.phone = p;
    }
    checkUnique(db, next.email, next.phone, user.id);
    db.users = db.users.map((u) => (u.id === user.id ? next : u));
    await save(db);
    return strip(next);
  },

  async deleteAccount(token) {
    const db = await load();
    const user = userFor(db, token);
    db.users = db.users.filter((u) => u.id !== user.id);
    db.rides = db.rides.filter((r) => r.userId !== user.id);
    for (const [t, id] of Object.entries(db.sessions)) if (id === user.id) delete db.sessions[t];
    await save(db);
  },

  async listRides(token) {
    const db = await load();
    const user = userFor(db, token);
    return db.rides
      .filter((r) => r.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getRide(token, id) {
    const rides = await this.listRides(token);
    const ride = rides.find((r) => r.id === id);
    if (!ride) throw new ApiError('Nie znaleziono przejazdu', 404);
    return ride;
  },

  async createRide(token, input: RideInput) {
    const db = await load();
    const user = userFor(db, token);
    const ride: Ride = {
      ...input,
      id: Crypto.randomUUID(),
      userId: user.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.rides.push(ride);
    await save(db);
    return ride;
  },

  async cancelRide(token, id) {
    const db = await load();
    const user = userFor(db, token);
    const ride = db.rides.find((r) => r.id === id && r.userId === user.id);
    if (!ride) throw new ApiError('Nie znaleziono przejazdu', 404);
    if (!['pending', 'confirmed'].includes(ride.status))
      throw new ApiError('Tego przejazdu nie można już anulować w aplikacji. Zadzwoń do nas.');
    ride.status = 'cancelled';
    await save(db);
    return ride;
  },

  async driverJobs(token) {
    const db = await load();
    const me = driverFor(db, token);
    const when = (r: Ride) => r.scheduledAt || r.createdAt;
    const available = db.rides
      .filter((r) => r.status === 'pending' && !r.driverId)
      .sort((a, b) => when(a).localeCompare(when(b)));
    const mine = db.rides
      .filter((r) => r.driverId === me.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      available: available.map((r) => driverView(db, r, me.id)),
      mine: mine.map((r) => driverView(db, r, me.id)),
    };
  },

  async acceptJob(token, id) {
    const db = await load();
    const me = driverFor(db, token);
    const ride = db.rides.find((r) => r.id === id);
    if (!ride) throw new ApiError('Nie znaleziono zlecenia', 404);
    if (ride.status !== 'pending' || ride.driverId) throw new ApiError('To zlecenie jest już nieaktualne', 409);
    ride.driverId = me.id;
    ride.driver = {
      name: `${me.firstName} ${me.lastName[0] ?? ''}.`.trim(),
      phone: me.phone,
      car: me.vehicle?.car ?? 'Tesla Model Y',
      plate: me.vehicle?.plate ?? '',
      rating: 5,
    };
    ride.status = 'confirmed';
    await save(db);
    return driverView(db, ride, me.id);
  },

  async advanceJob(token, id, status) {
    const db = await load();
    const me = driverFor(db, token);
    const ride = ownJob(db, me, id);
    if (DRIVER_NEXT[ride.status]?.status !== status)
      throw new ApiError('Nie można zmienić statusu tego przejazdu');
    ride.status = status;
    await save(db);
    return driverView(db, ride, me.id);
  },

  async releaseJob(token, id) {
    const db = await load();
    const me = driverFor(db, token);
    const ride = ownJob(db, me, id);
    if (ride.status !== 'confirmed')
      throw new ApiError('Można oddać tylko zlecenie, do którego jeszcze nie jedziesz');
    delete ride.driverId;
    delete ride.driver;
    ride.status = 'pending';
    await save(db);
    return driverView(db, ride, me.id);
  },
};
