import { useCallback, useMemo, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Person } from '../../team'
import { useRowDragSelection } from '../hooks/useRowDragSelection'
import { formatShortDay } from '../lib/calendar'
import type { CalendarDay, MonthSpan } from '../lib/calendar'
import { toDateKey } from '../lib/dateKey'
import {
  countStatusDaysInYear,
  countWorkingDaysInRange,
  findStatusBlock,
} from '../lib/schedule'
import type {
  Brush,
  DayMarker,
  HoverTarget,
  MemberDayCounts,
  PlannerGroup,
  RowSelection,
  TeamSchedule,
} from '../types'
import { PlannerGrid } from './PlannerGrid'

function pluralize(count: number, singular: string, plural: string): string {
  return `${String(count)} ${count === 1 ? singular : plural}`
}

const NO_HOVER: HoverTarget = { row: null, day: null }

/**
 * Stabil identitet för en hovermarkering, så att muspekaren kan svepa genom
 * samma period utan att raden renderas om för varje ruta.
 */
function hoverKey(target: HoverTarget): string {
  const row =
    target.row === null
      ? '-'
      : `${target.row.memberId}:${String(target.row.fromIndex)}:${String(target.row.toIndex)}`
  const day =
    target.day === null
      ? '-'
      : `${String(target.day.dayIndex)}:${target.day.variant}:${target.day.label ?? '-'}`

  return `${row}|${day}`
}

interface PlannerBoardProps {
  year: number
  days: CalendarDay[]
  months: MonthSpan[]
  members: Person[]
  /** Delar in raderna under rubriker, t.ex. ett team per grupp. */
  groups?: PlannerGroup[]
  currentUserId: string
  /** `null` ger en ren läsvy, som i semesteröversikten. */
  editableMemberId: string | null
  /** `null` betyder bläddringsläge – inget går att måla förrän ett val gjorts. */
  brush: Brush | null
  schedule: TeamSchedule
  shortenedDays: ReadonlySet<string>
  centerRequest: number
  onCommitPaint: (memberId: string, fromIndex: number, toIndex: number) => void
}

/**
 * Rutnätet med all interaktion: drag för att måla, hover för att markera,
 * panorering och centrering. Vad ett drag faktiskt sparar avgörs av den som
 * använder komponenten, genom `onCommitPaint`.
 */
export function PlannerBoard({
  year,
  days,
  months,
  members,
  groups,
  currentUserId,
  editableMemberId,
  brush,
  schedule,
  shortenedDays,
  centerRequest,
  onCommitPaint,
}: PlannerBoardProps) {
  const [hover, setHover] = useState<HoverTarget>(NO_HOVER)

  // Redigering är ett aktivt val: utan pensel är hela rutnätet bara läsbart,
  // och drag flyttar vyn i stället för att fylla i.
  const paintableMemberId = brush === null ? null : editableMemberId

  const todayIndex = useMemo(() => {
    const todayKey = toDateKey(new Date())
    const index = days.findIndex((day) => day.key === todayKey)

    return index === -1 ? null : index
  }, [days])

  // Dagnycklar är sorterbara som strängar, vilket gör jämförelsen giltig även
  // för år utan någon "idag" i vyn.
  const pastDayCount = useMemo(() => {
    const todayKey = toDateKey(new Date())

    return days.filter((day) => day.key < todayKey).length
  }, [days])

  const commitSelection = useCallback(
    (selection: RowSelection) => {
      onCommitPaint(selection.memberId, selection.fromIndex, selection.toIndex)
    },
    [onCommitPaint],
  )

  const { selection, beginDrag, extendDrag } =
    useRowDragSelection(commitSelection)

  const handleCellPointerDown = useCallback(
    (
      memberId: string,
      dayIndex: number,
      event: ReactPointerEvent<HTMLElement>,
    ) => {
      if (memberId !== paintableMemberId) {
        return
      }

      beginDrag(memberId, dayIndex, event)
    },
    [beginDrag, paintableMemberId],
  )

  const handleCellPointerEnter = useCallback(
    (memberId: string, dayIndex: number) => {
      extendDrag(memberId, dayIndex)
    },
    [extendDrag],
  )

  const handlePaintSingleDay = useCallback(
    (memberId: string, dayIndex: number) => {
      if (memberId !== paintableMemberId) {
        return
      }

      onCommitPaint(memberId, dayIndex, dayIndex)
    },
    [onCommitPaint, paintableMemberId],
  )

  const applyHover = useCallback((next: HoverTarget) => {
    setHover((current) =>
      hoverKey(current) === hoverKey(next) ? current : next,
    )
  }, [])

  /** Röda dagar och arbetsförkortade dagar hör båda till kalendern. */
  const describeDay = useCallback(
    (dayIndex: number): DayMarker | null => {
      const day = days[dayIndex]

      if (day.holidayName !== null) {
        return {
          dayIndex,
          variant: 'roddag',
          label: `${day.holidayName} · ${formatShortDay(day)}`,
        }
      }

      if (shortenedDays.has(day.key)) {
        return {
          dayIndex,
          variant: 'arbetsforkortad',
          label: `Arbetsförkortad dag · ${formatShortDay(day)}`,
        }
      }

      return null
    },
    [days, shortenedDays],
  )

  const handleCellHover = useCallback(
    (memberId: string, dayIndex: number) => {
      const block = findStatusBlock(days, schedule[memberId], dayIndex)
      const day = describeDay(dayIndex)

      if (block === null) {
        applyHover({ row: null, day })
        return
      }

      const range = `${formatShortDay(days[block.fromIndex])}–${formatShortDay(
        days[block.toIndex],
      )}`
      const dayCountLabel =
        block.status === 'semester'
          ? pluralize(block.dayCount, 'semesterdag', 'semesterdagar')
          : pluralize(
              block.dayCount,
              'föräldraledig dag',
              'föräldralediga dagar',
            )

      // Båda markeringarna visas. Dagens etikett flyttas in i radens stapel i
      // stället för att ritas vid rutnätets topp, så de två hamnar ovanför
      // varandra i stället för att krocka.
      applyHover({
        row: {
          memberId,
          fromIndex: block.fromIndex,
          toIndex: block.toIndex,
          label: `${dayCountLabel} · ${range}`,
          dayLabel:
            day?.label == null
              ? undefined
              : { text: day.label, variant: day.variant },
        },
        day: day === null ? null : { ...day, label: null },
      })
    },
    [days, schedule, applyHover, describeDay],
  )

  const handleDayHover = useCallback(
    (dayIndex: number) => {
      applyHover({ row: null, day: describeDay(dayIndex) })
    },
    [applyHover, describeDay],
  )

  const handleHoverEnd = useCallback(() => {
    setHover(NO_HOVER)
  }, [])

  const preview = useMemo(() => {
    if (selection === null || brush === null) {
      return null
    }

    const { fromIndex, toIndex } = selection
    const range = `${formatShortDay(days[fromIndex])}–${formatShortDay(days[toIndex])}`
    const workingDays = countWorkingDaysInRange(days, fromIndex, toIndex)

    let label: string

    if (brush === 'radera') {
      const marked = days
        .slice(fromIndex, toIndex + 1)
        .filter(
          (day) => schedule[selection.memberId]?.[day.key] !== undefined,
        ).length

      label = `${pluralize(marked, 'dag rensas', 'dagar rensas')} · ${range}`
    } else if (brush === 'arbetsforkortad') {
      label = `${pluralize(workingDays, 'arbetsförkortad dag', 'arbetsförkortade dagar')} · ${range}`
    } else if (brush === 'semester') {
      label = `${pluralize(workingDays, 'semesterdag', 'semesterdagar')} · ${range}`
    } else {
      label = `${pluralize(workingDays, 'föräldraledig dag', 'föräldralediga dagar')} · ${range}`
    }

    return { ...selection, brush, label }
  }, [selection, brush, days, schedule])

  // Räknas här i stället för per rad, så att en hover eller ett drag inte
  // tvingar fram en ny genomgång av årets alla dagar för varje medarbetare.
  const memberDayCounts = useMemo(() => {
    const counts: Record<string, MemberDayCounts> = {}

    for (const member of members) {
      counts[member.id] = {
        semester: countStatusDaysInYear(schedule[member.id], days, 'semester'),
        foraldraledig: countStatusDaysInYear(
          schedule[member.id],
          days,
          'foraldraledig',
        ),
      }
    }

    return counts
  }, [schedule, days, members])

  return (
    <PlannerGrid
      year={year}
      days={days}
      months={months}
      members={members}
      groups={groups}
      currentUserId={currentUserId}
      editableMemberId={paintableMemberId}
      schedule={schedule}
      shortenedDays={shortenedDays}
      memberDayCounts={memberDayCounts}
      pastDayCount={pastDayCount}
      preview={preview}
      highlight={selection === null ? hover.row : null}
      dayMarker={selection === null ? hover.day : null}
      todayIndex={todayIndex}
      scrollToDayIndex={todayIndex}
      centerRequest={centerRequest}
      onCellPointerDown={handleCellPointerDown}
      onCellPointerEnter={handleCellPointerEnter}
      onCellHover={handleCellHover}
      onDayHover={handleDayHover}
      onHoverEnd={handleHoverEnd}
      onPaintSingleDay={handlePaintSingleDay}
    />
  )
}
