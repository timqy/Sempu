interface LegendItem {
  tone: string
  label: string
  /** Visar hörnflaggan för en dag som bär två markeringar samtidigt. */
  hasShortenedMark?: boolean
}

const LEGEND_ITEMS: LegendItem[] = [
  { tone: 'arbetsdag', label: 'Arbetsdag' },
  { tone: 'semester', label: 'Semester' },
  { tone: 'foraldraledig', label: 'Föräldraledig' },
  { tone: 'arbetsforkortad', label: 'Arbetsförkortad' },
  { tone: 'helg', label: 'Helg' },
  { tone: 'rod-dag', label: 'Röd dag' },
  {
    tone: 'semester',
    label: 'Ledig på arbetsförkortad dag',
    hasShortenedMark: true,
  },
]

export function PlannerLegend() {
  return (
    <ul className="planner-legend">
      {LEGEND_ITEMS.map((item) => (
        <li key={item.label} className="planner-legend__item">
          <span
            className={[
              'planner-legend__swatch',
              `planner-cell--${item.tone}`,
              item.hasShortenedMark === true ? 'has-shortened-mark' : '',
            ]
              .filter((part) => part !== '')
              .join(' ')}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
