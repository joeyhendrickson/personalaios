import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const suggestPointsSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
})

// Category-based default points
const CATEGORY_DEFAULTS = {
  health: { low: 3, medium: 6, high: 12 },
  productivity: { low: 2, medium: 5, high: 10 },
  learning: { low: 4, medium: 8, high: 15 },
  financial: { low: 3, medium: 7, high: 14 },
  personal: { low: 2, medium: 4, high: 8 },
  other: { low: 3, medium: 6, high: 12 },
}

// Generate trigrams from text
function generateTrigrams(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
  const words = normalized.split(' ')
  const trigrams: string[] = []

  for (let i = 0; i < words.length - 2; i++) {
    trigrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`)
  }

  return trigrams
}

// Calculate Jaccard similarity between two sets of trigrams
function calculateSimilarity(trigrams1: string[], trigrams2: string[]): number {
  const set1 = new Set(trigrams1)
  const set2 = new Set(trigrams2)

  const intersection = new Set([...set1].filter((x) => set2.has(x)))
  const union = new Set([...set1, ...set2])

  return intersection.size / union.size
}

// Estimate task complexity based on title and description
function estimateComplexity(title: string, description?: string): 'low' | 'medium' | 'high' {
  const text = `${title} ${description || ''}`.toLowerCase()

  // High complexity indicators
  const highComplexityWords = [
    'build',
    'create',
    'develop',
    'implement',
    'design',
    'analyze',
    'research',
    'complete',
    'finish',
    'launch',
    'deploy',
    'integrate',
    'optimize',
    'refactor',
  ]

  // Low complexity indicators
  const lowComplexityWords = [
    'check',
    'review',
    'read',
    'watch',
    'call',
    'email',
    'send',
    'update',
    'quick',
    'simple',
    'easy',
    'basic',
    'small',
    'minor',
  ]

  const highCount = highComplexityWords.filter((word) => text.includes(word)).length
  const lowCount = lowComplexityWords.filter((word) => text.includes(word)).length

  if (highCount >= 2) return 'high'
  if (lowCount >= 2) return 'low'
  return 'medium'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, category } = suggestPointsSchema.parse(body)

    // Get all completed tasks from the user
    const { data: completedTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('title, description, points_value, category, completed_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('points_value', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(100) // Limit to recent tasks for performance

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    // Generate trigrams for the new task
    const newTaskText = `${title} ${description || ''}`
    const newTaskTrigrams = generateTrigrams(newTaskText)

    // Find similar tasks using trigram similarity
    const similarTasks = completedTasks
      .map((task) => {
        const taskText = `${task.title} ${task.description || ''}`
        const taskTrigrams = generateTrigrams(taskText)
        const similarity = calculateSimilarity(newTaskTrigrams, taskTrigrams)

        return {
          ...task,
          similarity,
        }
      })
      .filter((task) => task.similarity > 0.1) // Minimum similarity threshold
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10) // Top 10 most similar tasks

    let suggestedPoints: number
    let reasoning: string
    let confidence: 'low' | 'medium' | 'high'

    if (similarTasks.length >= 3) {
      // Use median of similar tasks
      const points = similarTasks.map((task) => task.points_value).sort((a, b) => a - b)
      const median = points[Math.floor(points.length / 2)]
      suggestedPoints = median
      reasoning = `Based on ${similarTasks.length} similar completed tasks`
      confidence = 'high'
    } else if (similarTasks.length >= 1) {
      // Use average of available similar tasks
      const avgPoints =
        similarTasks.reduce((sum, task) => sum + task.points_value, 0) / similarTasks.length
      suggestedPoints = Math.round(avgPoints)
      reasoning = `Based on ${similarTasks.length} similar completed task${similarTasks.length > 1 ? 's' : ''}`
      confidence = 'medium'
    } else {
      // Fallback to category-based defaults
      const complexity = estimateComplexity(title, description)
      const categoryKey = (category as keyof typeof CATEGORY_DEFAULTS) || 'other'
      const defaults = CATEGORY_DEFAULTS[categoryKey]

      suggestedPoints = defaults[complexity]
      reasoning = `Based on ${complexity} complexity in ${categoryKey} category`
      confidence = 'low'
    }

    // Add some variation based on task length and complexity
    const taskLength = newTaskText.length
    if (taskLength > 100) {
      suggestedPoints = Math.ceil(suggestedPoints * 1.1) // 10% increase for longer tasks
    } else if (taskLength < 30) {
      suggestedPoints = Math.max(1, Math.floor(suggestedPoints * 0.9)) // 10% decrease for shorter tasks
    }

    // Ensure points are within reasonable bounds
    suggestedPoints = Math.max(1, Math.min(20, suggestedPoints))

    return NextResponse.json({
      suggested_points: suggestedPoints,
      reasoning,
      confidence,
      similar_tasks_count: similarTasks.length,
      similar_tasks: similarTasks.slice(0, 3).map((task) => ({
        title: task.title,
        points: task.points_value,
        similarity: Math.round(task.similarity * 100),
      })),
      category_defaults: category
        ? CATEGORY_DEFAULTS[category as keyof typeof CATEGORY_DEFAULTS]
        : null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
