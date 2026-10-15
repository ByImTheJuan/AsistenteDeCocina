import {
  byExpiry,
  daysUntil,
  describeExpiry,
  formatDay,
  fromCalendarDay,
  isExpiringSoon,
  isPastUseBy,
  toCalendarDay,
} from './expiry';

const on = '2026-10-15';
const useBy = (expiresOn: string) => ({ expiresOn, dateKind: 'USE_BY' as const });
const bestBefore = (expiresOn: string) => ({ expiresOn, dateKind: 'BEST_BEFORE' as const });
const undated = { expiresOn: null, dateKind: null };

describe('calendar days', () => {
  it('counts whole days, across months and years', () => {
    expect(daysUntil('2026-10-15', on)).toBe(0);
    expect(daysUntil('2026-10-16', on)).toBe(1);
    expect(daysUntil('2026-10-14', on)).toBe(-1);
    expect(daysUntil('2026-11-01', on)).toBe(17);
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
  });

  it('turns device dates into days and back without moving them', () => {
    expect(toCalendarDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toCalendarDay(fromCalendarDay('2026-03-29'))).toBe('2026-03-29');
  });

  it('writes the day in Spanish, with the year only when it is another one', () => {
    expect(formatDay('2026-10-20', on)).toBe('20 oct');
    expect(formatDay('2026-09-01', on)).toBe('1 sept');
    expect(formatDay('2027-01-03', on)).toBe('3 ene 2027');
    expect(formatDay('2026-10-20')).toBe('20 oct 2026');
  });
});

describe('expiring soon', () => {
  it.each([
    ['2026-10-10', true], // expired
    ['2026-10-15', true], // today
    ['2026-10-18', true], // in 3 days
    ['2026-10-19', false], // in 4 days
  ])('counts %s as expiring soon: %s', (expiresOn, expected) => {
    expect(isExpiringSoon(useBy(expiresOn), on)).toBe(expected);
    expect(isExpiringSoon(bestBefore(expiresOn), on)).toBe(expected);
  });

  it('never counts a food without a date', () => {
    expect(isExpiringSoon(undated, on)).toBe(false);
  });

  it('flags a use-by date that is today or past, not a best-before one', () => {
    expect(isPastUseBy(useBy('2026-10-15'), on)).toBe(true);
    expect(isPastUseBy(useBy('2026-10-12'), on)).toBe(true);
    expect(isPastUseBy(useBy('2026-10-16'), on)).toBe(false);
    expect(isPastUseBy(bestBefore('2026-10-12'), on)).toBe(false);
  });
});

describe('byExpiry', () => {
  const food = (name: string, expiresOn: string | null) => ({
    ingredient: { name },
    expiresOn,
    dateKind: expiresOn === null ? null : ('USE_BY' as const),
  });

  it('orders the dated foods from the nearest date, by name on the same day', () => {
    const { dated, undated } = byExpiry([
      food('Yogur', '2026-11-30'),
      food('Sal', null),
      food('Pollo', '2026-10-12'),
      food('Leche', '2026-10-16'),
      food('Huevo', '2026-10-16'),
      food('Aceite', null),
    ]);

    expect(dated.map(({ ingredient }) => ingredient.name)).toEqual([
      'Pollo',
      'Huevo',
      'Leche',
      'Yogur',
    ]);
    expect(undated.map(({ ingredient }) => ingredient.name)).toEqual(['Sal', 'Aceite']);
  });
});

describe('describeExpiry', () => {
  it.each([
    [useBy('2026-10-12'), 'Caducó el 12 oct'],
    [useBy('2026-10-15'), 'Caduca hoy'],
    [useBy('2026-10-16'), 'Caduca mañana'],
    [useBy('2026-10-20'), 'Caduca el 20 oct'],
    [bestBefore('2026-10-12'), 'Consumo preferente pasado: 12 oct'],
    [bestBefore('2026-10-15'), 'Consumo preferente: hoy'],
    [bestBefore('2027-02-01'), 'Consumo preferente: 1 feb 2027'],
  ])('describes %o as «%s»', (item, expected) => {
    expect(describeExpiry(item, on)).toBe(expected);
  });

  it('says when a food has no date', () => {
    expect(describeExpiry(undated, on)).toBe('Sin fecha');
  });
});
