// Importeras från lib-filerna och inte från featurens barrel: attrapp-servern
// sår demodata med den här modulen, och barreln drar in api-lagret som i sin
// tur läser servern – vilket ger en cirkulär import.
import type { CalendarDay } from '../../vacationPlanner/lib/calendar'
import { buildCalendarYear } from '../../vacationPlanner/lib/calendar'
import { toDateKey } from '../../vacationPlanner/lib/dateKey'

/** FNV-1a. Ger samma tal för samma sträng, vilket är hela poängen här. */
function hashSeed(value: string): number {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

/** mulberry32 – liten deterministisk slumpgenerator. */
function createRandom(seed: number): () => number {
  let state = seed

  return () => {
    state = (state + 0x6d2b79f5) >>> 0

    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Blandar listan slumpmässigt men reproducerbart: samma seed ger alltid samma
 * ordning, så turordningen inte kastas om vid varje sidladdning.
 */
export function shuffleWithSeed<T>(items: readonly T[], seed: string): T[] {
  const result = [...items]
  const random = createRandom(hashSeed(seed))

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1))
    const temp = result[index]

    result[index] = result[swapWith]
    result[swapWith] = temp
  }

  return result
}

export interface RotationWindow {
  days: CalendarDay[]
  /** Dagnyckel → dagens nummer bland årets arbetsdagar, 0-baserat. */
  workingOrdinals: Map<string, number>
}

function collectYear(year: number): RotationWindow {
  const days = buildCalendarYear(year)
  const workingOrdinals = new Map<string, number>()
  let ordinal = 0

  for (const day of days) {
    if (day.isWorkingDay) {
      workingOrdinals.set(day.key, ordinal)
      ordinal += 1
    }
  }

  return { days, workingOrdinals }
}

/** Dagarna från och med `startDate`, plus deras plats i årets arbetsdagar. */
export function buildRotationWindow(
  startDate: Date,
  dayCount: number,
): RotationWindow {
  const endDate = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate() + dayCount - 1,
  )

  const years =
    endDate.getFullYear() === startDate.getFullYear()
      ? [startDate.getFullYear()]
      : [startDate.getFullYear(), endDate.getFullYear()]

  const days: CalendarDay[] = []
  const workingOrdinals = new Map<string, number>()

  for (const year of years) {
    const collected = collectYear(year)

    days.push(...collected.days)

    for (const [key, ordinal] of collected.workingOrdinals) {
      workingOrdinals.set(key, ordinal)
    }
  }

  const startIndex = days.findIndex((day) => day.key === toDateKey(startDate))

  return {
    days:
      startIndex === -1 ? [] : days.slice(startIndex, startIndex + dayCount),
    workingOrdinals,
  }
}

export interface RotationEntry {
  day: CalendarDay
  /** Den som står på tur, oavsett frånvaro. `null` på helg och röd dag. */
  assigneeId: string | null
  /** Sätts när ordinarie är ledig och någon annan täcker upp. */
  substituteId: string | null
}

/**
 * Fördelar teamet över dagarna i en blandad men reproducerbar turordning.
 *
 * Turen räknas från årets arbetsdagar och inte från fönstrets början, så en
 * given dag får samma person oavsett när man tittar. Är ordinarie ledig visas
 * en ersättare, men turen står kvar hos ordinarie.
 */
export function buildRotation(
  days: CalendarDay[],
  workingOrdinals: ReadonlyMap<string, number>,
  memberIds: readonly string[],
  isAvailable: (memberId: string, dayKey: string) => boolean,
  seed: string,
): RotationEntry[] {
  const order = shuffleWithSeed(memberIds, seed)

  return days.map((day) => {
    if (!day.isWorkingDay || order.length === 0) {
      return { day, assigneeId: null, substituteId: null }
    }

    const index = (workingOrdinals.get(day.key) ?? 0) % order.length
    const assigneeId = order[index]

    if (isAvailable(assigneeId, day.key)) {
      return { day, assigneeId, substituteId: null }
    }

    for (let step = 1; step < order.length; step += 1) {
      const candidate = order[(index + step) % order.length]

      if (isAvailable(candidate, day.key)) {
        return { day, assigneeId, substituteId: candidate }
      }
    }

    return { day, assigneeId, substituteId: null }
  })
}
