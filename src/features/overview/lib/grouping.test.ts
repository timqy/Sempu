import { describe, expect, it } from 'vitest'
import type { Person, Team } from '../../team'
import { buildOverviewGrouping } from './grouping'

const PEOPLE: Person[] = [
  { id: 'tim', name: 'Tim', role: 'Utvecklare' },
  { id: 'anna', name: 'Anna', role: 'Teamledare' },
  { id: 'maja', name: 'Maja', role: 'Utvecklare' },
]

function team(id: string, name: string, memberIds: string[]): Team {
  return { id, name, memberIds }
}

describe('buildOverviewGrouping', () => {
  it('listar varje team med hela sin bemanning', () => {
    const { groups } = buildOverviewGrouping(
      [
        team('t1', 'Plattform', ['tim', 'anna']),
        team('t2', 'Produkt', ['tim', 'maja']),
      ],
      PEOPLE,
    )

    // Poängen med hela ändringen: Tim saknas inte ur Produkt.
    expect(groups[0].rows.map((row) => row.personId)).toEqual(['tim', 'anna'])
    expect(groups[1].rows.map((row) => row.personId)).toEqual(['tim', 'maja'])
  })

  it('märker bara senare förekomster som upprepning', () => {
    const { groups } = buildOverviewGrouping(
      [
        team('t1', 'Plattform', ['tim']),
        team('t2', 'Produkt', ['tim']),
        team('t3', 'Design', ['tim']),
      ],
      PEOPLE,
    )

    expect(groups[0].rows[0]).toMatchObject({
      isRepeat: false,
      subtitle: 'Plattform · Produkt · Design',
    })
    expect(groups[1].rows[0]).toMatchObject({
      isRepeat: true,
      subtitle: 'även i Plattform',
    })
    expect(groups[2].rows[0]).toMatchObject({
      isRepeat: true,
      subtitle: 'även i Plattform · Produkt',
    })
  })

  it('ger personens roll-rad teamets namn när hen bara är med i ett', () => {
    const { groups } = buildOverviewGrouping(
      [team('t1', 'Plattform', ['anna'])],
      PEOPLE,
    )

    expect(groups[0].rows[0]).toMatchObject({
      isRepeat: false,
      subtitle: 'Plattform',
    })
  })

  it('räknar varje person en gång i members, i första förekomstens ordning', () => {
    const { members } = buildOverviewGrouping(
      [
        team('t1', 'Plattform', ['tim', 'anna']),
        team('t2', 'Produkt', ['maja', 'tim']),
      ],
      PEOPLE,
    )

    expect(members.map((person) => person.id)).toEqual(['tim', 'anna', 'maja'])
  })

  it('skiljer team åt på id även när de heter likadant', () => {
    const { groups } = buildOverviewGrouping(
      [
        team('t1', 'Support', ['tim']),
        team('t2', 'Support', ['tim']),
        team('t3', 'Produkt', ['tim']),
      ],
      PEOPLE,
    )

    // Slås team ihop på namn pekar "även i" ut fel team i den tredje gruppen.
    expect(groups[1].rows[0].subtitle).toBe('även i Support')
    expect(groups[2].rows[0].subtitle).toBe('även i Support · Support')
  })

  it('hoppar över okända personer', () => {
    const { members, groups } = buildOverviewGrouping(
      [team('t1', 'Plattform', ['tim', 'finns-inte'])],
      PEOPLE,
    )

    expect(groups[0].rows.map((row) => row.personId)).toEqual(['tim'])
    expect(members).toHaveLength(1)
  })

  it('visar en person en gång per team även om hen står dubbelt i teamet', () => {
    const { groups } = buildOverviewGrouping(
      [team('t1', 'Plattform', ['tim', 'tim'])],
      PEOPLE,
    )

    expect(groups[0].rows).toHaveLength(1)
    expect(groups[0].rows[0].isRepeat).toBe(false)
  })

  it('klarar en vy utan team', () => {
    expect(buildOverviewGrouping([], PEOPLE)).toEqual({
      members: [],
      groups: [],
    })
  })
})
