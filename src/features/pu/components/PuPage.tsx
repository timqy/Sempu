import { useCallback, useMemo, useState } from 'react'
import {
  CURRENT_USER_ID,
  TeamPicker,
  fetchAllTeams,
  fetchPeople,
  getInitials,
} from '../../team'
import type { Person, Team } from '../../team'
import {
  MONTH_NAMES_SV,
  WEEKDAY_NAMES_SV,
  fetchSchedule,
  fetchShortenedDays,
  isoWeekNumber,
} from '../../vacationPlanner'
import type { TeamSchedule } from '../../vacationPlanner'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import {
  acceptHelpRequest,
  cancelHelpRequest,
  createHelpRequest,
  fetchHelpRequests,
  withdrawFromHelpRequest,
} from '../api/puApi'
import { buildRotation, buildRotationWindow } from '../lib/rotation'
import type { RotationEntry } from '../lib/rotation'
import type { PuHelpRequest } from '../types'
import './Pu.css'

/** Idag och tre veckor framåt. */
const DAY_COUNT = 21

interface PuData {
  people: Person[]
  teams: Team[]
  schedule: TeamSchedule
  shortenedDayKeys: string[]
  helpRequests: PuHelpRequest[]
}

async function loadPuData(): Promise<PuData> {
  const [people, teams, schedule, shortenedDayKeys, helpRequests] =
    await Promise.all([
      fetchPeople(),
      fetchAllTeams(),
      fetchSchedule(),
      fetchShortenedDays(),
      fetchHelpRequests(),
    ])

  return { people, teams, schedule, shortenedDayKeys, helpRequests }
}

/** T.ex. `torsdag 11 september`. */
function formatLongDay(dateKey: string, weekday: number): string {
  const [, month, day] = dateKey.split('-').map(Number)

  return `${WEEKDAY_NAMES_SV[weekday]} ${String(day)} ${MONTH_NAMES_SV[month - 1].toLowerCase()}`
}

/** Förfrågningar gäller en dag i ett visst team. */
function requestKey(teamId: string, dayKey: string): string {
  return `${teamId}:${dayKey}`
}

/**
 * Den som faktiskt gör dagen. En accepterad förfrågan går före den automatiska
 * ersättaren, som i sin tur går före den som står på tur.
 */
function coveringIdFor(
  entry: RotationEntry,
  request: PuHelpRequest | undefined,
): string | null {
  return request?.helperId ?? entry.substituteId ?? entry.assigneeId
}

/** En av mina PU-dagar, oavsett vilket av mina team den ligger i. */
interface MyPuDay {
  entry: RotationEntry
  team: Team
  request: PuHelpRequest | undefined
}

export function PuPage() {
  const { data, isLoading, error, version, reload } = useAsyncData(loadPuData)

  if (data === null) {
    if (isLoading) {
      return <p className="planner-status">Laddar PU-schemat…</p>
    }

    return (
      <div className="planner-status planner-status--error">
        <p>{error ?? 'Kunde inte ladda PU-schemat'}</p>
        <button type="button" onClick={reload}>
          Försök igen
        </button>
      </div>
    )
  }

  return <PuWorkspace key={version} data={data} onReload={reload} />
}

interface PuWorkspaceProps {
  data: PuData
  onReload: () => void
}

function PuWorkspace({ data, onReload }: PuWorkspaceProps) {
  // Väljaren visar alla team, men egna dagar och turordningen utgår från de
  // man faktiskt är med i.
  const myTeams = useMemo(
    () => data.teams.filter((team) => team.memberIds.includes(CURRENT_USER_ID)),
    [data.teams],
  )
  const myTeamIds = useMemo(() => myTeams.map((team) => team.id), [myTeams])

  // Landa på ett eget team, men fall tillbaka på vilket som helst så att
  // sidan inte är tom för den som inte är med i något.
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => {
    if (myTeams.length > 0) {
      return myTeams[0].id
    }

    return data.teams.length > 0 ? data.teams[0].id : null
  })
  const [requests, setRequests] = useState(data.helpRequests)
  const [saveError, setSaveError] = useState<string | null>(null)

  const selectedTeam =
    data.teams.find((team) => team.id === selectedTeamId) ?? null

  const window = useMemo(() => buildRotationWindow(new Date(), DAY_COUNT), [])
  const shortenedDays = useMemo(
    () => new Set(data.shortenedDayKeys),
    [data.shortenedDayKeys],
  )

  // Nyckeln bär teamet, eftersom samma datum kan ha en förfrågan i varje team.
  const requestsByKey = useMemo(() => {
    const byKey = new Map<string, PuHelpRequest>()

    for (const request of requests) {
      byKey.set(requestKey(request.teamId, request.dayKey), request)
    }

    return byKey
  }, [requests])

  const isAvailable = useCallback(
    (memberId: string, dayKey: string) =>
      data.schedule[memberId]?.[dayKey] === undefined,
    [data.schedule],
  )

  const rotation = useMemo(() => {
    if (selectedTeam === null) {
      return []
    }

    return buildRotation(
      window.days,
      window.workingOrdinals,
      selectedTeam.memberIds,
      isAvailable,
      selectedTeam.id,
    )
  }, [window, selectedTeam, isAvailable])

  /**
   * Mina dagar i *alla* mina team. Utan det här skulle en PU-dag i ett annat
   * team vara osynlig tills man råkade byta team i väljaren.
   */
  const myDays = useMemo(() => {
    const found: MyPuDay[] = []

    for (const team of myTeams) {
      const teamRotation = buildRotation(
        window.days,
        window.workingOrdinals,
        team.memberIds,
        isAvailable,
        team.id,
      )

      for (const entry of teamRotation) {
        const request = requestsByKey.get(requestKey(team.id, entry.day.key))

        if (coveringIdFor(entry, request) === CURRENT_USER_ID) {
          found.push({ entry, team, request })
        }
      }
    }

    return found.sort((a, b) => a.entry.day.key.localeCompare(b.entry.day.key))
  }, [myTeams, window, isAvailable, requestsByKey])

  const nextOwn = myDays.length > 0 ? myDays[0] : null

  /**
   * Rotationen uppdelad i kalenderveckor. Helger utelämnas – de har aldrig
   * någon ansvarig och gör bara listan dubbelt så lång.
   */
  const weeks = useMemo(() => {
    const grouped: { week: number; entries: RotationEntry[] }[] = []

    for (const entry of rotation.filter(
      (candidate) => !candidate.day.isWeekend,
    )) {
      const week = isoWeekNumber(entry.day.key)
      const current = grouped.at(-1)

      if (current?.week === week) {
        current.entries.push(entry)
      } else {
        grouped.push({ week, entries: [entry] })
      }
    }

    return grouped
  }, [rotation])

  const openRequestCount = requests.filter(
    (request) =>
      request.helperId === null && myTeamIds.includes(request.teamId),
  ).length

  const reportFailure = useCallback(
    (cause: unknown) => {
      setSaveError(
        cause instanceof Error ? cause.message : 'Kunde inte spara ändringen',
      )
      onReload()
    },
    [onReload],
  )

  function findPerson(personId: string | null): Person | null {
    if (personId === null) {
      return null
    }

    return data.people.find((person) => person.id === personId) ?? null
  }

  function applyRequestChange(updated: PuHelpRequest) {
    setRequests((current) =>
      current.map((request) => (request.id === updated.id ? updated : request)),
    )
  }

  /**
   * Knapparna för en dag. Tar teamet explicit, eftersom spalten med mina dagar
   * visar dagar från andra team än det valda.
   */
  function renderActions(
    teamId: string,
    dayKey: string,
    request: PuHelpRequest | undefined,
    isMine: boolean,
  ) {
    if (request === undefined) {
      return isMine ? (
        <button
          type="button"
          className="pu-day__action"
          onClick={() => {
            setSaveError(null)
            createHelpRequest(teamId, dayKey)
              .then((created) => {
                setRequests((current) => [...current, created])
              })
              .catch(reportFailure)
          }}
        >
          Be om byte
        </button>
      ) : null
    }

    if (request.requesterId === CURRENT_USER_ID) {
      return (
        <button
          type="button"
          className="pu-day__action"
          onClick={() => {
            setSaveError(null)
            cancelHelpRequest(request.id)
              .then(() => {
                setRequests((current) =>
                  current.filter((candidate) => candidate.id !== request.id),
                )
              })
              .catch(reportFailure)
          }}
        >
          {request.helperId === null ? 'Ångra' : 'Ta tillbaka dagen'}
        </button>
      )
    }

    if (request.helperId === null) {
      return (
        <button
          type="button"
          className="pu-day__action pu-day__action--accept"
          onClick={() => {
            setSaveError(null)
            acceptHelpRequest(request.id)
              .then(applyRequestChange)
              .catch(reportFailure)
          }}
        >
          Ta passet
        </button>
      )
    }

    return request.helperId === CURRENT_USER_ID ? (
      <button
        type="button"
        className="pu-day__action"
        onClick={() => {
          setSaveError(null)
          withdrawFromHelpRequest(request.id)
            .then(applyRequestChange)
            .catch(reportFailure)
        }}
      >
        Lämna tillbaka
      </button>
    ) : null
  }

  const todayKey = window.days[0]?.key ?? ''

  function renderDate(entry: RotationEntry) {
    return (
      <span className="pu-day__date">
        <span className="pu-day__weekday">
          {WEEKDAY_NAMES_SV[entry.day.weekday].slice(0, 3)}
        </span>
        <span className="pu-day__number">{entry.day.dayOfMonth}</span>
        <span className="pu-day__month">
          {MONTH_NAMES_SV[entry.day.monthIndex].slice(0, 3).toLowerCase()}
        </span>
      </span>
    )
  }

  return (
    <section className="planner">
      <header className="planner-header">
        <div>
          <h1 className="planner-title">PU</h1>
          <p className="planner-subtitle">
            Dina egna dagar samlas till vänster, oavsett team. Till höger ligger
            hela turordningen för det team du valt.
          </p>
        </div>
      </header>

      {saveError !== null ? (
        <p className="planner-status planner-status--error">{saveError}</p>
      ) : null}

      {selectedTeam === null ? (
        <p className="planner-status">
          Du är inte med i något team än. Skapa eller gå med i ett under fliken
          Team.
        </p>
      ) : (
        <div className="pu-columns">
          <section className="pu-panel">
            <header className="pu-panel__head">
              <h2 className="pu-panel__title">Mina PU-dagar</h2>
              <span className="pu-panel__hint">Alla dina team</span>
            </header>

            <div className="pu-panel__body">
              <div className="pu-stats">
                <span className="pu-stats__value">{myDays.length}</span>
                <span className="pu-stats__label">
                  {myDays.length === 1 ? 'PU-dag för dig' : 'PU-dagar för dig'}
                </span>

                <span className="pu-stats__next">
                  {nextOwn === null ? (
                    <span className="pu-stats__none">
                      Du står inte på tur de kommande två veckorna
                    </span>
                  ) : (
                    <>
                      <span className="pu-stats__next-label">
                        {nextOwn.entry.day.key === todayKey
                          ? 'Du har PU idag'
                          : 'Din nästa'}{' '}
                        · {nextOwn.team.name}
                      </span>
                      <span className="pu-stats__next-date">
                        {formatLongDay(
                          nextOwn.entry.day.key,
                          nextOwn.entry.day.weekday,
                        )}
                      </span>
                    </>
                  )}
                </span>
              </div>

              {myDays.length === 0 ? (
                <p className="pu-empty">Inga dagar de kommande två veckorna.</p>
              ) : (
                <ol className="pu-list">
                  {myDays.map((day) => {
                    const isOpen = day.request?.helperId === null

                    const className = [
                      'pu-day',
                      'is-mine',
                      day.entry.day.key === todayKey ? 'is-today' : '',
                      isOpen ? 'is-open' : '',
                    ]
                      .filter((part) => part !== '')
                      .join(' ')

                    return (
                      <li
                        key={`${day.team.id}:${day.entry.day.key}`}
                        className={className}
                      >
                        {renderDate(day.entry)}

                        {day.entry.day.key === todayKey ? (
                          <span className="pu-day__today">Idag</span>
                        ) : null}

                        <span className="pu-mine__team">{day.team.name}</span>

                        <span className="pu-day__trailing">
                          {shortenedDays.has(day.entry.day.key) ? (
                            <span
                              className="pu-day__dot"
                              role="img"
                              aria-label="Arbetsförkortad dag"
                              title="Arbetsförkortad dag"
                            />
                          ) : null}

                          {isOpen ? (
                            <span className="pu-day__tag">Söker byte</span>
                          ) : null}

                          {renderActions(
                            day.team.id,
                            day.entry.day.key,
                            day.request,
                            true,
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              )}

              {openRequestCount > 0 ? (
                <p className="pu-panel__footnote">
                  {openRequestCount === 1
                    ? '1 dag i dina team söker byte'
                    : `${String(openRequestCount)} dagar i dina team söker byte`}
                </p>
              ) : null}
            </div>
          </section>

          <section className="pu-panel pu-panel--scrollable">
            <header className="pu-panel__head">
              <h2 className="pu-panel__title">Turordning</h2>
              <span className="pu-panel__hint">Vardagar, tre veckor</span>
              <TeamPicker
                teams={data.teams}
                selectedTeamId={selectedTeamId}
                onSelect={setSelectedTeamId}
                myTeamIds={myTeamIds}
              />
            </header>

            <div className="pu-panel__body pu-panel__body--scroll">
              <ul className="pu-weeks">
                {weeks.map((group) => (
                  <li key={group.week} className="pu-week">
                    <h3 className="pu-week__title">Vecka {group.week}</h3>

                    <ol className="pu-list">
                      {group.entries.map((entry) => {
                        const request = requestsByKey.get(
                          requestKey(selectedTeam.id, entry.day.key),
                        )
                        const assignee = findPerson(entry.assigneeId)
                        const substitute = findPerson(entry.substituteId)
                        const helper = findPerson(request?.helperId ?? null)
                        const requester = findPerson(
                          request?.requesterId ?? null,
                        )
                        const covering = helper ?? substitute ?? assignee

                        const isMine = covering?.id === CURRENT_USER_ID
                        const isOpen = request !== undefined && helper === null
                        const isMyRequest =
                          request?.requesterId === CURRENT_USER_ID

                        const className = [
                          'pu-day',
                          entry.day.key === todayKey ? 'is-today' : '',
                          entry.day.isWorkingDay ? '' : 'is-off',
                          isMine ? 'is-mine' : '',
                          isOpen ? 'is-open' : '',
                        ]
                          .filter((part) => part !== '')
                          .join(' ')

                        return (
                          <li key={entry.day.key} className={className}>
                            {renderDate(entry)}

                            {entry.day.key === todayKey ? (
                              <span className="pu-day__today">Idag</span>
                            ) : null}

                            {!entry.day.isWorkingDay ? (
                              <span className="pu-day__reason">
                                {entry.day.holidayName ?? 'Helg'}
                              </span>
                            ) : isOpen ? (
                              <span className="pu-day__assignee">
                                <span className="pu-day__avatar pu-day__avatar--open">
                                  ?
                                </span>
                                <span className="pu-day__name">Söker byte</span>
                                <span className="pu-day__substitute">
                                  {isMyRequest
                                    ? 'du kan inte ta dagen'
                                    : `${requester?.name ?? ''} kan inte ta dagen`}
                                </span>
                              </span>
                            ) : covering === null ? (
                              <span className="pu-day__reason">
                                Ingen i teamet är tillgänglig
                              </span>
                            ) : (
                              <span className="pu-day__assignee">
                                <span
                                  className={
                                    isMine
                                      ? 'pu-day__avatar pu-day__avatar--own'
                                      : 'pu-day__avatar'
                                  }
                                  aria-hidden="true"
                                >
                                  {getInitials(covering.name)}
                                </span>
                                <span className="pu-day__name">
                                  {isMine ? 'Du' : covering.name}
                                </span>
                                {helper !== null && requester !== null ? (
                                  <span className="pu-day__substitute">
                                    tog över från {requester.name}
                                  </span>
                                ) : substitute !== null && assignee !== null ? (
                                  <span className="pu-day__substitute">
                                    ersätter {assignee.name}
                                  </span>
                                ) : null}
                              </span>
                            )}

                            {/* Ingen statustagg här: raden visar redan "Söker
                                byte" som namn när den är öppen. */}
                            <span className="pu-day__trailing">
                              {shortenedDays.has(entry.day.key) ? (
                                <span
                                  className="pu-day__dot"
                                  role="img"
                                  aria-label="Arbetsförkortad dag"
                                  title="Arbetsförkortad dag"
                                />
                              ) : null}

                              {entry.day.isWorkingDay && covering !== null
                                ? renderActions(
                                    selectedTeam.id,
                                    entry.day.key,
                                    request,
                                    isMine,
                                  )
                                : null}
                            </span>
                          </li>
                        )
                      })}
                    </ol>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
