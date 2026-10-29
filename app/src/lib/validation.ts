// Returns phone in E.164 form (e.g. +48600123456) or null when invalid.
export function normalizePhone(input: string): string | null {
  const raw = input.replace(/[\s\-().]/g, '');
  if (/^\+\d{8,15}$/.test(raw)) return raw;
  if (/^00\d{8,15}$/.test(raw)) return '+' + raw.slice(2);
  if (/^\d{9}$/.test(raw)) return '+48' + raw; // Polish number without prefix
  if (/^48\d{9}$/.test(raw)) return '+' + raw;
  return null;
}

export function isEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.trim());
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Hasło musi mieć min. 8 znaków';
  if (!/\d/.test(pw) || !/[a-zA-Z]/.test(pw)) return 'Hasło musi zawierać litery i cyfry';
  return null;
}

// Polish tax ID (NIP) checksum.
export function isNip(input: string): boolean {
  const d = input.replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(d)) return false;
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = w.reduce((s, x, i) => s + x * Number(d[i]), 0);
  return sum % 11 === Number(d[9]);
}
