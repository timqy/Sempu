import { formatDayLabel } from './calendar'
import type { CalendarDay } from './calendar'
import { STATUS_LABELS_SV } from '../types'
import type { DayStatus } from '../types'

export type DayTone =
  | 'semester'
  | 'foraldraledig'
  | 'rod-dag'
  | 'helg'
  | 'arbetsforkortad'
  | 'arbetsdag'

/**
 * Inlagd status vinner över dagens egen typ, annars faller vi tillbaka på
 * röd dag → helg → arbetsförkortad → vanlig arbetsdag.
 *
 * Arbetsförkortade dagar hamnar sist eftersom de fortfarande är arbetsdagar –
 * de kostar semester om man tar ledigt då, till skillnad från helger och röda
 * dagar.
 */
export function resolveDayTone(
  day: CalendarDay,
  status: DayStatus | undefined,
  isShortened: boolean,
): DayTone {
  if (status !== undefined) {
    return status
  }

  if (day.isRedDay) {
    return 'rod-dag'
  }

  if (day.isWeekend) {
    return 'helg'
  }

  if (isShortened) {
    return 'arbetsforkortad'
  }

  return 'arbetsdag'
}

/** Beskrivning för `title`, t.ex. `måndag 6 juli 2026 – Semester`. */
export function describeDay(
  day: CalendarDay,
  year: number,
  status: DayStatus | undefined,
  memberName: string,
  isShortened: boolean,
): string {
  const parts = [formatDayLabel(day, year)]

  if (day.holidayName !== null) {
    parts.push(day.holidayName)
  } else if (day.isWeekend) {
    parts.push('Helg')
  } else if (isShortened) {
    parts.push('Arbetsförkortad dag')
  }

  if (status !== undefined) {
    parts.push(`${memberName}: ${STATUS_LABELS_SV[status]}`)
  }

  return parts.join(' – ')
}
