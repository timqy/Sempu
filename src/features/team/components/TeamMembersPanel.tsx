import { useState } from 'react'
import type { Person, Team } from '../types'
import { getInitials } from '../index'
import './TeamMembersPanel.css'

interface TeamMembersPanelProps {
  team: Team
  /** Hela personalregistret, för att kunna lägga till nya medlemmar. */
  people: Person[]
  onAdd: (personId: string) => void
  onRemove: (personId: string) => void
  onRename: (name: string) => void
}

export function TeamMembersPanel({
  team,
  people,
  onAdd,
  onRemove,
  onRename,
}: TeamMembersPanelProps) {
  const [draftName, setDraftName] = useState(team.name)

  const members = team.memberIds
    .map((id) => people.find((person) => person.id === id))
    .filter((person): person is Person => person !== undefined)

  const available = people
    .filter((person) => !team.memberIds.includes(person.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'))

  return (
    <div className="team-panel">
      <div className="team-panel__row">
        <label className="team-panel__label" htmlFor="team-name-input">
          Teamets namn
        </label>
        <input
          id="team-name-input"
          className="team-panel__input"
          value={draftName}
          onChange={(event) => {
            setDraftName(event.target.value)
          }}
          onBlur={() => {
            if (draftName.trim() !== '' && draftName !== team.name) {
              onRename(draftName)
            }
          }}
        />
      </div>

      <div className="team-panel__row">
        <label className="team-panel__label" htmlFor="team-add-select">
          Lägg till medlem
        </label>
        <select
          id="team-add-select"
          className="team-panel__input"
          value=""
          onChange={(event) => {
            if (event.target.value !== '') {
              onAdd(event.target.value)
            }
          }}
          disabled={available.length === 0}
        >
          <option value="">
            {available.length === 0
              ? 'Alla är redan med'
              : 'Välj en person att lägga till…'}
          </option>
          {available.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name} · {person.role}
            </option>
          ))}
        </select>
      </div>

      <ul className="team-panel__members">
        {members.map((person) => (
          <li key={person.id} className="team-panel__member">
            <span className="team-panel__avatar" aria-hidden="true">
              {getInitials(person.name)}
            </span>
            <span className="team-panel__member-text">
              <span className="team-panel__member-name">{person.name}</span>
              <span className="team-panel__member-role">{person.role}</span>
            </span>
            <button
              type="button"
              className="team-panel__remove"
              onClick={() => {
                onRemove(person.id)
              }}
              title={`Ta bort ${person.name} från ${team.name}`}
              aria-label={`Ta bort ${person.name} från ${team.name}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <p className="team-panel__note">
        Alla i teamet kan lägga till och ta bort medlemmar. Att ta bort någon
        raderar inte deras inlagda ledighet.
      </p>
    </div>
  )
}
