import { useState } from 'react'
import type { Team } from '../types'
import './TeamPicker.css'

interface TeamPickerProps {
  teams: Team[]
  selectedTeamId: string | null
  onSelect: (teamId: string) => void
  /**
   * När den är satt delas listan i "Mina team" och "Övriga team". Utan den
   * listas alla team i följd.
   */
  myTeamIds?: string[]
  /** Utelämnas där team inte ska skapas, t.ex. i semesterplaneringen. */
  onCreate?: (name: string) => void
}

export function TeamPicker({
  teams,
  selectedTeamId,
  onSelect,
  myTeamIds,
  onCreate,
}: TeamPickerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [draftName, setDraftName] = useState('')

  const mine =
    myTeamIds === undefined
      ? []
      : teams.filter((team) => myTeamIds.includes(team.id))
  const others =
    myTeamIds === undefined
      ? []
      : teams.filter((team) => !myTeamIds.includes(team.id))

  if (isCreating && onCreate !== undefined) {
    return (
      <form
        className="team-picker"
        onSubmit={(event) => {
          event.preventDefault()

          if (draftName.trim() === '') {
            return
          }

          onCreate(draftName)
          setDraftName('')
          setIsCreating(false)
        }}
      >
        <input
          className="team-picker__input"
          value={draftName}
          onChange={(event) => {
            setDraftName(event.target.value)
          }}
          placeholder="Namn på teamet"
          aria-label="Namn på det nya teamet"
          autoFocus
        />
        <button type="submit" className="team-picker__action">
          Skapa
        </button>
        <button
          type="button"
          className="team-picker__action"
          onClick={() => {
            setIsCreating(false)
            setDraftName('')
          }}
        >
          Avbryt
        </button>
      </form>
    )
  }

  return (
    <div className="team-picker">
      <label className="team-picker__label" htmlFor="team-picker-select">
        Team
      </label>
      <select
        id="team-picker-select"
        className="team-picker__select"
        value={selectedTeamId ?? ''}
        onChange={(event) => {
          onSelect(event.target.value)
        }}
      >
        {myTeamIds === undefined ? (
          teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))
        ) : (
          <>
            {mine.length > 0 ? (
              <optgroup label="Mina team">
                {mine.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {others.length > 0 ? (
              <optgroup label="Övriga team">
                {others.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </>
        )}
      </select>
      {onCreate === undefined ? null : (
        <button
          type="button"
          className="team-picker__action"
          onClick={() => {
            setIsCreating(true)
          }}
        >
          + Nytt team
        </button>
      )}
    </div>
  )
}
