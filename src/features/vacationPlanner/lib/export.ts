import type { CalendarDay } from './calendar'
import type { MemberSchedule } from '../types'

export interface ScheduleExportRow {
  /** Värden i de inledande kolumnerna, t.ex. team och namn. */
  leading: string[]
  schedule: MemberSchedule | undefined
}

/** Etikett för en dag i exporten. Tom sträng betyder vanlig arbetsdag. */
export function exportDayLabel(
  day: CalendarDay,
  schedule: MemberSchedule | undefined,
  shortenedDays: ReadonlySet<string>,
): string {
  const status = schedule?.[day.key]

  if (status === 'semester') {
    return 'Semester'
  }

  if (status === 'foraldraledig') {
    return 'Föräldraledig'
  }

  if (day.holidayName !== null) {
    return day.holidayName
  }

  if (day.isWeekend) {
    return 'Helg'
  }

  if (shortenedDays.has(day.key)) {
    return 'Arbetsförkortad'
  }

  return ''
}

/**
 * Citerar ett värde när det innehåller avgränsare, citattecken eller radbryt.
 * Citattecken dubbleras, enligt RFC 4180.
 */
function escapeCell(value: string): string {
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }

  return value
}

/**
 * Bygger en CSV som Excel öppnar direkt.
 *
 * Semikolon som avgränsare eftersom svensk Excel förväntar sig det – med komma
 * hamnar hela raden i en enda cell. Datumen skrivs som `YYYY-MM-DD` så att de
 * tolkas som datum och går att filtrera på.
 */
export function buildScheduleCsv(
  leadingHeaders: string[],
  rows: ScheduleExportRow[],
  days: CalendarDay[],
  shortenedDays: ReadonlySet<string>,
): string {
  const header = [...leadingHeaders, ...days.map((day) => day.key)]

  const body = rows.map((row) => [
    ...row.leading,
    ...days.map((day) => exportDayLabel(day, row.schedule, shortenedDays)),
  ])

  return [header, ...body]
    .map((cells) => cells.map(escapeCell).join(';'))
    .join('\r\n')
}
