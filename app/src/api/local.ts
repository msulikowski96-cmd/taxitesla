// Demo backend that keeps accounts and rides on the device.
// Lets the app be tried without running the server.
import * as Crypto from 'expo-crypto';
import { getItem, setItem } from './storage';
import {
  Api,
  ApiError,
  Driver,
  ProfileUpdate,
  RegisterInput,
  Ride,
  RideInput,
  User,
} from './types';
import { isEmail, normalizePhone } from '../lib/validation';
import { getCarClass } from '../lib/pricing';

type StoredUser = User & { passwordHash: string; salt: string };
type DB = { users: StoredUser[]; rides: Ride[]; sessions: Record<string, string> };

const DB_KEY = 'demo_db_v1';

const DEMO_DRIVERS: Omit<Driver, 'car'>[] = [
  { name: 'Marek W.', phone: '+48600111222', plate: 'PO 7E5LA', rating: 4.98 },
  { name: 'Anna K.', phone: '+48600333444', plate: 'PO 3TE5L', rating: 4.95 },
  { name: 'Piotr N.', phone: '+48600555666', plate: 'PO 1VOLT', rating: 4.97 },
];

async function load(): Promise<DB> {
  const raw = await getItem(DB_KEY);
  if (!raw) return { users: [], rides: [], sessions: {} };
  try {
    return JSON.parse(raw) as DB;
  } catch {
    return { users: [], rides: [], sessions: {} };
  }
}

const save = (db: DB) => setItem(DB_KEY, JSON.stringify(db));

const hash = (password: string, salt: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);

const strip = ({ passwordHash, salt, ...u }: StoredUser): User => u;

function userFor(db: DB, token: string): StoredUser {
  const id = db.sessions[token];
  const user = id && db.users.find((u) => u.id === id);
  if (!user) throw new ApiError('Sesja wygasła. Zaloguj się ponownie.', 401);
  return user;
}

// Simulates the dispatcher: rides get confirmed and a driver assigned after a short while.
function advance(ride: Ride): Ride {
  if (ride.status !== 'pending') return ride;
  if (Date.now() - new Date(ride.createdAt).getTime() < 8000) return ride;
  const d = DEMO_DRIVERS[Math.floor(Math.random() * DEMO_DRIVERS.length)];
  return { ...ride, status: 'confirmed', driver: { ...d, car: getCarClass(ride.carClass).model } };
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
    db.rides = db.rides.map(advance);
    await save(db);
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
};
