import type { CarClassId, ExtraId, Place } from '../api/types';

export type CarClass = {
  id: CarClassId;
  name: string;
  model: string;
  description: string;
  seats: number;
  bags: number;
  startFee: number;
  perKm: number;
  minFare: number;
};

// Tariff in PLN. Keep in sync with server/src/pricing.js.
export const CAR_CLASSES: CarClass[] = [
  {
    id: 'premium',
    name: 'Premium',
    model: 'Tesla Model 3',
    description: 'Elegancki sedan na co dzień',
    seats: 4,
    bags: 2,
    startFee: 15,
    perKm: 4.2,
    minFare: 35,
  },
  {
    id: 'comfort',
    name: 'Premium XL',
    model: 'Tesla Model Y',
    description: 'Więcej miejsca na bagaż',
    seats: 4,
    bags: 4,
    startFee: 18,
    perKm: 4.8,
    minFare: 40,
  },
  {
    id: 'business',
    name: 'Business',
    model: 'Tesla Model S',
    description: 'Dla biznesu i wyjątkowych okazji',
    seats: 4,
    bags: 3,
    startFee: 25,
    perKm: 6,
    minFare: 60,
  },
  {
    id: 'vip',
    name: 'VIP',
    model: 'Tesla Model X',
    description: 'Drzwi Falcon Wing, do 6 osób',
    seats: 6,
    bags: 4,
    startFee: 35,
    perKm: 7.5,
    minFare: 90,
  },
];

export type Extra = { id: ExtraId; label: string; price: number; icon: string };

export const EXTRAS: Extra[] = [
  { id: 'child_seat', label: 'Fotelik dla dziecka', price: 20, icon: 'happy-outline' },
  { id: 'meet_greet', label: 'Powitanie z tabliczką', price: 30, icon: 'hand-left-outline' },
  { id: 'pet', label: 'Przewóz zwierzęcia', price: 15, icon: 'paw-outline' },
  { id: 'extra_luggage', label: 'Dodatkowy bagaż', price: 10, icon: 'briefcase-outline' },
];

export const NIGHT_MULTIPLIER = 1.2; // 22:00–6:00
const ROAD_FACTOR = 1.3; // straight line -> real road distance
const AVG_SPEED_KMH = 32;

export function getCarClass(id: CarClassId): CarClass {
  return CAR_CLASSES.find((c) => c.id === id) ?? CAR_CLASSES[0];
}

export function distanceKm(a: Place, b: Place): number | null {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const straight = 2 * R * Math.asin(Math.sqrt(h));
  return Math.max(1, Math.round(straight * ROAD_FACTOR * 10) / 10);
}

export function isNight(date: Date): boolean {
  const h = date.getHours();
  return h >= 22 || h < 6;
}

export type Quote = {
  distanceKm: number | null;
  durationMin: number | null;
  fare: number | null; // null = price confirmed by dispatcher
  extras: number;
  night: boolean;
  total: number | null;
};

export function quote(params: {
  pickup: Place;
  destination: Place;
  carClass: CarClassId;
  extras: ExtraId[];
  when: Date;
}): Quote {
  const car = getCarClass(params.carClass);
  const km = distanceKm(params.pickup, params.destination);
  const night = isNight(params.when);
  const extras = params.extras.reduce(
    (sum, id) => sum + (EXTRAS.find((e) => e.id === id)?.price ?? 0),
    0,
  );
  if (km == null) {
    return { distanceKm: null, durationMin: null, fare: null, extras, night, total: null };
  }
  let fare = Math.max(car.minFare, car.startFee + car.perKm * km);
  if (night) fare *= NIGHT_MULTIPLIER;
  fare = Math.round(fare);
  const durationMin = Math.max(5, Math.round((km / AVG_SPEED_KMH) * 60));
  return { distanceKm: km, durationMin, fare, extras, night, total: fare + extras };
}
