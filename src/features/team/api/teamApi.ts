import {
  CURRENT_USER_ID,
  createId,
  readDatabase,
  writeDatabase,
} from '../../../mockServer/db'
import { latency } from '../../../mockServer/latency'
import type { Person, Team } from '../types'

/**
 * Team- och personal-API.
 *
 * Anropen är asynkrona med flit: de går mot en attrapp idag, men vyerna ska
 * inte behöva ändras när en riktig backend kopplas in.
 */

export async function fetchCurrentUser(): Promise<Person> {
  await latency()

  const person = readDatabase().people.find(
    (candidate) => candidate.id === CURRENT_USER_ID,
  )

  if (person === undefined) {
    throw new Error('Inloggad användare saknas i personalregistret')
  }

  return person
}

export async function fetchPeople(): Promise<Person[]> {
  await latency()

  return readDatabase().people
}

/** Alla team den inloggade användaren är med i. */
export async function fetchMyTeams(): Promise<Team[]> {
  await latency()

  return readDatabase().teams.filter((team) =>
    team.memberIds.includes(CURRENT_USER_ID),
  )
}

export async function fetchAllTeams(): Promise<Team[]> {
  await latency()

  return readDatabase().teams
}

/** Skapar ett team med den inloggade användaren som första medlem. */
export async function createTeam(name: string): Promise<Team> {
  await latency()

  const trimmed = name.trim()

  if (trimmed === '') {
    throw new Error('Teamet måste ha ett namn')
  }

  const database = readDatabase()
  const team: Team = {
    id: createId('team'),
    name: trimmed,
    memberIds: [CURRENT_USER_ID],
  }

  writeDatabase({ ...database, teams: [...database.teams, team] })

  return team
}

export async function renameTeam(teamId: string, name: string): Promise<Team> {
  await latency()

  const trimmed = name.trim()

  if (trimmed === '') {
    throw new Error('Teamet måste ha ett namn')
  }

  return updateTeam(teamId, (team) => ({ ...team, name: trimmed }))
}

export async function addTeamMember(
  teamId: string,
  personId: string,
): Promise<Team> {
  await latency()

  return updateTeam(teamId, (team) =>
    team.memberIds.includes(personId)
      ? team
      : { ...team, memberIds: [...team.memberIds, personId] },
  )
}

/** Den inloggade användaren går med i ett team. */
export async function joinTeam(teamId: string): Promise<Team> {
  return addTeamMember(teamId, CURRENT_USER_ID)
}

/** Den inloggade användaren lämnar ett team. Ledigheten påverkas inte. */
export async function leaveTeam(teamId: string): Promise<Team> {
  return removeTeamMember(teamId, CURRENT_USER_ID)
}

export async function removeTeamMember(
  teamId: string,
  personId: string,
): Promise<Team> {
  await latency()

  return updateTeam(teamId, (team) => ({
    ...team,
    memberIds: team.memberIds.filter((id) => id !== personId),
  }))
}

function updateTeam(teamId: string, change: (team: Team) => Team): Team {
  const database = readDatabase()
  const existing = database.teams.find((team) => team.id === teamId)

  if (existing === undefined) {
    throw new Error(`Teamet ${teamId} finns inte`)
  }

  const updated = change(existing)

  writeDatabase({
    ...database,
    teams: database.teams.map((team) => (team.id === teamId ? updated : team)),
  })

  return updated
}
