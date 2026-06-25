import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assembleAIContext } from '@/lib/ai-context/assemble-context'

type BriefingMode = 'wake' | 'checkin' | 'wellness' | 'happy'

function formatWakeBriefing(structured: Record<string, unknown> | null): string {
  if (!structured) return 'Good morning! What would you like to focus on today?'

  const fire = (structured.firePriorities as Array<{ title: string }> | undefined) || []
  const tasks = (structured.topTasks as Array<{ title: string; status: string }> | undefined) || []
  const priorities =
    (structured.topPriorities as Array<{ title: string; level?: string }> | undefined) || []
  const habits = (structured.topHabits as string[] | undefined) || []

  const lines: string[] = ['Good morning! Here is your day at a glance:']

  if (fire.length > 0) {
    lines.push('', '🔥 Fire priorities:')
    fire.slice(0, 3).forEach((p) => lines.push(`• ${p.title}`))
  }

  if (priorities.length > 0) {
    lines.push('', '🎯 Top priorities:')
    priorities.slice(0, 5).forEach((p) => lines.push(`• ${p.title}`))
  }

  const openTasks = tasks.filter((t) => t.status !== 'completed')
  if (openTasks.length > 0) {
    lines.push('', '✅ Open tasks:')
    openTasks.slice(0, 6).forEach((t) => lines.push(`• ${t.title}`))
  }

  if (habits.length > 0) {
    lines.push('', '🔄 Habits to consider:')
    habits.slice(0, 4).forEach((h) => lines.push(`• ${h}`))
  }

  lines.push('', 'Is there a specific area you want to focus on today?')
  return lines.join('\n')
}

function formatCheckInBriefing(structured: Record<string, unknown> | null): string {
  if (!structured) return 'Let me review your progress today.'

  const completedToday =
    (structured.completedTodayList as Array<{ title: string }> | undefined) || []
  const weeklyPoints = structured.weeklyPoints as number | undefined
  const dailyPoints = structured.dailyPoints as number | undefined
  const habitCompletionsToday = structured.habitCompletionsToday as number | undefined
  const fire = (structured.firePriorities as Array<{ title: string }> | undefined) || []

  const lines: string[] = ['Progress check-in:']

  lines.push('', `📊 Points today: ${dailyPoints ?? 0} · this week: ${weeklyPoints ?? 0}`)
  lines.push(`🔄 Habits logged today: ${habitCompletionsToday ?? 0}`)

  if (completedToday.length > 0) {
    lines.push('', '✅ Completed today:')
    completedToday.slice(0, 8).forEach((t) => lines.push(`• ${t.title}`))
  } else {
    lines.push('', '✅ No tasks marked complete yet today.')
  }

  if (fire.length > 0) {
    lines.push('', '⏳ Still pending (fire):')
    fire.slice(0, 4).forEach((p) => lines.push(`• ${p.title}`))
  }

  lines.push('', 'What would you like to tackle next?')
  return lines.join('\n')
}

function formatWellnessBriefing(moduleSummaries: string | undefined): string {
  const intro =
    "Wellness check — tell me how you're feeling (energy, pain, stress, sleep), and I'll tailor suggestions."
  if (!moduleSummaries) return intro
  return `${intro}\n\nRecent wellness context:\n${moduleSummaries}`
}

function formatHappyDayBriefing(structured: Record<string, unknown> | null): string {
  if (!structured) return 'Let me help you plan a balanced, enjoyable day.'

  const fire = (structured.firePriorities as Array<{ title: string }> | undefined) || []
  const habits = (structured.topHabits as string[] | undefined) || []

  const lines: string[] = ['Happy day plan — balancing urgency and enjoyment:']

  if (fire.length > 0) {
    lines.push('', '🔥 Handle first if needed:')
    fire.slice(0, 2).forEach((p) => lines.push(`• ${p.title}`))
  }

  if (habits.length > 0) {
    lines.push('', '😌 Restful habits you track:')
    habits.slice(0, 4).forEach((h) => lines.push(`• ${h}`))
  }

  lines.push('', 'Want me to suggest social time, fun, or recovery next?')
  return lines.join('\n')
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const mode = (url.searchParams.get('mode') || 'wake') as BriefingMode

  try {
    await assembleAIContext(user.id, {
      filterModulesByQuestion: mode === 'wellness',
      messages:
        mode === 'wellness'
          ? [{ role: 'user', content: 'wellness energy sleep health update' }]
          : undefined,
    })

    const { data: cacheRow } = await supabase
      .from('user_context_cache')
      .select('structured_state_summary_json, module_context_summary_json')
      .eq('user_id', user.id)
      .maybeSingle()

    const state = (cacheRow?.structured_state_summary_json || null) as Record<
      string,
      unknown
    > | null
    const moduleContext = cacheRow?.module_context_summary_json
    const modulesIncluded = Array.isArray(moduleContext)
      ? moduleContext
          .filter((m: { hasData?: boolean }) => m.hasData)
          .map((m: { moduleId: string }) => m.moduleId)
      : []

    let formattedPrompt = ''
    switch (mode) {
      case 'checkin':
        formattedPrompt = formatCheckInBriefing(state)
        break
      case 'wellness': {
        const fitnessMod = Array.isArray(moduleContext)
          ? moduleContext.find((m: { moduleId?: string }) => m.moduleId === 'fitness-tracker')
          : null
        const facts = fitnessMod?.objectiveFacts?.slice(0, 3).join('\n') || ''
        formattedPrompt = formatWellnessBriefing(facts || undefined)
        break
      }
      case 'happy':
        formattedPrompt = formatHappyDayBriefing(state)
        break
      case 'wake':
      default:
        formattedPrompt = formatWakeBriefing(state)
        break
    }

    return NextResponse.json({
      mode,
      formattedPrompt,
      modulesIncluded: modulesIncluded || [],
      structured: state,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to build briefing' },
      { status: 500 }
    )
  }
}
