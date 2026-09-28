import { describe, expect, it } from 'vitest'
import { buildRotation, buildRotationWindow, shuffleWithSeed } from './rotation'

const MEMBERS = ['tim', 'anna', 'johan', 'sara', 'erik']

/** Alla är alltid tillgängliga. */
const alwaysFree = () => true

describe('shuffleWithSeed', () => {
  it('ger samma ordning för samma seed', () => {
    expect(shuffleWithSeed(MEMBERS, 'team-plattform')).toEqual(
      shuffleWithSeed(MEMBERS, 'team-plattform'),
    )
  })

  it('ger olika ordning för olika seed', () => {
    const a = shuffleWithSeed(MEMBERS, 'team-plattform')
    const b = shuffleWithSeed(MEMBERS, 'team-produkt')

    expect(a).not.toEqual(b)
  })

  it('behåller alla medlemmar och lämnar originalet orört', () => {
    const original = [...MEMBERS]
    const shuffled = shuffleWithSeed(MEMBERS, 'team-x')

    expect([...shuffled].sort()).toEqual([...MEMBERS].sort())
    expect(MEMBERS).toEqual(original)
  })
})

describe('buildRotationWindow', () => {
  it('ger begärt antal dagar från startdatum', () => {
    const window = buildRotationWindow(new Date(2026, 6, 6), 14)

    expect(window.days).toHaveLength(14)
    expect(window.days[0].key).toBe('2026-07-06')
    expect(window.days[13].key).toBe('2026-07-19')
  })

  it('sträcker sig över årsskiftet', () => {
    const window = buildRotationWindow(new Date(2026, 11, 28), 14)

    expect(window.days).toHaveLength(14)
    expect(window.days[0].key).toBe('2026-12-28')
    expect(window.days[13].key).toBe('2027-01-10')
  })

  it('numrerar bara arbetsdagar, i följd', () => {
    const window = buildRotationWindow(new Date(2026, 0, 1), 14)
    const ordinals = window.days
      .filter((day) => day.isWorkingDay)
      .map((day) => window.workingOrdinals.get(day.key) ?? -1)

    // 1 och 6 januari är röda dagar, så första arbetsdagen är 2 januari.
    expect(ordinals[0]).toBe(0)
    expect(ordinals).toEqual(ordinals.map((_, index) => index))
  })
})

describe('buildRotation', () => {
  const window = buildRotationWindow(new Date(2026, 6, 6), 14)

  it('lämnar helger och röda dagar utan ansvarig', () => {
    const rotation = buildRotation(
      window.days,
      window.workingOrdinals,
      MEMBERS,
      alwaysFree,
      'team-plattform',
    )

    for (const entry of rotation) {
      if (entry.day.isWorkingDay) {
        expect(entry.assigneeId).not.toBeNull()
      } else {
        expect(entry.assigneeId).toBeNull()
      }
    }
  })

  it('ger samma person för ett datum oavsett fönstrets start', () => {
    const fromMonday = buildRotation(
      window.days,
      window.workingOrdinals,
      MEMBERS,
      alwaysFree,
      'team-plattform',
    )

    // Samma datum sett från ett fönster som börjar tre dagar senare.
    const later = buildRotationWindow(new Date(2026, 6, 9), 14)
    const fromThursday = buildRotation(
      later.days,
      later.workingOrdinals,
      MEMBERS,
      alwaysFree,
      'team-plattform',
    )

    const shared = fromMonday.filter((entry) =>
      fromThursday.some((other) => other.day.key === entry.day.key),
    )

    expect(shared.length).toBeGreaterThan(0)

    for (const entry of shared) {
      const other = fromThursday.find(
        (candidate) => candidate.day.key === entry.day.key,
      )

      expect(other?.assigneeId).toBe(entry.assigneeId)
    }
  })

  it('roterar utan att upprepa någon inom ett varv', () => {
    const rotation = buildRotation(
      window.days,
      window.workingOrdinals,
      MEMBERS,
      alwaysFree,
      'team-plattform',
    )

    const assigned = rotation
      .filter((entry) => entry.assigneeId !== null)
      .map((entry) => entry.assigneeId)
      .slice(0, MEMBERS.length)

    expect(new Set(assigned).size).toBe(MEMBERS.length)
  })

  it('sätter in en ersättare när ordinarie är ledig', () => {
    const firstWorkday = window.days.find((day) => day.isWorkingDay)
    const order = shuffleWithSeed(MEMBERS, 'team-plattform')
    const onLeave = order[0]

    const rotation = buildRotation(
      window.days,
      window.workingOrdinals,
      MEMBERS,
      (memberId, dayKey) =>
        !(memberId === onLeave && dayKey === firstWorkday?.key),
      'team-plattform',
    )

    const entry = rotation.find(
      (candidate) => candidate.day.key === firstWorkday?.key,
    )

    // Turen står kvar hos ordinarie, men någon annan täcker upp.
    expect(entry?.assigneeId).toBe(onLeave)
    expect(entry?.substituteId).not.toBeNull()
    expect(entry?.substituteId).not.toBe(onLeave)
  })

  it('klarar ett team utan medlemmar', () => {
    const rotation = buildRotation(
      window.days,
      window.workingOrdinals,
      [],
      alwaysFree,
      'tomt',
    )

    expect(rotation).toHaveLength(14)
    expect(rotation.every((entry) => entry.assigneeId === null)).toBe(true)
  })
})
