import type { CalendarDay } from '../lib/calendar'
import { formatShortDay } from '../lib/calendar'
import type { Brush } from '../types'

interface ShortenedDaysPanelProps {
  days: CalendarDay[]
  shortenedDays: ReadonlySet<string>
  brush: Brush | null
  onBrushChange: (brush: Brush | null) => void
  onRemove: (dayKey: string) => void
}

/**
 * Inställningar för arbetsförkortade dagar.
 *
 * De gäller hela företaget, så både penseln och borttagningen ligger här bakom
 * inställningsknappen i stället för bland de vanliga penslarna. Man ska behöva
 * ta ett aktivt steg för att ändra något som syns i allas rader.
 */
export function ShortenedDaysPanel({
  days,
  shortenedDays,
  brush,
  onBrushChange,
  onRemove,
}: ShortenedDaysPanelProps) {
  const marked = days.filter((day) => shortenedDays.has(day.key))
  const isPainting = brush === 'arbetsforkortad'

  return (
    <div className="shortened-panel">
      <div className="shortened-panel__head">
        <span className="shortened-panel__title">Arbetsförkortade dagar</span>
        <span className="shortened-panel__warning">
          Gäller alla i företaget
        </span>

        <button
          type="button"
          className={
            isPainting
              ? 'shortened-panel__toggle is-active'
              : 'shortened-panel__toggle'
          }
          aria-pressed={isPainting}
          onClick={() => {
            onBrushChange(isPainting ? null : 'arbetsforkortad')
          }}
        >
          {isPainting ? 'Klar' : 'Lägg till dagar'}
        </button>
      </div>

      {isPainting ? (
        <p className="shortened-panel__hint">
          Dra över dagarna i kalendern. De läggs till för alla, inte bara dig.
        </p>
      ) : null}

      {marked.length === 0 ? (
        <p className="shortened-panel__empty">Inga inlagda i år.</p>
      ) : (
        <ul className="shortened-panel__list">
          {marked.map((day) => (
            <li key={day.key} className="shortened-panel__chip">
              {formatShortDay(day)}
              <button
                type="button"
                className="shortened-panel__remove"
                onClick={() => {
                  onRemove(day.key)
                }}
                title={`Ta bort ${formatShortDay(day)} som arbetsförkortad dag`}
                aria-label={`Ta bort ${formatShortDay(day)} som arbetsförkortad dag`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
