import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNarrativeIntegrationSession } from '@/lib/narrative-integration/actions'
import {
  applyDashboardRecommendations,
  generateDashboardRecommendations,
  type DashboardRecommendation,
} from '@/lib/narrative-integration/dashboard-recommendations'
import { env } from '@/lib/env'

export async function POST(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    if (!env.OPENAI_API_KEY?.trim()) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const { sessionId } = await ctx.params
    await getNarrativeIntegrationSession(sessionId)

    const body = await req.json().catch(() => ({}))
    const action = body.action as string | undefined

    if (action === 'apply') {
      const supabase = await createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const items = (body.items || []) as DashboardRecommendation[]
      if (!Array.isArray(items) || items.length < 1 || items.length > 3) {
        return NextResponse.json({ error: 'Select 1 to 3 recommendations to add' }, { status: 400 })
      }

      const created = await applyDashboardRecommendations(
        user.id,
        items.map((i) => ({
          type: i.type === 'task' ? 'task' : 'habit',
          title: i.title,
          description: i.description,
          category: i.category,
        }))
      )

      return NextResponse.json({
        message: `Added ${created.habits.length} habit(s) and ${created.tasks.length} task(s) to your dashboard.`,
        created,
      })
    }

    const recommendations = await generateDashboardRecommendations(sessionId)
    if (recommendations.length === 0) {
      return NextResponse.json(
        { error: 'Could not generate recommendations. Try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ recommendations })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to process dashboard recommendations' },
      { status: 500 }
    )
  }
}
