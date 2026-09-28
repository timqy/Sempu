import {
  CURRENT_USER_ID,
  createId,
  readDatabase,
  writeDatabase,
} from '../../../mockServer/db'
import { latency } from '../../../mockServer/latency'
import type { PuHelpRequest } from '../types'

export async function fetchHelpRequests(): Promise<PuHelpRequest[]> {
  await latency()

  return readDatabase().puHelpRequests
}

/** Den inloggade ber om byte av en PU-dag. */
export async function createHelpRequest(
  teamId: string,
  dayKey: string,
): Promise<PuHelpRequest> {
  await latency()

  const database = readDatabase()

  const existing = database.puHelpRequests.find(
    (request) => request.teamId === teamId && request.dayKey === dayKey,
  )

  if (existing !== undefined) {
    throw new Error('Det finns redan en förfrågan för den dagen')
  }

  const request: PuHelpRequest = {
    id: createId('pu-request'),
    teamId,
    dayKey,
    requesterId: CURRENT_USER_ID,
    helperId: null,
  }

  writeDatabase({
    ...database,
    puHelpRequests: [...database.puHelpRequests, request],
  })

  return request
}

/** Tar tillbaka sin egen förfrågan. */
export async function cancelHelpRequest(requestId: string): Promise<void> {
  await latency()

  const database = readDatabase()

  writeDatabase({
    ...database,
    puHelpRequests: database.puHelpRequests.filter(
      (request) => request.id !== requestId,
    ),
  })
}

/** Den inloggade tar någon annans pass. */
export async function acceptHelpRequest(
  requestId: string,
): Promise<PuHelpRequest> {
  await latency()

  return updateRequest(requestId, (request) => {
    if (request.helperId !== null) {
      throw new Error('Någon annan hann före med att ta passet')
    }

    if (request.requesterId === CURRENT_USER_ID) {
      throw new Error('Du kan inte ta ditt eget pass')
    }

    return { ...request, helperId: CURRENT_USER_ID }
  })
}

/** Lämnar tillbaka ett pass man tagit, så förfrågan blir öppen igen. */
export async function withdrawFromHelpRequest(
  requestId: string,
): Promise<PuHelpRequest> {
  await latency()

  return updateRequest(requestId, (request) => ({ ...request, helperId: null }))
}

function updateRequest(
  requestId: string,
  change: (request: PuHelpRequest) => PuHelpRequest,
): PuHelpRequest {
  const database = readDatabase()
  const existing = database.puHelpRequests.find(
    (request) => request.id === requestId,
  )

  if (existing === undefined) {
    throw new Error('Förfrågan finns inte längre')
  }

  const updated = change(existing)

  writeDatabase({
    ...database,
    puHelpRequests: database.puHelpRequests.map((request) =>
      request.id === requestId ? updated : request,
    ),
  })

  return updated
}
