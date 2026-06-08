import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { env } from '@/lib/env'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'

import { ALL_DAYS, formatWindowsForPrompt, normalizePreferences } from '@/lib/calendar/preferences'

type Recommendation = {
  id: string
  source_type: 'task' | 'habit'
  title: string
  description: string
  weekday: string
  start_time: string
  duration_minutes: number
  recurrence: 'none' | 'daily' | 'weekly'
}

function hourLabel(h: number): string {
  if (h === 0 || h === 24) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

export async function POST() {
  try {
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim() === '') {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [{ data: prefsRow }, { data: tasks }, { data: habits }] = await Promise.all([
      supabase
        .from('calendar_preferences')
        .select('start_hour, end_hour, days, time_windows')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('tasks')
        .select('title, description, points_value, status')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(25),
      supabase
        .from('daily_habits')
        .select('title, description, points_per_completion')
        .eq('user_id', user.id)
        .limit(25),
    ])

    const prefs = normalizePreferences(prefsRow)
    const windows = prefs.windows
    const allowedDays = [...new Set(windows.flatMap((w) => w.days))]

    if ((!tasks || tasks.length === 0) && (!habits || habits.length === 0)) {
      return NextResponse.json({
        recommendations: [],
        message: 'No active tasks or habits found. Add some on your dashboard first.',
      })
    }

    const prompt = `You are scheduling a user's Lifestacks tasks and habits into their calendar.

ALLOWED SCHEDULING WINDOWS (each item must fit entirely inside ONE window):
${formatWindowsForPrompt(windows, hourLabel)}

TASKS (one-off; schedule on a suitable single day):
${(tasks || []).map((t) => `- ${t.title}${t.description ? `: ${t.description}` : ''}`).join('\n') || '(none)'}

HABITS (recurring; prefer daily or weekly recurrence):
${(habits || []).map((h) => `- ${h.title}${h.description ? `: ${h.description}` : ''}`).join('\n') || '(none)'}

For each task and habit, propose ONE calendar block. Rules:
- Assign a weekday and start_time (24h "HH:MM") that fall inside one of the allowed windows above.
- duration_minutes must be between 15 and 120, realistic for the item.
- Habits should use recurrence "daily" or "weekly"; tasks should use "none" (or "weekly" if clearly repeating).
- Spread items across days/times; avoid stacking everything at once.

Respond ONLY with JSON of this exact shape:
{
  "recommendations": [
    { "source_type": "task" | "habit", "title": "short title", "description": "what to do", "weekday": "mon", "start_time": "07:30", "duration_minutes": 30, "recurrence": "none" | "daily" | "weekly" }
  ]
}`

    const { text } = await generateText({
      model: defaultOpenaiModel(),
      messages: [
        {
          role: 'system',
          content:
            'You are a precise scheduling assistant. You always return valid JSON and respect the allowed time window and days.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
    })

    let parsed: { recommendations?: unknown[] } = {}
    try {
      const jsonStart = text.indexOf('{')
      const jsonEnd = text.lastIndexOf('}')
      parsed = JSON.parse(jsonStart >= 0 ? text.slice(jsonStart, jsonEnd + 1) : text)
    } catch {
      return NextResponse.json({ error: 'Could not parse AI response' }, { status: 502 })
    }

    const recommendations: Recommendation[] = (parsed.recommendations || [])
      .map((raw, i): Recommendation | null => {
        const r = raw as Record<string, unknown>
        const weekdayRaw = String(r.weekday)
        const weekday = (ALL_DAYS as readonly string[]).includes(weekdayRaw)
          ? weekdayRaw
          : allowedDays[0]
        const fallbackWindow = windows[0]
        const startTime = /^\d{1,2}:\d{2}$/.test(String(r.start_time))
          ? String(r.start_time).padStart(5, '0')
          : `${String(fallbackWindow.start_hour).padStart(2, '0')}:00`
        const duration = Math.max(15, Math.min(120, Number(r.duration_minutes) || 30))
        const recurrence =
          r.recurrence === 'daily' || r.recurrence === 'weekly' ? r.recurrence : 'none'
        const sourceType = r.source_type === 'habit' ? 'habit' : 'task'
        if (!r.title) return null
        return {
          id: `rec-${i}`,
          source_type: sourceType,
          title: String(r.title),
          description: typeof r.description === 'string' ? r.description : '',
          weekday,
          start_time: startTime,
          duration_minutes: duration,
          recurrence,
        }
      })
      .filter((r): r is Recommendation => r !== null)

    return NextResponse.json({ recommendations })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}
