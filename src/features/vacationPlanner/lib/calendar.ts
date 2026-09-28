import { toDateKey } from './dateKey'
import { swedishHolidays } from './holidays'

export const MONTH_NAMES_SV = [
  'Januari',
  'Februari',
  'Mars',
  'April',
  'Maj',
  'Juni',
  'Juli',
  'Augusti',
  'September',
  'Oktober',
  'November',
  'December',
]

/** Indexeras med `Date.getDay()`, dvs. 0 = söndag. */
export const WEEKDAY_INITIALS_SV = ['S', 'M', 'T', 'O', 'T', 'F', 'L']

/** Indexeras med `Date.getDay()`, dvs. 0 = söndag. */
export const WEEKDAY_NAMES_SV = [
  'söndag',
  'måndag',
  'tisdag',
  'onsdag',
  'torsdag',
  'fredag',
  'lördag',
]

export interface CalendarDay {
  /** `YYYY-MM-DD` */
  key: string
  monthIndex: number
  dayOfMonth: number
  /** 0 = söndag, 6 = lördag */
  weekday: number
  isWeekend: boolean
  /** Röd dag, eller arbetsfri afton som infaller på en vardag. */
  isRedDay: boolean
  /** En dag som kostar semester när den målas in. */
  isWorkingDay: boolean
  holidayName: string | null
}

export interface MonthSpan {
  monthIndex: number
  name: string
  /** Index i dagslistan för månadens första dag. */
  firstDayIndex: number
  dayCount: number
}

export function buildCalendarYear(year: number): CalendarDay[] {
  const holidays = swedishHolidays(year)
  const days: CalendarDay[] = []
  const cursor = new Date(year, 0, 1)

  while (cursor.getFullYear() === year) {
    const key = toDateKey(cursor)
    const weekday = cursor.getDay()
    const isWeekend = weekday === 0 || weekday === 6
    const holiday = holidays.get(key)

    days.push({
      key,
      monthIndex: cursor.getMonth(),
      dayOfMonth: cursor.getDate(),
      weekday,
      isWeekend,
      // Aftnar som infaller på en helg färgas som helg – de skulle ändå inte
      // vara arbetsdagar, och grått håller nere bruset i rutnätet.
      isRedDay:
        holiday !== undefined && (holiday.isPublicHoliday || !isWeekend),
      isWorkingDay: !isWeekend && holiday === undefined,
      holidayName: holiday?.name ?? null,
    })

    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

export function buildMonthSpans(days: CalendarDay[]): MonthSpan[] {
  const spans: MonthSpan[] = []

  days.forEach((day, index) => {
    const current = spans.at(-1)

    if (current?.monthIndex === day.monthIndex) {
      current.dayCount += 1
      return
    }

    spans.push({
      monthIndex: day.monthIndex,
      name: MONTH_NAMES_SV[day.monthIndex],
      firstDayIndex: index,
      dayCount: 1,
    })
  })

  return spans
}

/**
 * ISO 8601-veckonummer för en datumnyckel.
 *
 * Veckan tillhör det år där dess torsdag ligger, vilket är varför 31 december
 * kan höra till vecka 1 och 1 januari till vecka 52 eller 53.
 */
export function isoWeekNumber(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  const target = new Date(year, month - 1, day)

  // Flytta till veckans torsdag. getDay() har söndag som 0, så den räknas om
  // till måndag som 0 först.
  const weekdayFromMonday = (target.getDay() + 6) % 7
  target.setDate(target.getDate() - weekdayFromMonday + 3)

  // 4 januari ligger alltid i vecka 1; ta reda på den veckans torsdag.
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const firstWeekdayFromMonday = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstWeekdayFromMonday + 3)

  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000

  return (
    1 +
    Math.round(
      (target.getTime() - firstThursday.getTime()) / millisecondsPerWeek,
    )
  )
}

/** T.ex. `6 juli`. */
export function formatShortDay(day: CalendarDay): string {
  return `${String(day.dayOfMonth)} ${MONTH_NAMES_SV[day.monthIndex].toLowerCase()}`
}

/** T.ex. `måndag 6 juli 2026`. */
export function formatDayLabel(day: CalendarDay, year: number): string {
  const weekday = WEEKDAY_NAMES_SV[day.weekday]
  const month = MONTH_NAMES_SV[day.monthIndex].toLowerCase()

  return `${weekday} ${String(day.dayOfMonth)} ${month} ${String(year)}`
}
