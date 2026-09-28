import { beforeEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'sempu:database:v4'

/**
 * Databasen cachas på modulnivå, så modulen måste laddas om mellan fallen för
 * att lagringen ska läsas på nytt.
 */
async function loadModule() {
  vi.resetModules()

  return import('./db')
}

describe('readDatabase', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('sår databasen när lagringen är tom', async () => {
    const { readDatabase } = await loadModule()
    const database = readDatabase()

    expect(database.people.length).toBeGreaterThan(0)
    expect(database.teams.length).toBeGreaterThan(0)
    expect(database.views.length).toBeGreaterThan(0)
    expect(Array.isArray(database.puHelpRequests)).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it('fyller i samlingar som saknas i sparad data', async () => {
    // Efterliknar data sparad av en äldre version, före puHelpRequests fanns.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        people: [{ id: 'zz', name: 'Zeta Zulu', role: 'Utvecklare' }],
        teams: [],
        schedule: {},
        shortenedDayKeys: [],
        views: [],
      }),
    )

    const { readDatabase } = await loadModule()
    const database = readDatabase()

    expect(Array.isArray(database.puHelpRequests)).toBe(true)

    // Sparade samlingar behålls, även när de är tomma.
    expect(database.people).toHaveLength(1)
    expect(database.teams).toEqual([])
    expect(database.views).toEqual([])
  })

  it('behåller komplett sparad data', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        people: [],
        teams: [],
        schedule: { ada: { '2026-07-06': 'semester' } },
        shortenedDayKeys: ['2026-05-04'],
        views: [],
        puHelpRequests: [],
      }),
    )

    const { readDatabase } = await loadModule()
    const database = readDatabase()

    expect(database.schedule.ada?.['2026-07-06']).toBe('semester')
    expect(database.shortenedDayKeys).toEqual(['2026-05-04'])
    expect(database.puHelpRequests).toEqual([])
  })

  it('sår om vid trasig lagring', async () => {
    localStorage.setItem(STORAGE_KEY, 'inte json')

    const { readDatabase } = await loadModule()

    expect(readDatabase().people.length).toBeGreaterThan(0)
  })

  it('sår om när lagringen innehåller något annat än ett objekt', async () => {
    localStorage.setItem(STORAGE_KEY, 'null')

    const { readDatabase } = await loadModule()
    const database = readDatabase()

    expect(database.people.length).toBeGreaterThan(0)
    expect(Array.isArray(database.puHelpRequests)).toBe(true)
  })
})
