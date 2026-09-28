import { describe, expect, it } from 'vitest'
import { buildCalendarYear } from './calendar'
import type { CalendarDay } from './calendar'
import { buildScheduleCsv, exportDayLabel } from './export'

const YEAR = buildCalendarYear(2026)

function day(key: string): CalendarDay {
  const found = YEAR.find((candidate) => candidate.key === key)

  if (found === undefined) {
    throw new Error(`Saknar ${key} i testkalendern`)
  }

  return found
}

const NO_SHORTENED: ReadonlySet<string> = new Set<string>()

describe('exportDayLabel', () => {
  it('låter inlagd status gå före dagens typ', () => {
    // 6 juli 2026 är en vanlig måndag.
    expect(
      exportDayLabel(
        day('2026-07-06'),
        { '2026-07-06': 'semester' },
        NO_SHORTENED,
      ),
    ).toBe('Semester')
    expect(
      exportDayLabel(
        day('2026-07-06'),
        { '2026-07-06': 'foraldraledig' },
        NO_SHORTENED,
      ),
    ).toBe('Föräldraledig')
  })

  it('namnger röda dagar och helger', () => {
    expect(exportDayLabel(day('2026-01-06'), undefined, NO_SHORTENED)).toBe(
      'Trettondedag jul',
    )
    expect(exportDayLabel(day('2026-07-11'), undefined, NO_SHORTENED)).toBe(
      'Helg',
    )
  })

  it('märker arbetsförkortade dagar', () => {
    expect(
      exportDayLabel(day('2026-07-06'), undefined, new Set(['2026-07-06'])),
    ).toBe('Arbetsförkortad')
  })

  it('lämnar vanliga arbetsdagar tomma', () => {
    expect(exportDayLabel(day('2026-07-06'), undefined, NO_SHORTENED)).toBe('')
  })
})

describe('buildScheduleCsv', () => {
  const days = [day('2026-07-06'), day('2026-07-11')]

  it('skriver rubrikrad med datum efter de inledande kolumnerna', () => {
    const csv = buildScheduleCsv(
      ['Medarbetare'],
      [{ leading: ['Ada Alfa'], schedule: undefined }],
      days,
      NO_SHORTENED,
    )

    expect(csv.split('\r\n')[0]).toBe('Medarbetare;2026-07-06;2026-07-11')
  })

  it('skriver en rad per person', () => {
    const csv = buildScheduleCsv(
      ['Team', 'Medarbetare'],
      [
        {
          leading: ['Plattform', 'Ada Alfa'],
          schedule: { '2026-07-06': 'semester' },
        },
        { leading: ['Plattform', 'Bo Bravo'], schedule: undefined },
      ],
      days,
      NO_SHORTENED,
    )

    const lines = csv.split('\r\n')

    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('Plattform;Ada Alfa;Semester;Helg')
    expect(lines[2]).toBe('Plattform;Bo Bravo;;Helg')
  })

  it('citerar värden som innehåller semikolon eller citattecken', () => {
    const csv = buildScheduleCsv(
      ['Team'],
      [{ leading: ['Drift; support'], schedule: undefined }],
      [],
      NO_SHORTENED,
    )

    expect(csv.split('\r\n')[1]).toBe('"Drift; support"')

    const quoted = buildScheduleCsv(
      ['Team'],
      [{ leading: ['Team "A"'], schedule: undefined }],
      [],
      NO_SHORTENED,
    )

    expect(quoted.split('\r\n')[1]).toBe('"Team ""A"""')
  })

  it('klarar en export utan rader', () => {
    const csv = buildScheduleCsv(['Medarbetare'], [], days, NO_SHORTENED)

    expect(csv).toBe('Medarbetare;2026-07-06;2026-07-11')
  })
})
