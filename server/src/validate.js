const { CAR_CLASSES, EXTRAS } = require('./pricing');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const bad = (msg) => new HttpError(400, msg);

function normalizePhone(input) {
  const raw = String(input || '').replace(/[\s\-().]/g, '');
  if (/^\+\d{8,15}$/.test(raw)) return raw;
  if (/^00\d{8,15}$/.test(raw)) return '+' + raw.slice(2);
  if (/^\d{9}$/.test(raw)) return '+48' + raw;
  if (/^48\d{9}$/.test(raw)) return '+' + raw;
  return null;
}

const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim()) && s.length <= 200;

function isNip(input) {
  const d = String(input).replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(d)) return false;
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  return w.reduce((s, x, i) => s + x * Number(d[i]), 0) % 11 === Number(d[9]);
}

function str(v, field, max, required = true) {
  if (v == null || v === '') {
    if (required) throw bad(`Pole "${field}" jest wymagane`);
    return undefined;
  }
  if (typeof v !== 'string') throw bad(`Pole "${field}" jest niepoprawne`);
  const t = v.trim();
  if (required && !t) throw bad(`Pole "${field}" jest wymagane`);
  if (t.length > max) throw bad(`Pole "${field}" jest za długie`);
  return t || undefined;
}

function place(p, field) {
  if (!p || typeof p !== 'object') throw bad(`Podaj ${field}`);
  const out = { address: str(p.address, field, 300) };
  const okLat = typeof p.lat === 'number' && Math.abs(p.lat) <= 90;
  const okLng = typeof p.lng === 'number' && Math.abs(p.lng) <= 180;
  if (okLat && okLng) Object.assign(out, { lat: p.lat, lng: p.lng });
  return out;
}

function password(pw) {
  if (typeof pw !== 'string' || pw.length < 8 || pw.length > 200) throw bad('Hasło musi mieć min. 8 znaków');
  if (!/\d/.test(pw) || !/[a-zA-Z]/.test(pw)) throw bad('Hasło musi zawierać litery i cyfry');
  return pw;
}

function rideInput(b) {
  const car = CAR_CLASSES[b.carClass];
  if (!car) throw bad('Wybierz klasę samochodu');
  const passengers = Number(b.passengers);
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > car.seats)
    throw bad(`Ten samochód mieści maks. ${car.seats} pasażerów`);
  const extras = Array.isArray(b.extras) ? [...new Set(b.extras)] : [];
  if (extras.some((e) => !(e in EXTRAS))) throw bad('Nieznany dodatek');
  if (!['card', 'cash', 'invoice'].includes(b.payment)) throw bad('Wybierz metodę płatności');
  let scheduledAt = null;
  if (b.scheduledAt) {
    const d = new Date(b.scheduledAt);
    if (isNaN(d)) throw bad('Niepoprawny termin');
    if (d.getTime() < Date.now() - 5 * 60_000) throw bad('Termin nie może być w przeszłości');
    if (d.getTime() > Date.now() + 90 * 86_400_000) throw bad('Można rezerwować maks. 90 dni wprzód');
    scheduledAt = d.toISOString();
  }
  return {
    pickup: place(b.pickup, 'adres odbioru'),
    destination: place(b.destination, 'adres docelowy'),
    scheduledAt,
    carClass: b.carClass,
    passengers,
    extras,
    payment: b.payment,
    flightNumber: str(b.flightNumber, 'numer lotu', 20, false),
    notes: str(b.notes, 'uwagi', 500, false),
  };
}

module.exports = { HttpError, bad, normalizePhone, isEmail, isNip, str, password, rideInput };
