import { useCallback, useEffect, useState } from 'react'

interface State<T> { key: string | null; data: T | undefined; error: Error | null }

/**
 * Runs `fn` whenever `deps` (primitives) change. Keeps the previous data while
 * reloading so pages don't flash after an action.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]) {
  const [tick, setTick] = useState(0)
  const key = JSON.stringify([...deps, tick])
  const [state, setState] = useState<State<T>>({ key: null, data: undefined, error: null })

  useEffect(() => {
    let alive = true
    fn().then(
      data => { if (alive) setState({ key, data, error: null }) },
      (e: unknown) => { if (alive) setState(s => ({ key, data: s.data, error: e instanceof Error ? e : new Error(String(e)) })) },
    )
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures deps
  }, [key])

  const reload = useCallback(() => setTick(t => t + 1), [])
  return { data: state.data, error: state.key === key ? state.error : null, loading: state.key !== key, reload }
}
