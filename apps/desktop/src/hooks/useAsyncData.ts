import { useState, useEffect, useCallback, useRef } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Standardized hook for async data fetching with loading, error, and retry states.
 * Usage: const { data, loading, error, reload } = useAsyncData(() => api.getSomething(), [])
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const cancelled = useRef(false)

  useEffect(() => {
    cancelled.current = false
    setLoading(true)
    setError(null)
    fetcher()
      .then((result) => {
        if (!cancelled.current) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled.current) {
          const msg =
            err instanceof Error ? err.message : 'An unexpected error occurred'
          setError(msg)
          setLoading(false)
        }
      })
    return () => { cancelled.current = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { data, loading, error, reload }
}
