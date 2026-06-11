import { useState, useEffect } from 'react'

type WeekRow = {
  id: string
  week_start: string
  week_end: string
}

function parseWeekList(payload: unknown): WeekRow[] {
  if (Array.isArray(payload)) return payload as WeekRow[]
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { weeks?: unknown }).weeks)
  ) {
    return (payload as { weeks: WeekRow[] }).weeks
  }
  return []
}

function currentWeekFromList(weekList: WeekRow[]): WeekRow | undefined {
  const today = new Date()
  return weekList.find(
    (week) => new Date(week.week_start) <= today && new Date(week.week_end) >= today
  )
}

function startOfWeekDate(d: Date): string {
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay())
  return start.toISOString().split('T')[0]
}

function endOfWeekDate(d: Date): string {
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return end.toISOString().split('T')[0]
}

export function useCurrentWeek() {
  const [currentWeekId, setCurrentWeekId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCurrentWeek = async () => {
      try {
        const response = await fetch('/api/weeks')
        if (!response.ok) return

        const payload = await response.json()
        const weekList = parseWeekList(payload)
        let currentWeek = currentWeekFromList(weekList)

        if (!currentWeek) {
          const today = new Date()
          const createResponse = await fetch('/api/weeks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              week_start: startOfWeekDate(today),
              week_end: endOfWeekDate(today),
            }),
          })

          if (createResponse.ok) {
            const createdPayload = await createResponse.json()
            currentWeek = (createdPayload?.week ?? createdPayload) as WeekRow
          }
        }

        if (currentWeek?.id) {
          setCurrentWeekId(currentWeek.id)
        }
      } catch (error) {
        console.error('Error fetching current week:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchCurrentWeek()
  }, [])

  return { currentWeekId, isLoading }
}
