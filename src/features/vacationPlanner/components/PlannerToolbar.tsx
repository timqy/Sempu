import type { Brush } from '../types'

/**
 * Arbetsförkortade dagar saknas med flit: de gäller alla och ligger därför
 * bakom inställningsknappen, utom räckhåll för ett slinter med musen.
 */
const BRUSH_OPTIONS: { value: Brush; label: string; title: string }[] = [
  {
    value: 'semester',
    label: 'Semester',
    title: 'Markera semester på din rad',
  },
  {
    value: 'foraldraledig',
    label: 'Föräldraledig',
    title: 'Markera föräldraledighet på din rad',
  },
  {
    value: 'radera',
    label: 'Radera',
    title: 'Ta bort ledighet från din rad',
  },
]

interface PlannerToolbarProps {
  year: number
  brush: Brush | null
  isSettingsOpen: boolean
  onYearChange: (year: number) => void
  onBrushChange: (brush: Brush | null) => void
  onGoToToday: () => void
  onToggleSettings: () => void
  onExport: () => void
}

export function PlannerToolbar({
  year,
  brush,
  isSettingsOpen,
  onYearChange,
  onBrushChange,
  onGoToToday,
  onToggleSettings,
  onExport,
}: PlannerToolbarProps) {
  return (
    <div className="planner-toolbar">
      <div className="planner-year">
        <button
          type="button"
          className="planner-year__step"
          onClick={() => {
            onYearChange(year - 1)
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
            onYearChange(year + 1)
          }}
          aria-label="Nästa år"
        >
          ›
        </button>
      </div>

      <button
        type="button"
        className="planner-today-button"
        onClick={onGoToToday}
        title="Hoppa till dagens datum"
      >
        Idag
      </button>

      <div className="planner-brush" role="group" aria-label="Markera som">
        {BRUSH_OPTIONS.map((option) => {
          const isActive = option.value === brush

          return (
            <button
              key={option.value}
              type="button"
              className={
                isActive
                  ? `planner-brush__option planner-brush__option--${option.value} is-active`
                  : `planner-brush__option planner-brush__option--${option.value}`
              }
              aria-pressed={isActive}
              title={
                isActive
                  ? `${option.title}. Klicka igen för att sluta markera.`
                  : option.title
              }
              // Klick på ett redan valt alternativ släcker det och lämnar
              // kalendern i bläddringsläge, som en färgväljare.
              onClick={() => {
                onBrushChange(isActive ? null : option.value)
              }}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className="planner-icon-button"
        onClick={onExport}
        title="Exportera året till Excel"
      >
        Exportera
      </button>

      <button
        type="button"
        className={
          isSettingsOpen
            ? 'planner-icon-button is-active'
            : 'planner-icon-button'
        }
        aria-expanded={isSettingsOpen}
        onClick={onToggleSettings}
        title="Inställningar för gemensamma dagar"
      >
        Inställningar
      </button>
    </div>
  )
}
