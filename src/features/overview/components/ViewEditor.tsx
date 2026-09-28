import { useState } from 'react'
import type { Team } from '../../team'
import type { OverviewView } from '../types'

interface ViewEditorProps {
  view: OverviewView
  teams: Team[]
  onRename: (name: string) => void
  onToggleTeam: (teamId: string) => void
  onDelete: () => void
}

export function ViewEditor({
  view,
  teams,
  onRename,
  onToggleTeam,
  onDelete,
}: ViewEditorProps) {
  const [draftName, setDraftName] = useState(view.name)

  return (
    <div className="view-editor">
      <form
        className="view-editor__row"
        onSubmit={(event) => {
          event.preventDefault()

          if (draftName.trim() !== '' && draftName !== view.name) {
            onRename(draftName)
          }
        }}
      >
        <label className="view-editor__label" htmlFor="view-name-input">
          Vyns namn
        </label>
        <input
          id="view-name-input"
          className="view-editor__input"
          value={draftName}
          onChange={(event) => {
            setDraftName(event.target.value)
          }}
          onBlur={() => {
            if (draftName.trim() !== '' && draftName !== view.name) {
              onRename(draftName)
            }
          }}
        />
      </form>

      <fieldset className="view-editor__teams">
        <legend className="view-editor__label">Team som ingår</legend>
        {teams.map((team) => (
          <label key={team.id} className="view-editor__team">
            <input
              type="checkbox"
              checked={view.teamIds.includes(team.id)}
              onChange={() => {
                onToggleTeam(team.id)
              }}
            />
            {team.name}
            <span className="view-editor__team-count">
              {team.memberIds.length}
            </span>
          </label>
        ))}
      </fieldset>

      <button type="button" className="view-editor__delete" onClick={onDelete}>
        Ta bort vyn
      </button>
    </div>
  )
}
