import { useEffect, useState } from 'react'

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => performance.now())

  useEffect(() => {
    if (intervalMs <= 0) return
    const interval = window.setInterval(() => setNow(performance.now()), intervalMs)
    return () => window.clearInterval(interval)
  }, [intervalMs])

  return now
}
