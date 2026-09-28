import { memo, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import type { Person } from '../../team'
import { getInitials } from '../../team'
import type { CalendarDay } from '../lib/calendar'
import { describeDay, resolveDayTone } from '../lib/dayTone'
import type {
  DayStatus,
  MemberDayCounts,
  MemberSchedule,
  RowHighlight,
  RowPreview,
} from '../types'

interface PlannerRowProps {
  member: Person
  /** Rad under namnet: roll i planeraren, teamnamn i översikten. */
  subtitle: string
  /** Personen visas redan i en tidigare grupp – dämpas och utan sifferbrickor. */
  isRepeat: boolean
  /** Radens plats i rutnätet. Räknas av rutnätet, som även ritar grupprader. */
  gridRow: number
  year: number
  days: CalendarDay[]
  memberSchedule: MemberSchedule | undefined
  shortenedDays: ReadonlySet<string>
  dayCounts: MemberDayCounts
  /** Markerar raden visuellt som inloggad användares. */
  isOwnRow: boolean
  /** Om raden går att måla på. Översikten är enbart läsning. */
  isEditable: boolean
  preview: RowPreview | null
  highlight: RowHighlight | null
  todayIndex: number | null
  onCellPointerDown: (
    memberId: string,
    dayIndex: number,
    event: ReactPointerEvent<HTMLElement>,
  ) => void
  onCellPointerEnter: (memberId: string, dayIndex: number) => void
  onCellHover: (memberId: string, dayIndex: number) => void
  onPaintSingleDay: (memberId: string, dayIndex: number) => void
}

/** Flyttar fokus inom den redigerbara raden. Bara en rad åt gången är det. */
function focusOwnCell(dayIndex: number): void {
  document
    .querySelector<HTMLButtonElement>(`[data-own-cell="${String(dayIndex)}"]`)
    ?.focus()
}

function PlannerRowComponent({
  member,
  subtitle,
  isRepeat,
  gridRow,
  year,
  days,
  memberSchedule,
  shortenedDays,
  dayCounts,
  isOwnRow,
  isEditable,
  preview,
  highlight,
  todayIndex,
  onCellPointerDown,
  onCellPointerEnter,
  onCellHover,
  onPaintSingleDay,
}: PlannerRowProps) {
  // Rullande tabindex: bara en ruta i taget ligger i tabbordningen, så att
  // årets alla dagar inte blir 365 tabbstopp.
  const [focusIndex, setFocusIndex] = useState(0)

  function handleKeyDown(
    event: ReactKeyboardEvent<HTMLElement>,
    dayIndex: number,
  ) {
    const lastIndex = days.length - 1
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight') {
      nextIndex = Math.min(dayIndex + 1, lastIndex)
    } else if (event.key === 'ArrowLeft') {
      nextIndex = Math.max(dayIndex - 1, 0)
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = lastIndex
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onPaintSingleDay(member.id, dayIndex)
      return
    }

    if (nextIndex === null) {
      return
    }

    event.preventDefault()
    setFocusIndex(nextIndex)
    focusOwnCell(nextIndex)
  }

  return (
    <>
      <div
        className={[
          'planner-name',
          isOwnRow ? 'planner-name--own' : '',
          isRepeat ? 'planner-name--repeat' : '',
        ]
          .filter((part) => part !== '')
          .join(' ')}
        style={{ gridRow, gridColumn: 1 }}
      >
        <span className="planner-name__avatar" aria-hidden="true">
          {getInitials(member.name)}
        </span>
        <span className="planner-name__text">
          <span className="planner-name__label">
            {member.name}
            {isOwnRow ? <span className="planner-name__you">Du</span> : null}
          </span>
          <span className="planner-name__role">{subtitle}</span>
        </span>

        {/* Brickorna visas bara på personens första rad, så samma dagar inte
            ser ut att räknas en gång per team. */}
        {isRepeat ? null : (
          <span className="planner-name__counts">
            <span
              className="planner-name__count planner-name__count--semester"
              title={`${String(dayCounts.semester)} inlagda semesterdagar`}
            >
              {dayCounts.semester}
            </span>
            {dayCounts.foraldraledig > 0 ? (
              <span
                className="planner-name__count planner-name__count--foraldraledig"
                title={`${String(dayCounts.foraldraledig)} inlagda föräldralediga dagar`}
              >
                {dayCounts.foraldraledig}
              </span>
            ) : null}
          </span>
        )}
      </div>

      {/* Ramar in den egna raden över hela bredden, så den går att följa långt
          ut i kalendern där namnkolumnen är utanför synfältet. */}
      {isOwnRow ? (
        <div
          className="planner-own-row"
          aria-hidden="true"
          style={{ gridRow, gridColumn: '2 / -1' }}
        />
      ) : null}

      {days.map((day, dayIndex) => {
        const inPreview =
          preview !== null &&
          dayIndex >= preview.fromIndex &&
          dayIndex <= preview.toIndex

        let status: DayStatus | undefined = memberSchedule?.[day.key]
        let isShortened = shortenedDays.has(day.key)

        if (inPreview) {
          if (preview.brush === 'radera') {
            status = undefined
          } else if (preview.brush === 'arbetsforkortad') {
            isShortened = isShortened || day.isWorkingDay
          } else if (day.isWorkingDay) {
            status = preview.brush
          }
        }

        const tone = resolveDayTone(day, status, isShortened)

        // Två markeringar på samma dag: personens status fyller rutan och
        // dagtypen visas som en hörnflagga, i stället för att en av dem tystas.
        const hasHiddenShortened = isShortened && tone !== 'arbetsforkortad'

        const className = [
          'planner-cell',
          `planner-cell--${tone}`,
          day.dayOfMonth === 1 ? 'is-month-start' : '',
          dayIndex === todayIndex ? 'is-today' : '',
          hasHiddenShortened ? 'has-shortened-mark' : '',
          isEditable ? 'planner-cell--own' : '',
        ]
          .filter((part) => part !== '')
          .join(' ')

        const title = describeDay(day, year, status, member.name, isShortened)
        const style = { gridRow, gridColumn: dayIndex + 2 }

        if (!isEditable) {
          return (
            <div
              key={day.key}
              className={className}
              style={style}
              title={title}
              onPointerEnter={() => {
                onCellHover(member.id, dayIndex)
              }}
            />
          )
        }

        return (
          <button
            key={day.key}
            type="button"
            className={className}
            style={style}
            title={title}
            aria-label={title}
            data-own-cell={dayIndex}
            tabIndex={dayIndex === focusIndex ? 0 : -1}
            onFocus={() => {
              setFocusIndex(dayIndex)
            }}
            onPointerDown={(event) => {
              onCellPointerDown(member.id, dayIndex, event)
            }}
            onPointerEnter={() => {
              onCellPointerEnter(member.id, dayIndex)
              onCellHover(member.id, dayIndex)
            }}
            onKeyDown={(event) => {
              handleKeyDown(event, dayIndex)
            }}
          />
        )
      })}

      {preview !== null ? (
        <div
          className="planner-selection"
          style={{
            gridRow,
            gridColumn: `${String(preview.fromIndex + 2)} / span ${String(
              preview.toIndex - preview.fromIndex + 1,
            )}`,
          }}
        >
          <span className="planner-selection__label">{preview.label}</span>
        </div>
      ) : null}

      {highlight !== null ? (
        <div
          className="planner-highlight"
          style={{
            gridRow,
            gridColumn: `${String(highlight.fromIndex + 2)} / span ${String(
              highlight.toIndex - highlight.fromIndex + 1,
            )}`,
          }}
        >
          <span className="planner-highlight__labels">
            {highlight.dayLabel === undefined ? null : (
              <span
                className={`planner-highlight__label planner-highlight__label--${highlight.dayLabel.variant}`}
              >
                {highlight.dayLabel.text}
              </span>
            )}
            <span className="planner-highlight__label">{highlight.label}</span>
          </span>
        </div>
      ) : null}
    </>
  )
}

export const PlannerRow = memo(PlannerRowComponent)
