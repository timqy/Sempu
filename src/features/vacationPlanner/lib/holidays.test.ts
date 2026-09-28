import { describe, expect, it } from 'vitest'
import { toDateKey } from './dateKey'
import { easterSunday, swedishHolidays } from './holidays'

describe('easterSunday', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2030, '2030-04-21'],
  ])('räknar ut påskdagen %i', (year, expected) => {
    expect(toDateKey(easterSunday(year))).toBe(expected)
  })

  it('infaller alltid på en söndag', () => {
    for (let year = 2020; year <= 2040; year += 1) {
      expect(easterSunday(year).getDay()).toBe(0)
    }
  })
})

describe('swedishHolidays', () => {
  it('placerar de rörliga helgdagarna rätt 2026', () => {
    const holidays = swedishHolidays(2026)

    expect(holidays.get('2026-04-03')?.name).toBe('Långfredagen')
    expect(holidays.get('2026-04-06')?.name).toBe('Annandag påsk')
    expect(holidays.get('2026-05-14')?.name).toBe('Kristi himmelsfärdsdag')
    expect(holidays.get('2026-05-24')?.name).toBe('Pingstdagen')
  })

  it('placerar de fasta helgdagarna rätt', () => {
    const holidays = swedishHolidays(2026)

    expect(holidays.get('2026-01-01')?.name).toBe('Nyårsdagen')
    expect(holidays.get('2026-01-06')?.name).toBe('Trettondedag jul')
    expect(holidays.get('2026-05-01')?.name).toBe('Första maj')
    expect(holidays.get('2026-06-06')?.name).toBe('Sveriges nationaldag')
    expect(holidays.get('2026-12-25')?.name).toBe('Juldagen')
    expect(holidays.get('2026-12-26')?.name).toBe('Annandag jul')
  })

  it('lägger midsommardagen på lördagen 20–26 juni', () => {
    for (let year = 2020; year <= 2040; year += 1) {
      const midsummer = [...swedishHolidays(year)].find(
        ([, holiday]) => holiday.name === 'Midsommardagen',
      )

      expect(midsummer).toBeDefined()

      const date = new Date(`${midsummer?.[0] ?? ''}T00:00:00`)

      expect(date.getDay()).toBe(6)
      expect(date.getMonth()).toBe(5)
      expect(date.getDate()).toBeGreaterThanOrEqual(20)
      expect(date.getDate()).toBeLessThanOrEqual(26)
    }
  })

  it('lägger alla helgons dag på lördagen 31 oktober–6 november', () => {
    for (let year = 2020; year <= 2040; year += 1) {
      const allSaints = [...swedishHolidays(year)].find(
        ([, holiday]) => holiday.name === 'Alla helgons dag',
      )

      expect(allSaints).toBeDefined()

      const date = new Date(`${allSaints?.[0] ?? ''}T00:00:00`)

      expect(date.getDay()).toBe(6)
      expect(
        date.getMonth() === 9 ? date.getDate() === 31 : date.getDate() <= 6,
      ).toBe(true)
    }
  })

  it('markerar aftnar som arbetsfria men inte röda', () => {
    const holidays = swedishHolidays(2026)

    expect(holidays.get('2026-12-24')).toEqual({
      name: 'Julafton',
      isPublicHoliday: false,
    })
    expect(holidays.get('2026-12-31')).toEqual({
      name: 'Nyårsafton',
      isPublicHoliday: false,
    })
  })
})
