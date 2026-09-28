import type { OverviewView } from '../features/overview/types'
import { buildRotation, buildRotationWindow } from '../features/pu/lib/rotation'
import type { PuHelpRequest } from '../features/pu/types'
import type { Person, Team } from '../features/team/types'
import { buildCalendarYear } from '../features/vacationPlanner/lib/calendar'
import type { CalendarDay } from '../features/vacationPlanner/lib/calendar'
import { applyBrushToRange } from '../features/vacationPlanner/lib/schedule'
import type { DayStatus, TeamSchedule } from '../features/vacationPlanner/types'

/**
 * Attrapp-databas som står i stället för en riktig backend.
 *
 * Allt API i appen går genom `src/features/*\/api`, som i sin tur pratar med
 * den här modulen. När ett riktigt API finns byts de modulernas innehåll ut
 * och hela `src/mockServer/` kan tas bort utan att någon vy behöver ändras.
 */
export interface Database {
  people: Person[]
  teams: Team[]
  schedule: TeamSchedule
  /** Datumnycklar för arbetsförkortade dagar. Gemensamma för alla. */
  shortenedDayKeys: string[]
  views: OverviewView[]
  puHelpRequests: PuHelpRequest[]
}

const STORAGE_KEY = 'sempu:database:v4'

export const CURRENT_USER_ID = 'ada'

/**
 * Påhittade personer. Efternamnen följer bokstaveringsalfabetet så att det ska
 * synas direkt att det är attrappdata och inte riktiga medarbetare.
 */
const SEED_PEOPLE: Person[] = [
  { id: 'ada', name: 'Ada Alfa', role: 'Utvecklare' },
  { id: 'bo', name: 'Bo Bravo', role: 'Teamledare' },
  { id: 'cia', name: 'Cia Charlie', role: 'Utvecklare' },
  { id: 'dan', name: 'Dan Delta', role: 'Utvecklare' },
  { id: 'eva', name: 'Eva Echo', role: 'Designer' },
  { id: 'filip', name: 'Filip Foxtrot', role: 'Testare' },
  { id: 'gun', name: 'Gun Golf', role: 'Testare' },
  { id: 'hugo', name: 'Hugo Hotel', role: 'Utvecklare' },
  { id: 'ida', name: 'Ida India', role: 'Produktägare' },
  { id: 'jan', name: 'Jan Juliett', role: 'Verksamhetsanalytiker' },
  { id: 'kim', name: 'Kim Kilo', role: 'Utvecklare' },
  { id: 'lo', name: 'Lo Lima', role: 'Designer' },
]

const SEED_TEAMS: Team[] = [
  {
    id: 'team-plattform',
    name: 'Plattform',
    memberIds: ['ada', 'bo', 'cia', 'dan'],
  },
  {
    id: 'team-design',
    name: 'Design & test',
    memberIds: ['eva', 'filip', 'gun'],
  },
  {
    id: 'team-produkt',
    name: 'Produkt',
    memberIds: ['ada', 'hugo', 'ida', 'jan', 'kim', 'lo'],
  },
]

const SEED_VIEWS: OverviewView[] = [
  {
    id: 'view-sommar',
    name: 'Sommartäckning',
    teamIds: ['team-plattform', 'team-design'],
  },
  {
    id: 'view-leverans',
    name: 'Leverans',
    teamIds: ['team-plattform', 'team-produkt'],
  },
]

interface SeedRange {
  memberId: string
  /** `[månad 1–12, dag]` */
  from: [number, number]
  to: [number, number]
  status: DayStatus
}

/**
 * Ledighet spridd över hela året, inte bara sommaren. Höst- och vinterperioder
 * gör att det finns något att titta på runt dagens datum och framåt, vilket en
 * ren sommarsemesterlista inte ger efter augusti.
 */
const SEED_RANGES: SeedRange[] = [
  // Ada Alfa – inloggad användare
  { memberId: 'ada', from: [7, 13], to: [7, 31], status: 'semester' },
  { memberId: 'ada', from: [10, 26], to: [10, 30], status: 'semester' },
  { memberId: 'ada', from: [12, 22], to: [12, 31], status: 'semester' },

  // Bo Bravo
  { memberId: 'bo', from: [2, 16], to: [2, 20], status: 'semester' },
  { memberId: 'bo', from: [7, 6], to: [7, 31], status: 'semester' },
  { memberId: 'bo', from: [12, 22], to: [12, 31], status: 'semester' },

  // Cia Charlie
  { memberId: 'cia', from: [3, 23], to: [3, 27], status: 'semester' },
  { memberId: 'cia', from: [7, 13], to: [8, 7], status: 'semester' },
  { memberId: 'cia', from: [11, 2], to: [11, 6], status: 'semester' },

  // Dan Delta
  { memberId: 'dan', from: [6, 22], to: [7, 10], status: 'semester' },
  { memberId: 'dan', from: [10, 19], to: [10, 23], status: 'semester' },
  { memberId: 'dan', from: [12, 28], to: [12, 31], status: 'semester' },

  // Eva Echo
  { memberId: 'eva', from: [3, 2], to: [6, 30], status: 'foraldraledig' },
  { memberId: 'eva', from: [7, 20], to: [7, 31], status: 'semester' },
  { memberId: 'eva', from: [11, 9], to: [11, 13], status: 'semester' },

  // Filip Foxtrot
  { memberId: 'filip', from: [6, 29], to: [7, 24], status: 'semester' },
  { memberId: 'filip', from: [10, 12], to: [10, 16], status: 'semester' },
  { memberId: 'filip', from: [12, 21], to: [12, 23], status: 'semester' },

  // Gun Golf
  { memberId: 'gun', from: [3, 16], to: [3, 20], status: 'semester' },
  { memberId: 'gun', from: [8, 3], to: [8, 14], status: 'semester' },
  { memberId: 'gun', from: [10, 26], to: [10, 30], status: 'semester' },

  // Hugo Hotel
  { memberId: 'hugo', from: [2, 2], to: [2, 6], status: 'semester' },
  { memberId: 'hugo', from: [8, 3], to: [8, 21], status: 'semester' },
  { memberId: 'hugo', from: [10, 26], to: [10, 30], status: 'semester' },

  // Ida India
  { memberId: 'ida', from: [2, 23], to: [2, 27], status: 'semester' },
  { memberId: 'ida', from: [7, 6], to: [7, 24], status: 'semester' },
  { memberId: 'ida', from: [11, 16], to: [11, 20], status: 'semester' },

  // Jan Juliett
  { memberId: 'jan', from: [9, 1], to: [9, 30], status: 'foraldraledig' },
  { memberId: 'jan', from: [12, 7], to: [12, 11], status: 'semester' },

  // Kim Kilo
  { memberId: 'kim', from: [2, 9], to: [2, 13], status: 'semester' },
  { memberId: 'kim', from: [7, 27], to: [8, 14], status: 'semester' },
  { memberId: 'kim', from: [11, 2], to: [11, 6], status: 'semester' },

  // Lo Lima
  { memberId: 'lo', from: [6, 15], to: [7, 3], status: 'semester' },
  { memberId: 'lo', from: [10, 19], to: [10, 23], status: 'semester' },
  { memberId: 'lo', from: [12, 28], to: [12, 31], status: 'semester' },
]

/** Datum som arbetsförkortade dagar sås på, flyttade framåt till en arbetsdag. */
const SEED_SHORTENED_DAYS: [number, number][] = [
  [5, 4],
  [6, 12],
  [9, 25],
  [12, 23],
]

function findDayIndex(
  days: CalendarDay[],
  month: number,
  dayOfMonth: number,
): number {
  return days.findIndex(
    (day) => day.monthIndex === month - 1 && day.dayOfMonth === dayOfMonth,
  )
}

function buildSeedSchedule(days: CalendarDay[]): TeamSchedule {
  return SEED_RANGES.reduce<TeamSchedule>((schedule, range) => {
    const fromIndex = findDayIndex(days, range.from[0], range.from[1])
    const toIndex = findDayIndex(days, range.to[0], range.to[1])

    if (fromIndex === -1 || toIndex === -1) {
      return schedule
    }

    return applyBrushToRange(
      schedule,
      range.memberId,
      days,
      fromIndex,
      toIndex,
      range.status,
    )
  }, {})
}

function buildSeedShortenedDays(days: CalendarDay[]): string[] {
  const keys: string[] = []

  for (const [month, dayOfMonth] of SEED_SHORTENED_DAYS) {
    let index = findDayIndex(days, month, dayOfMonth)

    // Hoppa framåt till närmaste arbetsdag – en arbetsförkortad helg vore
    // meningslös.
    while (index !== -1 && index < days.length && !days[index].isWorkingDay) {
      index += 1
    }

    if (index !== -1 && index < days.length) {
      keys.push(days[index].key)
    }
  }

  return keys
}

/**
 * En öppen bytesförfrågan från någon annan än den inloggade, så att flödet går
 * att prova. Rotationen räknas ut här för att förfrågan ska hamna på en dag
 * där personen faktiskt står på tur.
 */
function buildSeedHelpRequests(schedule: TeamSchedule): PuHelpRequest[] {
  const team = SEED_TEAMS.find((candidate) => candidate.id === 'team-plattform')

  if (team === undefined) {
    return []
  }

  const window = buildRotationWindow(new Date(), 14)
  const rotation = buildRotation(
    window.days,
    window.workingOrdinals,
    team.memberIds,
    (memberId, dayKey) => schedule[memberId]?.[dayKey] === undefined,
    team.id,
  )

  const entry = rotation.find(
    (candidate) =>
      candidate.assigneeId !== null &&
      candidate.assigneeId !== CURRENT_USER_ID &&
      candidate.substituteId === null,
  )

  if (entry?.assigneeId == null) {
    return []
  }

  return [
    {
      id: 'pu-request-seed',
      teamId: team.id,
      dayKey: entry.day.key,
      requesterId: entry.assigneeId,
      helperId: null,
    },
  ]
}

function createSeedDatabase(): Database {
  const days = buildCalendarYear(new Date().getFullYear())
  const schedule = buildSeedSchedule(days)

  return {
    people: SEED_PEOPLE,
    teams: SEED_TEAMS,
    schedule,
    shortenedDayKeys: buildSeedShortenedDays(days),
    views: SEED_VIEWS,
    puHelpRequests: buildSeedHelpRequests(schedule),
  }
}

let cache: Database | null = null

/**
 * Läser sparad data och lägger den ovanpå färsk seed-data.
 *
 * Varje samling faller tillbaka på seed när den saknas, i stället för att
 * litas på rakt av. Utan det räcker det att en äldre version sparat ett objekt
 * utan ett fält för att appen ska krascha långt från orsaken – och eftersom
 * dev-servern inte typkontrollerar fångas det inte av kompilatorn. Tomma
 * listor och objekt behålls, bara `null` och `undefined` ersätts.
 */
function load(): Database {
  if (cache !== null) {
    return cache
  }

  const seed = createSeedDatabase()

  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      const stored: Partial<Database> =
        typeof parsed === 'object' && parsed !== null ? parsed : {}

      cache = {
        people: stored.people ?? seed.people,
        teams: stored.teams ?? seed.teams,
        schedule: stored.schedule ?? seed.schedule,
        shortenedDayKeys: stored.shortenedDayKeys ?? seed.shortenedDayKeys,
        views: stored.views ?? seed.views,
        puHelpRequests: stored.puHelpRequests ?? seed.puHelpRequests,
      }

      return cache
    }
  } catch {
    // Trasig eller blockerad lagring – så om från seed i stället.
  }

  cache = seed
  persist(cache)

  return cache
}

function persist(database: Database): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database))
  } catch {
    // Full eller blockerad lagring. Appen fungerar ändå, men ändringarna
    // överlever inte en omladdning.
  }
}

/** Läser databasen. Returnerar den levande instansen – kopiera innan mutation. */
export function readDatabase(): Database {
  return load()
}

/** Skriver en ny databas och sparar den. */
export function writeDatabase(next: Database): Database {
  cache = next
  persist(next)

  return next
}

/** Slumpat id med prefix, i stället för en id-sekvens i databasen. */
export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10)

  return `${prefix}-${random}`
}

/** Nollställer till seed-data. Används av "Återställ demodata". */
export function resetDatabase(): Database {
  return writeDatabase(createSeedDatabase())
}
