'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'

// Shows a gold star in the weekly progress section: a filled star per past week
// the user was the #1 performer, and a highlighted "leading now" star if they're
// currently #1 this week.
export function WeeklyTrophyStar() {
  const [trophyCount, setTrophyCount] = useState(0)
  const [isCurrentWeekLeader, setIsCurrentWeekLeader] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/leaderboard/my-trophies')
        if (res.ok) {
          const json = await res.json()
          setTrophyCount(json.trophyCount ?? 0)
          setIsCurrentWeekLeader(!!json.isCurrentWeekLeader)
        }
      } finally {
        setLoaded(true)
      }
    })()
  }, [])

  if (!loaded || (trophyCount === 0 && !isCurrentWeekLeader)) return null

  return (
    <div className="flex items-center gap-1">
      {trophyCount > 0 && (
        <span
          className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5"
          title={`Top weekly performer ${trophyCount} time${trophyCount === 1 ? '' : 's'}`}
        >
          <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
          {trophyCount > 1 && (
            <span className="text-xs font-bold text-amber-700">{trophyCount}</span>
          )}
        </span>
      )}
      {isCurrentWeekLeader && (
        <span
          className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200"
          title="You're the #1 performer this week!"
        >
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
          Leading
        </span>
      )}
    </div>
  )
}
