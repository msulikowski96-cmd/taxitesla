import type { RideStatus } from '../api/types';

const DAYS = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

export const pad = (n: number) => String(n).padStart(2, '0');

export function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDay(d: Date): string {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Dziś';
  if (d.toDateString() === tomorrow.toDateString()) return 'Jutro';
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDay(d)}, ${formatTime(d)}`;
}

export function formatPrice(v: number | null | undefined): string {
  if (v == null) return 'Wycena u dyspozytora';
  return `${v.toFixed(0)} zł`;
}

export function formatPhone(e164: string): string {
  const m = e164.match(/^\+48(\d{3})(\d{3})(\d{3})$/);
  return m ? `+48 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

export const STATUS_LABEL: Record<RideStatus, string> = {
  pending: 'Oczekuje na potwierdzenie',
  confirmed: 'Potwierdzony',
  driver_on_way: 'Kierowca w drodze',
  in_progress: 'W trakcie',
  completed: 'Zakończony',
  cancelled: 'Anulowany',
};

export const ACTIVE_STATUSES: RideStatus[] = ['pending', 'confirmed', 'driver_on_way', 'in_progress'];
