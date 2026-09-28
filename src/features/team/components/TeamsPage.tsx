import { useCallback, useState } from 'react'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import {
  addTeamMember,
  createTeam,
  fetchAllTeams,
  fetchPeople,
  joinTeam,
  leaveTeam,
  removeTeamMember,
  renameTeam,
} from '../api/teamApi'
import { CURRENT_USER_ID } from '../../../mockServer/db'
import type { Person, Team } from '../types'
import { getInitials } from '../index'
import { TeamMembersPanel } from './TeamMembersPanel'
import './Teams.css'

interface TeamsData {
  people: Person[]
  teams: Team[]
}

async function loadTeamsData(): Promise<TeamsData> {
  const [people, teams] = await Promise.all([fetchPeople(), fetchAllTeams()])

  return { people, teams }
}

export function TeamsPage() {
  const { data, isLoading, error, version, reload } =
    useAsyncData(loadTeamsData)

  if (data === null) {
    if (isLoading) {
      return <p className="planner-status">Laddar team…</p>
    }

    return (
      <div className="planner-status planner-status--error">
        <p>{error ?? 'Kunde inte ladda teamen'}</p>
        <button type="button" onClick={reload}>
          Försök igen
        </button>
      </div>
    )
  }

  return <TeamsWorkspace key={version} data={data} onReload={reload} />
}

interface TeamsWorkspaceProps {
  data: TeamsData
  onReload: () => void
}

function TeamsWorkspace({ data, onReload }: TeamsWorkspaceProps) {
  const [teams, setTeams] = useState(data.teams)
  const [draftName, setDraftName] = useState('')
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const myTeams = teams.filter((team) =>
    team.memberIds.includes(CURRENT_USER_ID),
  )
  const otherTeams = teams.filter(
    (team) => !team.memberIds.includes(CURRENT_USER_ID),
  )

  const reportFailure = useCallback(
    (cause: unknown) => {
      setSaveError(
        cause instanceof Error ? cause.message : 'Kunde inte spara ändringen',
      )
      onReload()
    },
    [onReload],
  )

  const applyTeamChange = useCallback((updated: Team) => {
    setTeams((current) =>
      current.map((team) => (team.id === updated.id ? updated : team)),
    )
  }, [])

  function renderTeamCard(team: Team, isMine: boolean) {
    const members = team.memberIds
      .map((id) => data.people.find((person) => person.id === id))
      .filter((person): person is Person => person !== undefined)

    const isExpanded = expandedTeamId === team.id

    return (
      <li
        key={team.id}
        className={isExpanded ? 'team-card is-expanded' : 'team-card'}
      >
        <button
          type="button"
          className="team-card__head"
          aria-expanded={isExpanded}
          onClick={() => {
            setExpandedTeamId(isExpanded ? null : team.id)
          }}
        >
          <span className="team-card__name">
            {team.name}
            {isMine ? <span className="team-card__badge">Medlem</span> : null}
          </span>

          <span className="team-card__avatars">
            {members.slice(0, 6).map((person) => (
              <span
                key={person.id}
                className={
                  person.id === CURRENT_USER_ID
                    ? 'team-card__avatar team-card__avatar--own'
                    : 'team-card__avatar'
                }
                title={`${person.name} · ${person.role}`}
              >
                {getInitials(person.name)}
              </span>
            ))}
            {members.length > 6 ? (
              <span className="team-card__avatar team-card__avatar--more">
                +{members.length - 6}
              </span>
            ) : null}
          </span>

          <span className="team-card__count">
            {members.length} {members.length === 1 ? 'medlem' : 'medlemmar'}
          </span>

          <span className="team-card__chevron" aria-hidden="true">
            ›
          </span>
        </button>

        {isExpanded ? (
          <div className="team-card__body">
            {isMine ? (
              <TeamMembersPanel
                team={team}
                people={data.people}
                onAdd={(personId) => {
                  addTeamMember(team.id, personId)
                    .then(applyTeamChange)
                    .catch(reportFailure)
                }}
                onRemove={(personId) => {
                  removeTeamMember(team.id, personId)
                    .then(applyTeamChange)
                    .catch(reportFailure)
                }}
                onRename={(name) => {
                  renameTeam(team.id, name)
                    .then(applyTeamChange)
                    .catch(reportFailure)
                }}
              />
            ) : (
              <div className="team-panel">
                <ul className="team-panel__members">
                  {members.map((person) => (
                    <li key={person.id} className="team-panel__member">
                      <span className="team-panel__avatar" aria-hidden="true">
                        {getInitials(person.name)}
                      </span>
                      <span className="team-panel__member-text">
                        <span className="team-panel__member-name">
                          {person.name}
                        </span>
                        <span className="team-panel__member-role">
                          {person.role}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="team-panel__note">
                  Gå med i teamet för att kunna ändra medlemmar.
                </p>
              </div>
            )}

            <div className="team-card__footer">
              {isMine ? (
                <button
                  type="button"
                  className="team-card__leave"
                  onClick={() => {
                    leaveTeam(team.id)
                      .then((updated) => {
                        applyTeamChange(updated)
                        setExpandedTeamId(null)
                      })
                      .catch(reportFailure)
                  }}
                >
                  Lämna teamet
                </button>
              ) : (
                <button
                  type="button"
                  className="team-card__join"
                  onClick={() => {
                    joinTeam(team.id).then(applyTeamChange).catch(reportFailure)
                  }}
                >
                  Gå med i teamet
                </button>
              )}
            </div>
          </div>
        ) : null}
      </li>
    )
  }

  return (
    <section className="planner">
      <header className="planner-header">
        <div>
          <h1 className="planner-title">Team</h1>
          <p className="planner-subtitle">
            Klicka på ett team för att hantera det. Att lämna eller tas bort ur
            ett team raderar inte din inlagda ledighet.
          </p>
        </div>

        <form
          className="team-create"
          onSubmit={(event) => {
            event.preventDefault()

            if (draftName.trim() === '') {
              return
            }

            createTeam(draftName)
              .then((team) => {
                setTeams((current) => [...current, team])
                setExpandedTeamId(team.id)
                setDraftName('')
              })
              .catch(reportFailure)
          }}
        >
          <input
            className="team-create__input"
            value={draftName}
            onChange={(event) => {
              setDraftName(event.target.value)
            }}
            placeholder="Namn på nytt team"
            aria-label="Namn på nytt team"
          />
          <button type="submit" className="team-create__submit">
            Skapa team
          </button>
        </form>
      </header>

      {saveError !== null ? (
        <p className="planner-status planner-status--error">{saveError}</p>
      ) : null}

      <h2 className="team-section">Mina team</h2>
      {myTeams.length === 0 ? (
        <p className="planner-status">
          Du är inte med i något team än. Skapa ett, eller gå med i ett nedan.
        </p>
      ) : (
        <ul className="team-list">
          {myTeams.map((team) => renderTeamCard(team, true))}
        </ul>
      )}

      <h2 className="team-section">Övriga team</h2>
      {otherTeams.length === 0 ? (
        <p className="planner-status">Du är med i alla team.</p>
      ) : (
        <ul className="team-list">
          {otherTeams.map((team) => renderTeamCard(team, false))}
        </ul>
      )}
    </section>
  )
}
