import { addDays, formatWeek, formatWeekday, weekDays, weekStart } from './week';

describe('weeks', () => {
  it('start on Monday', () => {
    expect(weekStart('2026-10-19')).toBe('2026-10-19');
    expect(weekStart('2026-10-21')).toBe('2026-10-19');
    expect(weekStart('2026-10-25')).toBe('2026-10-19');
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
  });

  it('can start in the previous month or year', () => {
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(weekStart('2027-01-01')).toBe('2026-12-28');
  });

  it('have the seven days from Monday to Sunday', () => {
    expect(weekDays('2026-12-28')).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);
  });

  it('move by whole days, across the change of time', () => {
    // Summer time ends in Spain on 25 October 2026.
    expect(addDays('2026-10-19', 7)).toBe('2026-10-26');
    expect(addDays('2026-10-26', -7)).toBe('2026-10-19');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('formatWeekday', () => {
  it('names the day of the week and its date', () => {
    expect(formatWeekday('2026-10-19', '2026-10-21')).toBe('Lunes 19 oct');
    expect(formatWeekday('2026-10-25', '2026-10-21')).toBe('Domingo 25 oct');
  });

  it('adds the year when it is not this one', () => {
    expect(formatWeekday('2027-01-01', '2026-12-30')).toBe('Viernes 1 ene 2027');
  });
});

describe('formatWeek', () => {
  it('names the month once when the week is in one', () => {
    expect(formatWeek('2026-10-19', '2026-10-21')).toBe('19–25 oct');
  });

  it('names both months when it spans two', () => {
    expect(formatWeek('2026-10-26', '2026-10-21')).toBe('26 oct – 1 nov');
  });

  it('adds the year of the days that are not in this one', () => {
    expect(formatWeek('2026-12-28', '2026-12-30')).toBe('28 dic – 3 ene 2027');
  });
});
