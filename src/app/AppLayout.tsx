import { useCallback } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { fetchCurrentUser, getInitials } from '../features/team'
import { useAsyncData } from '../shared/hooks/useAsyncData'

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return isActive ? 'nav-link nav-link--active' : 'nav-link'
}

export function AppLayout() {
  const load = useCallback(() => fetchCurrentUser(), [])
  const { data: currentUser } = useAsyncData(load)

  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="app-brand">Sempu</span>

        {currentUser === null ? null : (
          <div className="app-user">
            <span className="app-user__text">
              <span className="app-user__name">{currentUser.name}</span>
              <span className="app-user__role">{currentUser.role}</span>
            </span>
            <span className="app-user__avatar" aria-hidden="true">
              {getInitials(currentUser.name)}
            </span>
          </div>
        )}
      </header>

      <nav className="app-nav">
        <NavLink to="/oversikt" className={navLinkClassName}>
          Semesteröversikt
        </NavLink>
        <NavLink to="/semester" className={navLinkClassName}>
          Semesterplanering
        </NavLink>
        <NavLink to="/team" className={navLinkClassName}>
          Team
        </NavLink>
        <NavLink to="/pu" className={navLinkClassName}>
          PU
        </NavLink>
      </nav>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
