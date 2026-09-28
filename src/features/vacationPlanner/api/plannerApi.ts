import { readDatabase, writeDatabase } from '../../../mockServer/db'
import { latency } from '../../../mockServer/latency'
import type { MemberSchedule, TeamSchedule } from '../types'

/** Scheman för hela laget. Filtreras i vyn, eftersom attrappen är liten. */
export async function fetchSchedule(): Promise<TeamSchedule> {
  await latency()

  return readDatabase().schedule
}

/** Sparar en persons hela schema. Anropas efter varje avslutat drag. */
export async function saveMemberSchedule(
  memberId: string,
  memberSchedule: MemberSchedule,
): Promise<void> {
  await latency()

  const database = readDatabase()

  writeDatabase({
    ...database,
    schedule: { ...database.schedule, [memberId]: memberSchedule },
  })
}

/** Arbetsförkortade dagar är gemensamma och gäller alla. */
export async function fetchShortenedDays(): Promise<string[]> {
  await latency()

  return readDatabase().shortenedDayKeys
}

export async function addShortenedDays(dayKeys: string[]): Promise<string[]> {
  await latency()

  const database = readDatabase()
  const merged = [...new Set([...database.shortenedDayKeys, ...dayKeys])].sort()

  writeDatabase({ ...database, shortenedDayKeys: merged })

  return merged
}

export async function removeShortenedDay(dayKey: string): Promise<string[]> {
  await latency()

  const database = readDatabase()
  const remaining = database.shortenedDayKeys.filter((key) => key !== dayKey)

  writeDatabase({ ...database, shortenedDayKeys: remaining })

  return remaining
}
