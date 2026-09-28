/** En förfrågan om att någon annan tar ens PU-dag. */
export interface PuHelpRequest {
  id: string
  teamId: string
  /** Dagen som behöver täckas, `YYYY-MM-DD`. */
  dayKey: string
  requesterId: string
  /** Den som tagit passet, eller `null` så länge förfrågan är öppen. */
  helperId: string | null
}
