import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Person } from '../../team'
import type { CalendarDay, MonthSpan } from '../lib/calendar'
import { WEEKDAY_INITIALS_SV } from '../lib/calendar'
import { PlannerRow } from './PlannerRow'
import type {
  DayMarker,
  MemberDayCounts,
  PlannerGroup,
  RowHighlight,
  RowPreview,
  TeamSchedule,
} from '../types'

/** En rad i rutnätet: antingen en grupprubrik eller en medarbetare. */
type LayoutRow =
  | { kind: 'group'; id: string; name: string; size: number }
  | {
      kind: 'member'
      /** Unik per rad – samma person kan förekomma i flera grupper. */
      key: string
      person: Person
      subtitle: string
      isRepeat: boolean
    }

interface PanState {
  pointerId: number
  startClientX: number
  startScrollLeft: number
}

interface PlannerGridProps {
  year: number
  days: CalendarDay[]
  months: MonthSpan[]
  members: Person[]
  /** Delar in raderna under rubriker. Utan detta listas alla i följd. */
  groups?: PlannerGroup[]
  /** Markeras visuellt som "Du", även i vyer som inte går att redigera. */
  currentUserId: string
  /** Raden som går att måla på, eller `null` för en ren läsvy. */
  editableMemberId: string | null
  schedule: TeamSchedule
  shortenedDays: ReadonlySet<string>
  memberDayCounts: Record<string, MemberDayCounts>
  /** Antal dagar före idag i det visade året. */
  pastDayCount: number
  preview: (RowPreview & { memberId: string }) | null
  highlight: (RowHighlight & { memberId: string }) | null
  dayMarker: DayMarker | null
  todayIndex: number | null
  /** Dagen som centreras i vyn när året öppnas. */
  scrollToDayIndex: number | null
  /** Räknare som centrerar om vyn varje gång den ökar (Idag-knappen). */
  centerRequest: number
  onCellPointerDown: (
    memberId: string,
    dayIndex: number,
    event: ReactPointerEvent<HTMLElement>,
  ) => void
  onCellPointerEnter: (memberId: string, dayIndex: number) => void
  onCellHover: (memberId: string, dayIndex: number) => void
  onDayHover: (dayIndex: number) => void
  onHoverEnd: () => void
  onPaintSingleDay: (memberId: string, dayIndex: number) => void
}

export function PlannerGrid({
  year,
  days,
  months,
  members,
  groups,
  currentUserId,
  editableMemberId,
  schedule,
  shortenedDays,
  memberDayCounts,
  pastDayCount,
  preview,
  highlight,
  dayMarker,
  todayIndex,
  scrollToDayIndex,
  centerRequest,
  onCellPointerDown,
  onCellPointerEnter,
  onCellHover,
  onDayHover,
  onHoverEnd,
  onPaintSingleDay,
}: PlannerGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<PanState | null>(null)
  const [isPanning, setIsPanning] = useState(false)

  const layout = useMemo<LayoutRow[]>(() => {
    if (groups === undefined) {
      return members.map((person) => ({
        kind: 'member',
        key: person.id,
        person,
        subtitle: person.role,
        isRepeat: false,
      }))
    }

    return groups.flatMap((group): LayoutRow[] => {
      const rows = group.rows.flatMap((row): LayoutRow[] => {
        const person = members.find(
          (candidate) => candidate.id === row.personId,
        )

        if (person === undefined) {
          return []
        }

        return [
          {
            kind: 'member',
            key: `${group.id}:${person.id}`,
            person,
            subtitle: row.subtitle ?? person.role,
            isRepeat: row.isRepeat ?? false,
          },
        ]
      })

      return [
        { kind: 'group', id: group.id, name: group.name, size: rows.length },
        ...rows,
      ]
    })
  }, [groups, members])

  // Grupprader är lägre än medarbetarrader, så raderna måste anges explicit
  // i stället för med grid-auto-rows.
  const gridTemplateRows = useMemo(
    () =>
      [
        'var(--month-h)',
        'var(--dayhead-h)',
        ...layout.map((row) =>
          row.kind === 'group' ? 'var(--group-h)' : 'var(--row-h)',
        ),
      ].join(' '),
    [layout],
  )

  // Ett helt år är bredare än skärmen – börja vid dagens datum i stället för
  // längst till vänster i januari.
  useEffect(() => {
    const container = scrollRef.current

    if (container === null) {
      return
    }

    if (scrollToDayIndex === null) {
      container.scrollLeft = 0
      return
    }

    const target = container.querySelector<HTMLElement>(
      `[data-day-index="${String(scrollToDayIndex)}"]`,
    )

    if (target !== null) {
      container.scrollLeft = Math.max(
        0,
        target.offsetLeft - container.clientWidth / 2,
      )
    }
  }, [scrollToDayIndex, year, centerRequest])

  /**
   * Dra för att panorera. Den egna raden är reserverad för att måla dagar, så
   * där panorerar bara mittenknappen – överallt annars duger vänsterknappen.
   */
  function handlePanStart(event: ReactPointerEvent<HTMLDivElement>) {
    const container = scrollRef.current

    if (container === null || panRef.current !== null) {
      return
    }

    const isMiddleButton = event.button === 1

    if (!isMiddleButton) {
      if (event.button !== 0) {
        return
      }

      const startedOnOwnRow =
        event.target instanceof Element &&
        event.target.closest('.planner-cell--own') !== null

      if (startedOnOwnRow) {
        return
      }
    }

    event.preventDefault()
    container.setPointerCapture(event.pointerId)

    panRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startScrollLeft: container.scrollLeft,
    }

    setIsPanning(true)
  }

  function handlePanMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pan = panRef.current
    const container = scrollRef.current

    if (
      pan === null ||
      container === null ||
      pan.pointerId !== event.pointerId
    ) {
      return
    }

    container.scrollLeft =
      pan.startScrollLeft - (event.clientX - pan.startClientX)
  }

  function handlePanEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const pan = panRef.current

    if (pan?.pointerId !== event.pointerId) {
      return
    }

    scrollRef.current?.releasePointerCapture(pan.pointerId)
    panRef.current = null
    setIsPanning(false)
  }

  return (
    <div
      className={isPanning ? 'planner-scroll is-panning' : 'planner-scroll'}
      ref={scrollRef}
      onPointerDown={handlePanStart}
      onPointerMove={handlePanMove}
      onPointerUp={handlePanEnd}
      onPointerCancel={handlePanEnd}
      onPointerLeave={onHoverEnd}
    >
      <div
        className="planner-grid"
        style={{
          gridTemplateColumns: `var(--name-w) repeat(${String(days.length)}, var(--day-w))`,
          gridTemplateRows,
        }}
      >
        <div
          className="planner-corner"
          style={{ gridRow: '1 / span 2', gridColumn: 1 }}
        >
          Medarbetare
        </div>

        {months.map((month) => (
          <div
            key={month.monthIndex}
            className={`planner-month planner-month--${String(month.monthIndex)}`}
            style={{
              gridRow: 1,
              gridColumn: `${String(month.firstDayIndex + 2)} / span ${String(month.dayCount)}`,
            }}
          >
            <span className="planner-month__label">{month.name}</span>
          </div>
        ))}

        {days.map((day, dayIndex) => {
          const className = [
            'planner-dayhead',
            day.isWeekend ? 'is-weekend' : '',
            day.isRedDay ? 'is-red-day' : '',
            day.dayOfMonth === 1 ? 'is-month-start' : '',
            dayIndex === todayIndex ? 'is-today' : '',
            dayIndex < pastDayCount ? 'is-past' : '',
          ]
            .filter((part) => part !== '')
            .join(' ')

          return (
            <div
              key={day.key}
              className={className}
              style={{ gridRow: 2, gridColumn: dayIndex + 2 }}
              data-day-index={dayIndex}
              onPointerEnter={() => {
                onDayHover(dayIndex)
              }}
            >
              <span className="planner-dayhead__number">{day.dayOfMonth}</span>
              <span className="planner-dayhead__weekday">
                {WEEKDAY_INITIALS_SV[day.weekday]}
              </span>
            </div>
          )
        })}

        {/* En genomskinlig slöja över alla passerade dagar, i stället för en
            klass på var och en av rutorna. */}
        {pastDayCount > 0 && layout.length > 0 ? (
          <div
            className="planner-past"
            aria-hidden="true"
            style={{
              gridColumn: `2 / span ${String(pastDayCount)}`,
              gridRow: `3 / span ${String(layout.length)}`,
            }}
          />
        ) : null}

        {/*
          Bandet ligger under den klistrade namnkolumnen (z-index 1), medan
          etiketten måste ligga över rubrikraden. De kan därför inte vara samma
          element – ett barn kan inte bryta sig ur förälderns stackningskontext.
        */}
        {dayMarker !== null ? (
          <div
            className={`planner-daymark planner-daymark--${dayMarker.variant}`}
            aria-hidden="true"
            style={{
              gridColumn: dayMarker.dayIndex + 2,
              gridRow: `3 / span ${String(layout.length)}`,
            }}
          />
        ) : null}

        {dayMarker !== null && dayMarker.label !== null ? (
          <div
            className={`planner-daymark-label planner-daymark-label--${dayMarker.variant}`}
            style={{ gridRow: 3, gridColumn: dayMarker.dayIndex + 2 }}
          >
            <span className="planner-daymark-label__text">
              {dayMarker.label}
            </span>
          </div>
        ) : null}

        {todayIndex !== null ? (
          <div
            className="planner-today"
            aria-hidden="true"
            style={{
              gridColumn: todayIndex + 2,
              gridRow: `3 / span ${String(layout.length)}`,
            }}
          />
        ) : null}

        {layout.map((row, index) => {
          const gridRow = index + 3

          if (row.kind === 'group') {
            return (
              <Fragment key={`group:${row.id}`}>
                <div
                  className="planner-group"
                  style={{ gridRow, gridColumn: 1 }}
                >
                  <span className="planner-group__name">{row.name}</span>
                  <span className="planner-group__count">{row.size}</span>
                </div>
                <div
                  className="planner-group-band"
                  aria-hidden="true"
                  style={{ gridRow, gridColumn: '2 / -1' }}
                />
              </Fragment>
            )
          }

          const member = row.person

          return (
            <PlannerRow
              key={row.key}
              member={member}
              subtitle={row.subtitle}
              isRepeat={row.isRepeat}
              gridRow={gridRow}
              year={year}
              days={days}
              memberSchedule={schedule[member.id]}
              shortenedDays={shortenedDays}
              dayCounts={memberDayCounts[member.id]}
              isOwnRow={member.id === currentUserId}
              isEditable={member.id === editableMemberId}
              preview={
                preview !== null && preview.memberId === member.id
                  ? preview
                  : null
              }
              highlight={
                highlight !== null && highlight.memberId === member.id
                  ? highlight
                  : null
              }
              todayIndex={todayIndex}
              onCellPointerDown={onCellPointerDown}
              onCellPointerEnter={onCellPointerEnter}
              onCellHover={onCellHover}
              onPaintSingleDay={onPaintSingleDay}
            />
          )
        })}
      </div>
    </div>
  )
}
