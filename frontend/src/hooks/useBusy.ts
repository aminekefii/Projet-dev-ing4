import { useCallback, useRef, useState } from 'react'

/**
 * Guards an action against double submission. The ref blocks a second call
 * made before React re-renders (a double click); `busy` drives `disabled`.
 */
export function useBusy() {
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const run = useCallback(async (action: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      await action()
    } finally {
      lock.current = false
      setBusy(false)
    }
  }, [])
  return { busy, run }
}
