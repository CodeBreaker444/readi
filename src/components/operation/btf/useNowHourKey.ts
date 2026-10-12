'use client'

import { useEffect, useState } from 'react'
import { currentHourKey } from './btf-utils'

const POLL_MS = 15_000

/**
 * The current hour in `timeZone` as "YYYY-MM-DDTHH:00", kept live while the page stays open.
 *
 * It re-checks every few seconds and again as soon as the tab becomes visible or focused again,
 * because browsers throttle timers in background tabs and they stop while a computer sleeps.
 * The state only changes when the hour changes, so the page re-renders once an hour, not on every poll.
 */
export function useNowHourKey(timeZone: string | undefined): string {
  const [live, setLive] = useState<{ tz: string; key: string } | null>(null)

  useEffect(() => {
    if (!timeZone) return
    const update = () =>
      setLive((prev) => {
        const key = currentHourKey(timeZone)
        return prev && prev.tz === timeZone && prev.key === key ? prev : { tz: timeZone, key }
      })

    update()
    const id = setInterval(update, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') update()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', update)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', update)
    }
  }, [timeZone])

  if (!timeZone) return ''
  // Until the first poll (or right after the timezone changes) read the clock directly.
  return live && live.tz === timeZone ? live.key : currentHourKey(timeZone)
}
