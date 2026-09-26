import { useCallback, useRef, useState } from 'react'

/**
 * Guards an action against double submission. The ref blocks a second call
 * made before React re-renders (a double click); `busy` drives `disabled`.
 * An error the action doesn't handle itself ends up in `error` (never an
 * unhandled rejection).
 */
export function useBusy() {
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = useCallback(async (action: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }, [])
  return { busy, error, run }
}
