// Same tariff as app/src/lib/pricing.ts. The server recomputes the price so clients can't change it.
const CAR_CLASSES = {
  model_y: { model: 'Tesla Model Y', seats: 4, startFee: 18, perKm: 4.8, minFare: 40 },
};

const EXTRAS = { child_seat: 20, meet_greet: 30, pet: 15, extra_luggage: 10 };
const NIGHT_MULTIPLIER = 1.2;
const ROAD_FACTOR = 1.3;

function distanceKm(a, b) {
  if ([a.lat, a.lng, b.lat, b.lng].some((v) => typeof v !== 'number')) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.max(1, Math.round(2 * R * Math.asin(Math.sqrt(h)) * ROAD_FACTOR * 10) / 10);
}

// Night tariff uses Polish local time regardless of the server's timezone.
function isNight(date) {
  const h = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Warsaw' }).format(date),
  );
  return h >= 22 || h < 6;
}

function quote({ pickup, destination, carClass, extras, when }) {
  const car = CAR_CLASSES[carClass];
  const km = distanceKm(pickup, destination);
  if (km == null) return { distanceKm: null, total: null };
  let fare = Math.max(car.minFare, car.startFee + car.perKm * km);
  if (isNight(when)) fare *= NIGHT_MULTIPLIER;
  const extra = extras.reduce((s, id) => s + (EXTRAS[id] || 0), 0);
  return { distanceKm: km, total: Math.round(fare) + extra };
}

module.exports = { CAR_CLASSES, EXTRAS, quote };
