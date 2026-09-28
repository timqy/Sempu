import { useCallback, useEffect, useState } from 'react'

export interface AsyncData<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  /** Ökas vid varje lyckad laddning. Användbar som `key` för att nollställa. */
  version: number
  /** Läser om från API:t, t.ex. efter en misslyckad sparning. */
  reload: () => void
}

interface State<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  version: number
}

/**
 * Laddar data från ett API-anrop och håller reda på väntan och fel.
 *
 * `load` måste vara stabil (useCallback eller en modulnivåfunktion), annars
 * startar hämtningen om vid varje rendering.
 */
export function useAsyncData<T>(load: () => Promise<T>): AsyncData<T> {
  const [state, setState] = useState<State<T>>({
    data: null,
    isLoading: true,
    error: null,
    version: 0,
  })
  const [reloadToken, setReloadToken] = useState(0)

  // Väntetillståndet sätts här och inte i effekten: en synkron setState i en
  // effekt ger en extra renderomgång i onödan.
  const reload = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }))
    setReloadToken((current) => current + 1)
  }, [])

  useEffect(() => {
    let active = true

    load()
      .then((result) => {
        if (active) {
          setState((current) => ({
            data: result,
            isLoading: false,
            error: null,
            version: current.version + 1,
          }))
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setState((current) => ({
            ...current,
            isLoading: false,
            error: cause instanceof Error ? cause.message : 'Något gick fel',
          }))
        }
      })

    // Hindrar ett långsamt svar från att skriva över ett nyare.
    return () => {
      active = false
    }
  }, [load, reloadToken])

  return { ...state, reload }
}
