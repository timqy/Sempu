export type { Person, Team } from './types'
export {
  addTeamMember,
  createTeam,
  fetchAllTeams,
  fetchCurrentUser,
  fetchMyTeams,
  fetchPeople,
  joinTeam,
  leaveTeam,
  removeTeamMember,
  renameTeam,
} from './api/teamApi'
export { CURRENT_USER_ID } from '../../mockServer/db'
export { TeamPicker } from './components/TeamPicker'
export { TeamMembersPanel } from './components/TeamMembersPanel'
export { TeamsPage } from './components/TeamsPage'

/** Initialer för avatarer, t.ex. `Anna Lindqvist` → `AL`. */
export function getInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}
