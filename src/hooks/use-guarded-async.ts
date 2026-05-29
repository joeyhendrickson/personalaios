import { useCallback, useRef, useState } from 'react'

/**
 * Prevents duplicate concurrent async calls (e.g. mobile double-tap firing touch + click).
 */
export function useGuardedAsync() {
  const lockRef = useRef(false)
  const [isRunning, setIsRunning] = useState(false)

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lockRef.current) {
      return undefined
    }
    lockRef.current = true
    setIsRunning(true)
    try {
      return await fn()
    } finally {
      lockRef.current = false
      setIsRunning(false)
    }
  }, [])

  return { run, isRunning }
}
