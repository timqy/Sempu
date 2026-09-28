import { useCallback, useMemo, useState } from 'react'
import { CURRENT_USER_ID, fetchAllTeams, fetchPeople } from '../../team'
import type { Person, Team } from '../../team'
import {
  PlannerBoard,
  PlannerLegend,
  buildCalendarYear,
  buildMonthSpans,
  buildScheduleCsv,
  fetchSchedule,
  fetchShortenedDays,
} from '../../vacationPlanner'
import { downloadTextFile } from '../../../shared/lib/download'
import type { TeamSchedule } from '../../vacationPlanner'
import { buildOverviewGrouping } from '../lib/grouping'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import {
  createView,
  deleteView,
  fetchViews,
  updateView,
} from '../api/overviewApi'
import type { OverviewView } from '../types'
import { ViewEditor } from './ViewEditor'
import './Overview.css'

interface OverviewData {
  people: Person[]
  teams: Team[]
  views: OverviewView[]
  schedule: TeamSchedule
  shortenedDayKeys: string[]
}

async function loadOverviewData(): Promise<OverviewData> {
  const [people, teams, views, schedule, shortenedDayKeys] = await Promise.all([
    fetchPeople(),
    fetchAllTeams(),
    fetchViews(),
    fetchSchedule(),
    fetchShortenedDays(),
  ])

  return { people, teams, views, schedule, shortenedDayKeys }
}

export function OverviewPage() {
  const { data, isLoading, error, version, reload } =
    useAsyncData(loadOverviewData)

  if (data === null) {
    if (isLoading) {
      return <p className="planner-status">Laddar semesteröversikten…</p>
    }

    return (
      <div className="planner-status planner-status--error">
        <p>{error ?? 'Kunde inte ladda semesteröversikten'}</p>
        <button type="button" onClick={reload}>
          Försök igen
        </button>
      </div>
    )
  }

  return <OverviewWorkspace key={version} data={data} onReload={reload} />
}

interface OverviewWorkspaceProps {
  data: OverviewData
  onReload: () => void
}

function OverviewWorkspace({ data, onReload }: OverviewWorkspaceProps) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [centerRequest, setCenterRequest] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [views, setViews] = useState(data.views)
  const [selectedViewId, setSelectedViewId] = useState<string | null>(
    data.views.length > 0 ? data.views[0].id : null,
  )

  const days = useMemo(() => buildCalendarYear(year), [year])
  const months = useMemo(() => buildMonthSpans(days), [days])
  const shortenedDays = useMemo(
    () => new Set(data.shortenedDayKeys),
    [data.shortenedDayKeys],
  )

  const selectedView = views.find((view) => view.id === selectedViewId) ?? null

  const { members, groups } = useMemo(() => {
    if (selectedView === null) {
      return { members: [], groups: [] }
    }

    const teams = selectedView.teamIds
      .map((teamId) => data.teams.find((team) => team.id === teamId))
      .filter((team): team is Team => team !== undefined)

    return buildOverviewGrouping(teams, data.people)
  }, [selectedView, data.teams, data.people])

  const reportFailure = useCallback(
    (cause: unknown) => {
      setSaveError(
        cause instanceof Error ? cause.message : 'Kunde inte spara ändringen',
      )
      onReload()
    },
    [onReload],
  )

  const handleCreateView = useCallback(() => {
    createView('Ny vy', [])
      .then((view) => {
        setViews((current) => [...current, view])
        setSelectedViewId(view.id)
        setIsEditing(true)
      })
      .catch(reportFailure)
  }, [reportFailure])

  const applyViewChange = useCallback((updated: OverviewView) => {
    setViews((current) =>
      current.map((view) => (view.id === updated.id ? updated : view)),
    )
  }, [])

  const handleGoToToday = useCallback(() => {
    setYear(new Date().getFullYear())
    setCenterRequest((current) => current + 1)
  }, [])

  /** Exporterar raderna som de står i vyn, grupp för grupp. */
  const handleExport = useCallback(() => {
    const rows = groups.flatMap((group) =>
      group.rows.flatMap((row) => {
        const person = data.people.find(
          (candidate) => candidate.id === row.personId,
        )

        if (person === undefined) {
          return []
        }

        return [
          {
            leading: [group.name, person.name, person.role],
            schedule: data.schedule[person.id],
          },
        ]
      }),
    )

    const csv = buildScheduleCsv(
      ['Team', 'Medarbetare', 'Roll'],
      rows,
      days,
      shortenedDays,
    )

    const viewName = selectedView?.name ?? 'oversikt'

    downloadTextFile(`semesteroversikt-${viewName}-${String(year)}.csv`, csv)
  }, [
    groups,
    data.people,
    data.schedule,
    days,
    shortenedDays,
    selectedView,
    year,
  ])

  // Översikten är enbart läsning – ledighet läggs in i semesterplaneringen.
  const handleCommitPaint = useCallback(() => undefined, [])

  return (
    <section className="planner">
      <header className="planner-header">
        <div>
          <h1 className="planner-title">Semesteröversikt</h1>
          <p className="planner-subtitle">
            Slå ihop flera team för att se täckningen. Vyn är enbart läsning –
            ledighet läggs in under Semesterplanering.
          </p>
        </div>

        <div className="planner-toolbar">
          <div className="planner-year">
            <button
              type="button"
              className="planner-year__step"
              onClick={() => {
                setYear(year - 1)
              }}
              aria-label="Föregående år"
            >
              ‹
            </button>
            <span className="planner-year__value">{year}</span>
            <button
              type="button"
              className="planner-year__step"
              onClick={() => {
                setYear(year + 1)
              }}
              aria-label="Nästa år"
            >
              ›
            </button>
          </div>

          <button
            type="button"
            className="planner-today-button"
            onClick={handleGoToToday}
            title="Hoppa till dagens datum"
          >
            Idag
          </button>

          <button
            type="button"
            className="planner-icon-button"
            onClick={handleExport}
            title="Exportera vyn till Excel"
          >
            Exportera
          </button>
        </div>
      </header>

      <div className="planner-bar">
        <div className="team-picker">
          <label className="team-picker__label" htmlFor="overview-view-select">
            Vy
          </label>
          <select
            id="overview-view-select"
            className="team-picker__select"
            value={selectedViewId ?? ''}
            onChange={(event) => {
              setSelectedViewId(event.target.value)
              setIsEditing(false)
            }}
          >
            {views.map((view) => (
              <option key={view.id} value={view.id}>
                {view.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="team-picker__action"
            onClick={handleCreateView}
          >
            + Ny vy
          </button>
          {selectedView !== null ? (
            <button
              type="button"
              className={
                isEditing
                  ? 'team-picker__action is-active'
                  : 'team-picker__action'
              }
              aria-expanded={isEditing}
              onClick={() => {
                setIsEditing((current) => !current)
              }}
            >
              {isEditing ? 'Dölj' : 'Ändra vyn'}
            </button>
          ) : null}
        </div>

        {/* Vilka team som ingår står redan som rubrikrader i rutnätet. */}
        <span className="overview-count">
          {members.length} {members.length === 1 ? 'person' : 'personer'}
        </span>
      </div>

      {saveError !== null ? (
        <p className="planner-status planner-status--error">{saveError}</p>
      ) : null}

      {selectedView !== null && isEditing ? (
        <ViewEditor
          view={selectedView}
          teams={data.teams}
          onRename={(name) => {
            updateView(selectedView.id, { name })
              .then(applyViewChange)
              .catch(reportFailure)
          }}
          onToggleTeam={(teamId) => {
            const teamIds = selectedView.teamIds.includes(teamId)
              ? selectedView.teamIds.filter((id) => id !== teamId)
              : [...selectedView.teamIds, teamId]

            updateView(selectedView.id, { teamIds })
              .then(applyViewChange)
              .catch(reportFailure)
          }}
          onDelete={() => {
            deleteView(selectedView.id)
              .then(() => {
                setViews((current) =>
                  current.filter((view) => view.id !== selectedView.id),
                )
                setSelectedViewId(null)
                setIsEditing(false)
              })
              .catch(reportFailure)
          }}
        />
      ) : null}

      <PlannerLegend />

      {selectedView === null ? (
        <p className="planner-status">
          Ingen vy vald. Skapa en och välj vilka team som ska ingå.
        </p>
      ) : members.length === 0 ? (
        <p className="planner-status">
          Vyn innehåller inga team än. Välj team under Ändra vyn.
        </p>
      ) : (
        <PlannerBoard
          year={year}
          days={days}
          months={months}
          members={members}
          groups={groups}
          currentUserId={CURRENT_USER_ID}
          editableMemberId={null}
          brush={null}
          schedule={data.schedule}
          shortenedDays={shortenedDays}
          centerRequest={centerRequest}
          onCommitPaint={handleCommitPaint}
        />
      )}
    </section>
  )
}
