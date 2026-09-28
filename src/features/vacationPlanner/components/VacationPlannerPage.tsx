import { useCallback, useMemo, useState } from 'react'
import {
  CURRENT_USER_ID,
  TeamPicker,
  fetchAllTeams,
  fetchCurrentUser,
  fetchPeople,
} from '../../team'
import type { Person, Team } from '../../team'
import {
  addShortenedDays,
  fetchSchedule,
  fetchShortenedDays,
  removeShortenedDay,
  saveMemberSchedule,
} from '../api/plannerApi'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { buildCalendarYear, buildMonthSpans } from '../lib/calendar'
import { applyBrushToRange, countStatusDaysInYear } from '../lib/schedule'
import type { Brush, TeamSchedule } from '../types'
import { buildScheduleCsv } from '../lib/export'
import { downloadTextFile } from '../../../shared/lib/download'
import { PlannerBoard } from './PlannerBoard'
import { PlannerLegend } from './PlannerLegend'
import { PlannerToolbar } from './PlannerToolbar'
import { ShortenedDaysPanel } from './ShortenedDaysPanel'
import './VacationPlanner.css'

interface PlannerData {
  currentUser: Person
  people: Person[]
  teams: Team[]
  schedule: TeamSchedule
  shortenedDayKeys: string[]
}

async function loadPlannerData(): Promise<PlannerData> {
  const [currentUser, people, teams, schedule, shortenedDayKeys] =
    await Promise.all([
      fetchCurrentUser(),
      fetchPeople(),
      fetchAllTeams(),
      fetchSchedule(),
      fetchShortenedDays(),
    ])

  return { currentUser, people, teams, schedule, shortenedDayKeys }
}

export function VacationPlannerPage() {
  const { data, isLoading, error, version, reload } =
    useAsyncData(loadPlannerData)

  if (data === null) {
    if (isLoading) {
      return <p className="planner-status">Laddar semesterplaneringen…</p>
    }

    return (
      <div className="planner-status planner-status--error">
        <p>{error ?? 'Kunde inte ladda semesterplaneringen'}</p>
        <button type="button" onClick={reload}>
          Försök igen
        </button>
      </div>
    )
  }

  // `version` som key nollställer det lokala arbetsläget när servern lästs om,
  // i stället för att synka ner svaret i state med en effekt.
  return <PlannerWorkspace key={version} data={data} onReload={reload} />
}

interface PlannerWorkspaceProps {
  data: PlannerData
  onReload: () => void
}

function PlannerWorkspace({ data, onReload }: PlannerWorkspaceProps) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  // Börjar i bläddringsläge: man väljer aktivt att börja fylla i.
  const [brush, setBrush] = useState<Brush | null>(null)
  // Ökas av Idag-knappen; rutnätet centrerar om sig varje gång värdet ändras.
  const [centerRequest, setCenterRequest] = useState(0)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Serversvaret speglas lokalt så att målandet känns direkt. Sparningen sker
  // efteråt, och vid fel läses allt om från servern.
  const [schedule, setSchedule] = useState<TeamSchedule>(data.schedule)
  const [shortenedDayKeys, setShortenedDayKeys] = useState(
    data.shortenedDayKeys,
  )
  // Väljaren listar alla team, men öppnar på ett man själv är med i.
  const myTeamIds = useMemo(
    () =>
      data.teams
        .filter((team) => team.memberIds.includes(CURRENT_USER_ID))
        .map((team) => team.id),
    [data.teams],
  )

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => {
    if (myTeamIds.length > 0) {
      return myTeamIds[0]
    }

    return data.teams.length > 0 ? data.teams[0].id : null
  })

  const days = useMemo(() => buildCalendarYear(year), [year])
  const months = useMemo(() => buildMonthSpans(days), [days])
  const shortenedDays = useMemo(
    () => new Set(shortenedDayKeys),
    [shortenedDayKeys],
  )

  const selectedTeam =
    data.teams.find((team) => team.id === selectedTeamId) ?? null

  const members = useMemo(() => {
    if (selectedTeam === null) {
      return []
    }

    return selectedTeam.memberIds
      .map((id) => data.people.find((person) => person.id === id))
      .filter((person): person is Person => person !== undefined)
  }, [selectedTeam, data.people])

  const reportFailure = useCallback(
    (cause: unknown) => {
      setSaveError(
        cause instanceof Error ? cause.message : 'Kunde inte spara ändringen',
      )
      onReload()
    },
    [onReload],
  )

  const handleCommitPaint = useCallback(
    (memberId: string, fromIndex: number, toIndex: number) => {
      if (brush === null) {
        return
      }

      setSaveError(null)

      if (brush === 'arbetsforkortad') {
        const keys = days
          .slice(fromIndex, toIndex + 1)
          .filter((day) => day.isWorkingDay)
          .map((day) => day.key)

        if (keys.length === 0) {
          return
        }

        setShortenedDayKeys((current) => [...new Set([...current, ...keys])])
        addShortenedDays(keys).catch(reportFailure)

        return
      }

      setSchedule((current) => {
        const next = applyBrushToRange(
          current,
          memberId,
          days,
          fromIndex,
          toIndex,
          brush,
        )

        saveMemberSchedule(memberId, next[memberId] ?? {}).catch(reportFailure)

        return next
      })
    },
    [brush, days, reportFailure],
  )

  const handleRemoveShortenedDay = useCallback(
    (dayKey: string) => {
      setShortenedDayKeys((current) => current.filter((key) => key !== dayKey))
      removeShortenedDay(dayKey).catch(reportFailure)
    },
    [reportFailure],
  )

  const handleGoToToday = useCallback(() => {
    setYear(new Date().getFullYear())
    setCenterRequest((current) => current + 1)
  }, [])

  // Stängs panelen medan penseln är vald skulle man annars fortsätta måla
  // gemensamma dagar utan att se att läget är på.
  const handleToggleSettings = useCallback(() => {
    setIsSettingsOpen((current) => {
      if (current) {
        setBrush((activeBrush) =>
          activeBrush === 'arbetsforkortad' ? null : activeBrush,
        )
      }

      return !current
    })
  }, [])

  const handleExport = useCallback(() => {
    const csv = buildScheduleCsv(
      ['Medarbetare', 'Roll'],
      members.map((person) => ({
        leading: [person.name, person.role],
        schedule: schedule[person.id],
      })),
      days,
      shortenedDays,
    )

    const teamName = selectedTeam?.name ?? 'team'

    downloadTextFile(`semester-${teamName}-${String(year)}.csv`, csv)
  }, [members, schedule, days, shortenedDays, selectedTeam, year])

  const ownVacationDays = countStatusDaysInYear(
    schedule[CURRENT_USER_ID],
    days,
    'semester',
  )
  const ownParentalDays = countStatusDaysInYear(
    schedule[CURRENT_USER_ID],
    days,
    'foraldraledig',
  )

  return (
    <section className="planner">
      <header className="planner-header">
        <div>
          <h1 className="planner-title">Semesterplanering</h1>
          <p className="planner-subtitle">
            {brush === null
              ? 'Dra för att bläddra i kalendern. Klicka på Semester eller Föräldraledig för att börja markera.'
              : 'Klicka och dra på din egen rad för att markera. Helger och röda dagar drar inga semesterdagar.'}
          </p>
        </div>

        <PlannerToolbar
          year={year}
          brush={brush}
          isSettingsOpen={isSettingsOpen}
          onYearChange={setYear}
          onBrushChange={setBrush}
          onGoToToday={handleGoToToday}
          onToggleSettings={handleToggleSettings}
          onExport={handleExport}
        />
      </header>

      <div className="planner-bar">
        <TeamPicker
          teams={data.teams}
          selectedTeamId={selectedTeamId}
          onSelect={setSelectedTeamId}
          myTeamIds={myTeamIds}
        />

        {brush !== null ? (
          <span className="planner-editing">
            Markerar på din rad
            <button
              type="button"
              className="planner-editing__stop"
              onClick={() => {
                setBrush(null)
              }}
            >
              Klar
            </button>
          </span>
        ) : null}

        <div className="planner-summary">
          <div className="planner-summary__item">
            <span className="planner-summary__value">{ownVacationDays}</span>
            <span className="planner-summary__label">
              planerade semesterdagar
            </span>
          </div>
          <div className="planner-summary__item">
            <span className="planner-summary__value">{ownParentalDays}</span>
            <span className="planner-summary__label">föräldralediga dagar</span>
          </div>
          <p className="planner-summary__note">
            {data.currentUser.name} · {year}
          </p>
        </div>
      </div>

      {saveError !== null ? (
        <p className="planner-status planner-status--error">{saveError}</p>
      ) : null}

      {isSettingsOpen ? (
        <ShortenedDaysPanel
          days={days}
          shortenedDays={shortenedDays}
          brush={brush}
          onBrushChange={setBrush}
          onRemove={handleRemoveShortenedDay}
        />
      ) : null}

      <PlannerLegend />

      {selectedTeam === null ? (
        <p className="planner-status">
          Du är inte med i något team än. Skapa eller gå med i ett under fliken
          Team.
        </p>
      ) : (
        <PlannerBoard
          year={year}
          days={days}
          months={months}
          members={members}
          currentUserId={CURRENT_USER_ID}
          editableMemberId={CURRENT_USER_ID}
          brush={brush}
          schedule={schedule}
          shortenedDays={shortenedDays}
          centerRequest={centerRequest}
          onCommitPaint={handleCommitPaint}
        />
      )}
    </section>
  )
}
