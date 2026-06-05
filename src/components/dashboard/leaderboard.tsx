'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trophy, Loader2, Crown, Medal } from 'lucide-react'

type LeaderRow = {
  rank: number
  userId: string
  firstName: string
  points: number
  topLabel: string
  topEmoji: string
}

type Period = 'day' | 'week'

export function Leaderboard({ currentUserId }: { currentUserId?: string }) {
  const [period, setPeriod] = useState<Period>('day')
  const [leaders, setLeaders] = useState<LeaderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (p: Period) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/leaderboard?period=${p}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Could not load leaderboard')
        setLeaders([])
        return
      }
      setLeaders(json.leaders ?? [])
    } catch {
      setError('Could not load leaderboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(period)
  }, [period, load])

  const rankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-amber-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />
    return <span className="w-5 text-center text-sm font-semibold text-gray-400">{rank}</span>
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Trophy className="h-5 w-5 text-amber-500" />
          Leaderboard
        </h3>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          {(['day', 'week'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p === 'day' ? 'Today' : 'This week'}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-3 text-xs text-gray-500">
        Top performers across Life Stacks{period === 'day' ? ' today' : ' this week'}. You&apos;re
        not alone — keep stacking points!
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <p className="py-6 text-center text-sm text-gray-500">{error}</p>
      ) : leaders.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          No points logged yet{period === 'day' ? ' today' : ' this week'}. Be the first!
        </p>
      ) : (
        <ol className="space-y-1.5">
          {leaders.map((row) => {
            const isMe = currentUserId && row.userId === currentUserId
            return (
              <li
                key={row.userId}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  isMe
                    ? 'bg-blue-50 ring-1 ring-blue-200'
                    : row.rank === 1
                      ? 'bg-amber-50'
                      : 'bg-gray-50'
                }`}
              >
                <div className="flex w-6 shrink-0 items-center justify-center">
                  {rankBadge(row.rank)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {row.firstName}
                    {isMe && <span className="ml-1 text-xs font-normal text-blue-600">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {row.topEmoji} {row.topLabel}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-sm font-bold text-gray-900">
                    {row.points.toLocaleString()}
                  </span>
                  <span className="ml-1 text-xs text-gray-400">pts</span>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
