import { createId, readDatabase, writeDatabase } from '../../../mockServer/db'
import { latency } from '../../../mockServer/latency'
import type { OverviewView } from '../types'

export async function fetchViews(): Promise<OverviewView[]> {
  await latency()

  return readDatabase().views
}

export async function createView(
  name: string,
  teamIds: string[],
): Promise<OverviewView> {
  await latency()

  const trimmed = name.trim()

  if (trimmed === '') {
    throw new Error('Vyn måste ha ett namn')
  }

  const database = readDatabase()
  const view: OverviewView = { id: createId('view'), name: trimmed, teamIds }

  writeDatabase({ ...database, views: [...database.views, view] })

  return view
}

export async function updateView(
  viewId: string,
  change: { name?: string; teamIds?: string[] },
): Promise<OverviewView> {
  await latency()

  const database = readDatabase()
  const existing = database.views.find((view) => view.id === viewId)

  if (existing === undefined) {
    throw new Error(`Vyn ${viewId} finns inte`)
  }

  const trimmed = change.name?.trim()

  if (trimmed !== undefined && trimmed === '') {
    throw new Error('Vyn måste ha ett namn')
  }

  const updated: OverviewView = {
    ...existing,
    name: trimmed ?? existing.name,
    teamIds: change.teamIds ?? existing.teamIds,
  }

  writeDatabase({
    ...database,
    views: database.views.map((view) => (view.id === viewId ? updated : view)),
  })

  return updated
}

export async function deleteView(viewId: string): Promise<void> {
  await latency()

  const database = readDatabase()

  writeDatabase({
    ...database,
    views: database.views.filter((view) => view.id !== viewId),
  })
}
