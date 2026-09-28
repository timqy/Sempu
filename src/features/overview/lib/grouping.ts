import type { Person, Team } from '../../team'
import type { PlannerGroup, PlannerGroupRow } from '../../vacationPlanner'

export interface OverviewGrouping {
  /** Unika personer i vyn, i den ordning de först förekommer. */
  members: Person[]
  groups: PlannerGroup[]
}

/**
 * Delar in vyns personer per team.
 *
 * Den som är med i flera av vyns team listas under vart och ett av dem, så att
 * varje grupp visar teamets faktiska bemanning. Att i stället utelämna dem ur
 * senare grupper skulle få en grupp att sakna medlemmar som tillhör den, vilket
 * är precis den fråga vyn finns för att besvara. Upprepningarna märks i stället
 * med var personen redan stått.
 *
 * `members` innehåller varje person en gång, för uppslagning och för att kunna
 * räkna hur många personer vyn faktiskt omfattar.
 */
export function buildOverviewGrouping(
  teams: Team[],
  people: Person[],
): OverviewGrouping {
  const nameByTeamId = new Map(teams.map((team) => [team.id, team.name]))

  // Team-id och inte namn: två team kan heta likadant, och då skulle en
  // uppslagning på namn peka ut fel team.
  const teamIdsByPerson = new Map<string, string[]>()

  for (const team of teams) {
    for (const memberId of new Set(team.memberIds)) {
      const teamIds = teamIdsByPerson.get(memberId)

      if (teamIds === undefined) {
        teamIdsByPerson.set(memberId, [team.id])
      } else {
        teamIds.push(team.id)
      }
    }
  }

  function namesOf(teamIds: string[]): string {
    return teamIds
      .map((teamId) => nameByTeamId.get(teamId))
      .filter((name): name is string => name !== undefined)
      .join(' · ')
  }

  const members: Person[] = []
  const seen = new Set<string>()

  const groups = teams.map((team): PlannerGroup => {
    const addedToThisTeam = new Set<string>()

    const rows = [...team.memberIds].flatMap((memberId): PlannerGroupRow[] => {
      const person = people.find((candidate) => candidate.id === memberId)

      if (person === undefined || addedToThisTeam.has(memberId)) {
        return []
      }

      addedToThisTeam.add(memberId)

      const isRepeat = seen.has(person.id)

      if (!isRepeat) {
        seen.add(person.id)
        members.push(person)
      }

      const allTeamIds = teamIdsByPerson.get(person.id) ?? []
      const earlierTeamIds = allTeamIds.slice(0, allTeamIds.indexOf(team.id))

      return [
        {
          personId: person.id,
          isRepeat,
          subtitle: isRepeat
            ? `även i ${namesOf(earlierTeamIds)}`
            : namesOf(allTeamIds),
        },
      ]
    })

    return { id: team.id, name: team.name, rows }
  })

  return { members, groups }
}
