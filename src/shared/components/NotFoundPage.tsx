import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="page-panel">
      <h1>Sidan hittades inte</h1>
      <p>Sidan du letar efter finns inte.</p>
      <Link to="/semester">Till semesterplaneringen</Link>
    </section>
  )
}
