import { z } from 'zod';

// Dates of the pantry are calendar days ("2026-10-20"), as the API sends
// them: no time and no time zone. Whether a food expires soon depends on the
// day it is for the user, so it is worked out here, with the device's date.

export const expiryKindSchema = z.enum(['USE_BY', 'BEST_BEFORE']);
export type ExpiryKind = z.infer<typeof expiryKindSchema>;

/** In the order they are offered and the pantry is grouped. */
export const storageLocations = ['FRIDGE', 'FREEZER', 'PANTRY'] as const;
export const storageLocationSchema = z.enum(storageLocations);
export type StorageLocation = z.infer<typeof storageLocationSchema>;

export const calendarDaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const expiryKindLabels: Record<ExpiryKind, { name: string; description: string }> = {
  USE_BY: { name: 'Caducidad', description: 'No conviene consumirlo después de esa fecha.' },
  BEST_BEFORE: {
    name: 'Consumo preferente',
    description: 'Después puede perder calidad, pero seguir siendo apto.',
  },
};

export const storageLocationLabels: Record<StorageLocation, string> = {
  FRIDGE: 'Nevera',
  FREEZER: 'Congelador',
  PANTRY: 'Despensa',
};

/** Expired foods and those that expire within this many days "expire soon". */
export const EXPIRING_SOON_DAYS = 3;

const pad = (value: number) => String(value).padStart(2, '0');

/** A device date as a calendar day. */
export function toCalendarDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A calendar day as a device date, at midday so no clock change moves it. */
export function fromCalendarDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}

/** Today on the device. */
export function today(): string {
  return toCalendarDay(new Date());
}

const toUtc = (day: string) => {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date);
};

/** Whole days from `from` to `day`: 0 today, 1 tomorrow, -1 yesterday. */
export function daysUntil(day: string, from: string): number {
  return Math.round((toUtc(day) - toUtc(from)) / 86_400_000);
}

type Dated = { expiresOn: string | null; dateKind: ExpiryKind | null };

export function isExpiringSoon({ expiresOn }: Dated, on: string): boolean {
  return expiresOn !== null && daysUntil(expiresOn, on) <= EXPIRING_SOON_DAYS;
}

const months = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sept',
  'oct',
  'nov',
  'dic',
];

/**
 * "20 oct", with the year when it is not the year of `on`: "3 ene 2027".
 * Without `on`, always with the year.
 */
export function formatDay(day: string, on?: string): string {
  const [year, month, date] = day.split('-').map(Number);
  const short = `${date} ${months[month - 1]}`;
  return on !== undefined && day.slice(0, 4) === on.slice(0, 4) ? short : `${short} ${year}`;
}

/**
 * What the date of a food says, or that it has none: "Caduca mañana",
 * "Caducó el 12 oct", "Consumo preferente: 20 oct", "Sin fecha".
 */
export function describeExpiry({ expiresOn, dateKind }: Dated, on: string): string {
  if (expiresOn === null || dateKind === null) {
    return 'Sin fecha';
  }
  const days = daysUntil(expiresOn, on);
  const when = days === 0 ? 'hoy' : days === 1 ? 'mañana' : formatDay(expiresOn, on);
  if (dateKind === 'USE_BY') {
    if (days < 0) return `Caducó el ${when}`;
    return days <= 1 ? `Caduca ${when}` : `Caduca el ${when}`;
  }
  return days < 0 ? `Consumo preferente pasado: ${when}` : `Consumo preferente: ${when}`;
}

/** True for a use-by date that has passed or is today: the food may not be safe. */
export function isPastUseBy({ expiresOn, dateKind }: Dated, on: string): boolean {
  return dateKind === 'USE_BY' && expiresOn !== null && daysUntil(expiresOn, on) <= 0;
}
