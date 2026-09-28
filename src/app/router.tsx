import { createBrowserRouter, Navigate } from 'react-router-dom'
import { OverviewPage } from '../features/overview'
import { PuPage } from '../features/pu'
import { TeamsPage } from '../features/team'
import { VacationPlannerPage } from '../features/vacationPlanner'
import { NotFoundPage } from '../shared/components/NotFoundPage'
import { AppLayout } from './AppLayout'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/semester" replace /> },
      { path: 'semester', element: <VacationPlannerPage /> },
      { path: 'oversikt', element: <OverviewPage /> },
      { path: 'team', element: <TeamsPage /> },
      { path: 'pu', element: <PuPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
