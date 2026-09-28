/** Status som en medarbetare aktivt lagt in på en dag. */
export type DayStatus = 'semester' | 'foraldraledig'

/** Penslar som ändrar en persons eget schema. */
export type PaintBrush = DayStatus | 'radera'

/**
 * Vad ett drag gör. `arbetsforkortad` skiljer ut sig: den ändrar inte personens
 * schema utan den gemensamma listan över arbetsförkortade dagar, och syns
 * därför i allas rader.
 */
export type Brush = PaintBrush | 'arbetsforkortad'

/**
 * Dagnyckel (`YYYY-MM-DD`) → status. Dagar utan post är vanliga arbetsdagar,
 * därav `undefined` i värdetypen.
 */
export type MemberSchedule = Record<string, DayStatus | undefined>

/** Medarbetar-id → schema. */
export type TeamSchedule = Record<string, MemberSchedule | undefined>

export interface RowSelection {
  memberId: string
  fromIndex: number
  toIndex: number
}

/** Pågående markering som ritas ut på en rad medan användaren drar. */
export interface RowPreview {
  fromIndex: number
  toIndex: number
  brush: Brush
  label: string
}

/** Inlagda dagar per status för en medarbetare under det visade året. */
export interface MemberDayCounts {
  semester: number
  foraldraledig: number
}

/**
 * En rad i en grupp. Samma person kan förekomma i flera grupper, så det som
 * skiljer förekomsterna åt hör hemma här och inte på personen.
 */
export interface PlannerGroupRow {
  personId: string
  /** Rad under namnet. Faller tillbaka på personens roll. */
  subtitle?: string
  /** Personen har redan visats i en tidigare grupp – raden dämpas. */
  isRepeat?: boolean
}

/** En rubrikrad i rutnätet, t.ex. ett team i semesteröversikten. */
export interface PlannerGroup {
  id: string
  name: string
  /** Personer i gruppen, i visningsordning. */
  rows: PlannerGroupRow[]
}

/** Ledighet hör till en person, så den markeras som en box på en rad. */
export interface RowHighlight {
  fromIndex: number
  toIndex: number
  label: string
  /**
   * Dagtypen för den ruta pekaren står på, när dagen bär två markeringar.
   * Visas som en extra etikett ovanför radens egen.
   */
  dayLabel?: { text: string; variant: DayMarkerVariant }
}

/** Dagtyper som hör till kalendern och därför gäller alla rader. */
export type DayMarkerVariant = 'roddag' | 'arbetsforkortad'

/** En kalenderdag markeras som ett band över alla rader. */
export interface DayMarker {
  dayIndex: number
  /**
   * `null` när en radmarkering redan visar en etikett på samma dag – två
   * etiketter över varandra går inte att läsa.
   */
  label: string | null
  variant: DayMarkerVariant
}

/**
 * Vad muspekaren pekar på. Båda kan vara satta samtidigt: ledighet hör till en
 * person, dagtypen till kalendern, och de kan mycket väl krocka på samma dag.
 */
export interface HoverTarget {
  row: (RowHighlight & { memberId: string }) | null
  day: DayMarker | null
}

export const STATUS_LABELS_SV: Record<DayStatus, string> = {
  semester: 'Semester',
  foraldraledig: 'Föräldraledig',
}
