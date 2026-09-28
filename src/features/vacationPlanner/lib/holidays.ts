import { toDateKey } from './dateKey'

export interface SwedishHoliday {
  name: string
  /**
   * `true` för helgdagar enligt lagen om allmänna helgdagar (röda dagar i
   * almanackan), `false` för aftnar som inte är röda men i praktiken arbetsfria.
   */
  isPublicHoliday: boolean
}

/**
 * Påskdagen enligt den gregorianska kalendern (anonyma gregorianska algoritmen).
 */
export function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

function addDays(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset)
}

/**
 * Första lördagen i intervallet. `fromDay`/`toDay` får spilla över månadsskiftet
 * (t.ex. 31 oktober–6 november uttrycks som dag 31–37 i oktober).
 */
function saturdayInRange(
  year: number,
  monthIndex: number,
  fromDay: number,
  toDay: number,
): Date {
  for (let day = fromDay; day <= toDay; day += 1) {
    const candidate = new Date(year, monthIndex, day)

    if (candidate.getDay() === 6) {
      return candidate
    }
  }

  throw new Error(
    `Hittade ingen lördag mellan dag ${String(fromDay)} och ${String(toDay)} år ${String(year)}`,
  )
}

/**
 * Svenska helgdagar och arbetsfria aftnar för ett givet år, indexerade på datumnyckel.
 *
 * Vanliga söndagar räknas formellt som röda dagar men tas inte med här – de
 * färgas som helg i planeraren.
 */
export function swedishHolidays(year: number): Map<string, SwedishHoliday> {
  const easter = easterSunday(year)
  const midsummerDay = saturdayInRange(year, 5, 20, 26)
  const allSaintsDay = saturdayInRange(year, 9, 31, 37)

  const holidays: [Date, SwedishHoliday][] = [
    [new Date(year, 0, 1), { name: 'Nyårsdagen', isPublicHoliday: true }],
    [new Date(year, 0, 6), { name: 'Trettondedag jul', isPublicHoliday: true }],
    [addDays(easter, -2), { name: 'Långfredagen', isPublicHoliday: true }],
    [addDays(easter, -1), { name: 'Påskafton', isPublicHoliday: false }],
    [easter, { name: 'Påskdagen', isPublicHoliday: true }],
    [addDays(easter, 1), { name: 'Annandag påsk', isPublicHoliday: true }],
    [new Date(year, 4, 1), { name: 'Första maj', isPublicHoliday: true }],
    [
      addDays(easter, 39),
      { name: 'Kristi himmelsfärdsdag', isPublicHoliday: true },
    ],
    [addDays(easter, 49), { name: 'Pingstdagen', isPublicHoliday: true }],
    [
      new Date(year, 5, 6),
      { name: 'Sveriges nationaldag', isPublicHoliday: true },
    ],
    [
      addDays(midsummerDay, -1),
      { name: 'Midsommarafton', isPublicHoliday: false },
    ],
    [midsummerDay, { name: 'Midsommardagen', isPublicHoliday: true }],
    [allSaintsDay, { name: 'Alla helgons dag', isPublicHoliday: true }],
    [new Date(year, 11, 24), { name: 'Julafton', isPublicHoliday: false }],
    [new Date(year, 11, 25), { name: 'Juldagen', isPublicHoliday: true }],
    [new Date(year, 11, 26), { name: 'Annandag jul', isPublicHoliday: true }],
    [new Date(year, 11, 31), { name: 'Nyårsafton', isPublicHoliday: false }],
  ]

  return new Map(holidays.map(([date, holiday]) => [toDateKey(date), holiday]))
}
