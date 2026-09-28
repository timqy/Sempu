import { beforeEach, describe, expect, it } from 'vitest'
import { buildCalendarYear, buildMonthSpans, isoWeekNumber } from './calendar'
import type { CalendarDay } from './calendar'
import {
  applyBrushToRange,
  countStatusDaysInYear,
  countWorkingDaysInRange,
  findStatusBlock,
} from './schedule'
import type { PaintBrush, TeamSchedule } from '../types'

let days: CalendarDay[]

/** Index i årslistan för ett givet datum 2026. */
function indexOf(monthIndex: number, dayOfMonth: number): number {
  const index = days.findIndex(
    (day) => day.monthIndex === monthIndex && day.dayOfMonth === dayOfMonth,
  )

  expect(index).toBeGreaterThan(-1)

  return index
}

beforeEach(() => {
  days = buildCalendarYear(2026)
})

describe('buildCalendarYear', () => {
  it('täcker hela året', () => {
    expect(days).toHaveLength(365)
    expect(days[0].key).toBe('2026-01-01')
    expect(days.at(-1)?.key).toBe('2026-12-31')
  })

  it('hanterar skottår', () => {
    expect(buildCalendarYear(2028)).toHaveLength(366)
  })

  it('markerar helger och röda dagar', () => {
    // 2026-01-03 är en lördag, 2026-01-06 är trettondedag jul (en tisdag).
    expect(days[indexOf(0, 3)].isWeekend).toBe(true)
    expect(days[indexOf(0, 3)].isWorkingDay).toBe(false)

    expect(days[indexOf(0, 6)].isRedDay).toBe(true)
    expect(days[indexOf(0, 6)].isWorkingDay).toBe(false)
    expect(days[indexOf(0, 6)].holidayName).toBe('Trettondedag jul')

    expect(days[indexOf(0, 7)].isWorkingDay).toBe(true)
  })
})

describe('buildMonthSpans', () => {
  it('ger tolv månader som täcker alla dagar', () => {
    const months = buildMonthSpans(days)

    expect(months).toHaveLength(12)
    expect(months[0]).toMatchObject({
      name: 'Januari',
      firstDayIndex: 0,
      dayCount: 31,
    })
    expect(months[1].dayCount).toBe(28)
    expect(months.reduce((total, month) => total + month.dayCount, 0)).toBe(
      days.length,
    )
  })
})

describe('isoWeekNumber', () => {
  it.each([
    // 1 januari 2026 är en torsdag och hör därför till vecka 1.
    ['2026-01-01', 1],
    ['2026-01-05', 2],
    ['2026-07-06', 28],
    // 2026 har 53 veckor eftersom året börjar på en torsdag.
    ['2026-12-31', 53],
    // Nyårsdagen 2027 är en fredag och tillhör 2026 års sista vecka.
    ['2027-01-01', 53],
    // 30 december 2024 är en måndag i vecka 1 av 2025.
    ['2024-12-30', 1],
    ['2025-01-01', 1],
  ])('ger vecka %s → %i', (dateKey, expected) => {
    expect(isoWeekNumber(dateKey)).toBe(expected)
  })

  it('ökar med ett per vecka och håller sig inom giltigt spann', () => {
    const days = buildCalendarYear(2026)

    for (const day of days) {
      const week = isoWeekNumber(day.key)

      expect(week).toBeGreaterThanOrEqual(1)
      expect(week).toBeLessThanOrEqual(53)
    }

    // Alla dagar i samma måndag-till-söndag-vecka får samma nummer.
    const monday = days.find((day) => day.key === '2026-07-06')
    const sunday = days.find((day) => day.key === '2026-07-12')
    const nextMonday = days.find((day) => day.key === '2026-07-13')

    expect(isoWeekNumber(sunday?.key ?? '')).toBe(
      isoWeekNumber(monday?.key ?? ''),
    )
    expect(isoWeekNumber(nextMonday?.key ?? '')).toBe(
      isoWeekNumber(monday?.key ?? '') + 1,
    )
  })
})

describe('countWorkingDaysInRange', () => {
  it('räknar bort helger', () => {
    // Måndag 6 juli till söndag 12 juli 2026 = fem arbetsdagar.
    expect(countWorkingDaysInRange(days, indexOf(6, 6), indexOf(6, 12))).toBe(5)
  })

  it('räknar bort röda dagar', () => {
    // Påsken 2026: långfredag 3 april, påskdagen 5 april, annandag påsk 6 april.
    // Måndag 30 mars–fredag 3 april: fyra arbetsdagar, långfredagen är röd.
    expect(countWorkingDaysInRange(days, indexOf(2, 30), indexOf(3, 3))).toBe(4)
    // Onsdag 1 april–tisdag 7 april: bara 1, 2 och 7 april är arbetsdagar.
    expect(countWorkingDaysInRange(days, indexOf(3, 1), indexOf(3, 7))).toBe(3)
  })
})

describe('applyBrushToRange', () => {
  it('målar bara arbetsdagar', () => {
    const schedule = applyBrushToRange(
      {},
      'tim',
      days,
      indexOf(6, 6),
      indexOf(6, 12),
      'semester',
    )

    expect(Object.keys(schedule.tim ?? {})).toHaveLength(5)
    expect(schedule.tim?.['2026-07-06']).toBe('semester')
    expect(schedule.tim?.['2026-07-11']).toBeUndefined()
    expect(schedule.tim?.['2026-07-12']).toBeUndefined()
  })

  it('skriver över tidigare status', () => {
    const first = applyBrushToRange(
      {},
      'tim',
      days,
      indexOf(6, 6),
      indexOf(6, 10),
      'semester',
    )
    const second = applyBrushToRange(
      first,
      'tim',
      days,
      indexOf(6, 6),
      indexOf(6, 10),
      'foraldraledig',
    )

    expect(second.tim?.['2026-07-06']).toBe('foraldraledig')
  })

  it('rensar hela intervallet med radera', () => {
    const painted = applyBrushToRange(
      {},
      'tim',
      days,
      indexOf(6, 6),
      indexOf(6, 10),
      'semester',
    )
    const cleared = applyBrushToRange(
      painted,
      'tim',
      days,
      indexOf(6, 8),
      indexOf(6, 10),
      'radera',
    )

    expect(Object.keys(cleared.tim ?? {})).toEqual(['2026-07-06', '2026-07-07'])
  })

  it('lämnar andra medarbetare orörda', () => {
    const schedule: TeamSchedule = { anna: { '2026-07-06': 'semester' } }
    const next = applyBrushToRange(
      schedule,
      'tim',
      days,
      indexOf(6, 6),
      indexOf(6, 6),
      'semester',
    )

    expect(next.anna).toBe(schedule.anna)
    expect(schedule.tim).toBeUndefined()
  })
})

describe('findStatusBlock', () => {
  /** Målar ett intervall på Tims rad och returnerar hans schema. */
  function paint(
    from: [number, number],
    to: [number, number],
    brush: PaintBrush,
    base: TeamSchedule = {},
  ): TeamSchedule {
    return applyBrushToRange(
      base,
      'tim',
      days,
      indexOf(...from),
      indexOf(...to),
      brush,
    )
  }

  it('ger null för en dag utan status', () => {
    const schedule = paint([6, 6], [6, 10], 'semester')

    // 20 juli är en omålad arbetsdag, 11 juli är en helg.
    expect(findStatusBlock(days, schedule.tim, indexOf(6, 20))).toBeNull()
    expect(findStatusBlock(days, schedule.tim, indexOf(6, 11))).toBeNull()
    expect(findStatusBlock(days, undefined, indexOf(6, 6))).toBeNull()
  })

  it('sträcker sig över helgen mitt i perioden', () => {
    const schedule = paint([6, 6], [6, 17], 'semester')

    // Onsdag 8 juli ligger i första veckan av en tvåveckorssemester.
    const block = findStatusBlock(days, schedule.tim, indexOf(6, 8))

    expect(block).toMatchObject({
      fromIndex: indexOf(6, 6),
      toIndex: indexOf(6, 17),
      status: 'semester',
      dayCount: 10,
    })
  })

  it('ger samma period oavsett var i den man pekar', () => {
    const schedule = paint([6, 6], [6, 17], 'semester')

    const first = findStatusBlock(days, schedule.tim, indexOf(6, 6))
    const middle = findStatusBlock(days, schedule.tim, indexOf(6, 15))
    const last = findStatusBlock(days, schedule.tim, indexOf(6, 17))

    expect(middle).toEqual(first)
    expect(last).toEqual(first)
  })

  it('sträcker sig över en röd dag mitt i perioden', () => {
    // Kristi himmelsfärdsdag 14 maj 2026 är en torsdag mitt i intervallet.
    const schedule = paint([4, 11], [4, 15], 'semester')

    expect(findStatusBlock(days, schedule.tim, indexOf(4, 12))).toMatchObject({
      fromIndex: indexOf(4, 11),
      toIndex: indexOf(4, 15),
      dayCount: 4,
    })
  })

  it('tar inte med efterföljande helg', () => {
    const schedule = paint([6, 6], [6, 10], 'semester')

    expect(findStatusBlock(days, schedule.tim, indexOf(6, 6))).toMatchObject({
      fromIndex: indexOf(6, 6),
      toIndex: indexOf(6, 10),
      dayCount: 5,
    })
  })

  it('stannar vid en annan status', () => {
    const semester = paint([6, 6], [6, 10], 'semester')
    const schedule = paint([6, 13], [6, 17], 'foraldraledig', semester)

    expect(findStatusBlock(days, schedule.tim, indexOf(6, 8))).toMatchObject({
      toIndex: indexOf(6, 10),
      status: 'semester',
      dayCount: 5,
    })
  })

  it('stannar vid en omålad arbetsdag', () => {
    const first = paint([6, 6], [6, 7], 'semester')
    const schedule = paint([6, 9], [6, 10], 'semester', first)

    // Onsdag 8 juli är omålad och bryter perioden.
    expect(findStatusBlock(days, schedule.tim, indexOf(6, 6))).toMatchObject({
      fromIndex: indexOf(6, 6),
      toIndex: indexOf(6, 7),
      dayCount: 2,
    })
  })
})

describe('countStatusDaysInYear', () => {
  it('räknar per status', () => {
    const schedule = applyBrushToRange(
      {},
      'tim',
      days,
      indexOf(6, 6),
      indexOf(6, 17),
      'semester',
    )

    expect(countStatusDaysInYear(schedule.tim, days, 'semester')).toBe(10)
    expect(countStatusDaysInYear(schedule.tim, days, 'foraldraledig')).toBe(0)
    expect(countStatusDaysInYear(undefined, days, 'semester')).toBe(0)
  })
})
