import type { CalendarDay } from './calendar'
import type {
  DayStatus,
  MemberSchedule,
  PaintBrush,
  TeamSchedule,
} from '../types'

/**
 * Antal arbetsdagar i intervallet, dvs. dagar som faktiskt kostar semester.
 * Helger och röda dagar räknas inte.
 */
export function countWorkingDaysInRange(
  days: CalendarDay[],
  fromIndex: number,
  toIndex: number,
): number {
  let count = 0

  for (let index = fromIndex; index <= toIndex; index += 1) {
    if (days[index].isWorkingDay) {
      count += 1
    }
  }

  return count
}

/**
 * Målar intervallet på en medarbetares rad.
 *
 * Bara arbetsdagar målas – helger och röda dagar lämnas orörda, eftersom de
 * inte drar semesterdagar. `radera` rensar hela intervallet.
 */
export function applyBrushToRange(
  schedule: TeamSchedule,
  memberId: string,
  days: CalendarDay[],
  fromIndex: number,
  toIndex: number,
  brush: PaintBrush,
): TeamSchedule {
  const current = schedule[memberId] ?? {}
  let next: MemberSchedule

  if (brush === 'radera') {
    const clearedKeys = new Set<string>()

    for (let index = fromIndex; index <= toIndex; index += 1) {
      clearedKeys.add(days[index].key)
    }

    next = Object.fromEntries(
      Object.entries(current).filter(([key]) => !clearedKeys.has(key)),
    )
  } else {
    next = { ...current }

    for (let index = fromIndex; index <= toIndex; index += 1) {
      const day = days[index]

      if (day.isWorkingDay) {
        next[day.key] = brush
      }
    }
  }

  return { ...schedule, [memberId]: next }
}

export interface StatusBlock {
  fromIndex: number
  toIndex: number
  status: DayStatus
  /** Antal dagar med statusen. Helger och röda dagar i luckorna räknas inte. */
  dayCount: number
}

/**
 * Hela den sammanhängande perioden runt en dag, eller `null` om dagen saknar
 * status.
 *
 * Helger och röda dagar bryter inte perioden: de målas aldrig, så en semester
 * över två veckor ligger i schemat som två grupper av vardagar med ett hål
 * emellan. Perioden sträcker sig från första till sista markerade dagen, så
 * efterföljande helger hamnar utanför.
 */
export function findStatusBlock(
  days: CalendarDay[],
  memberSchedule: MemberSchedule | undefined,
  dayIndex: number,
): StatusBlock | null {
  if (memberSchedule === undefined || dayIndex < 0 || dayIndex >= days.length) {
    return null
  }

  const status = memberSchedule[days[dayIndex].key]

  if (status === undefined) {
    return null
  }

  const hasStatus = (index: number): boolean =>
    memberSchedule[days[index].key] === status

  const isGap = (index: number): boolean =>
    memberSchedule[days[index].key] === undefined && !days[index].isWorkingDay

  let fromIndex = dayIndex

  for (let probe = dayIndex - 1; probe >= 0; probe -= 1) {
    if (hasStatus(probe)) {
      fromIndex = probe
    } else if (!isGap(probe)) {
      break
    }
  }

  let toIndex = dayIndex

  for (let probe = dayIndex + 1; probe < days.length; probe += 1) {
    if (hasStatus(probe)) {
      toIndex = probe
    } else if (!isGap(probe)) {
      break
    }
  }

  let dayCount = 0

  for (let index = fromIndex; index <= toIndex; index += 1) {
    if (hasStatus(index)) {
      dayCount += 1
    }
  }

  return { fromIndex, toIndex, status, dayCount }
}

/** Antal inlagda dagar med en viss status under året. */
export function countStatusDaysInYear(
  memberSchedule: MemberSchedule | undefined,
  days: CalendarDay[],
  status: DayStatus,
): number {
  if (memberSchedule === undefined) {
    return 0
  }

  return days.filter((day) => memberSchedule[day.key] === status).length
}
