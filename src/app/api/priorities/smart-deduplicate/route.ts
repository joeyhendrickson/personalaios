import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Function to calculate similarity between two strings
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null))

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      )
    }
  }

  return matrix[str2.length][str1.length]
}

// Function to normalize text for comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

// POST /api/priorities/smart-deduplicate - Intelligent duplicate removal
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧠 Starting intelligent deduplication for user:', user.id)

    // Fetch all non-deleted priorities for the user
    const { data: priorities, error: fetchError } = await supabase
      .from('priorities')
      .select('id, title, description, priority_type, is_completed, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true }) // Keep oldest first

    if (fetchError) {
      console.error('Error fetching priorities for smart deduplication:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch priorities' }, { status: 500 })
    }

    if (!priorities || priorities.length === 0) {
      return NextResponse.json(
        { message: 'No priorities to check for duplicates' },
        { status: 200 }
      )
    }

    console.log(`📊 Analyzing ${priorities.length} priorities for intelligent duplicates`)

    const duplicates: any[] = []
    const kept: any[] = []
    const processed = new Set<string>()

    for (let i = 0; i < priorities.length; i++) {
      if (processed.has(priorities[i].id)) continue

      const current = priorities[i]
      const currentNormalized = normalizeText(current.title)
      const similarPriorities = [current]

      // Find similar priorities
      for (let j = i + 1; j < priorities.length; j++) {
        if (processed.has(priorities[j].id)) continue

        const other = priorities[j]
        const otherNormalized = normalizeText(other.title)

        // Calculate similarity
        const similarity = calculateSimilarity(currentNormalized, otherNormalized)

        // Consider duplicates if similarity is > 0.8 (80% similar)
        if (similarity > 0.8) {
          similarPriorities.push(other)
          processed.add(other.id)
          console.log(
            `🔍 Found similar priority: "${current.title}" vs "${other.title}" (${Math.round(similarity * 100)}% similar)`
          )
        }
      }

      if (similarPriorities.length > 1) {
        // Sort by priority: completed first, then by creation date
        similarPriorities.sort((a, b) => {
          if (a.is_completed !== b.is_completed) {
            return a.is_completed ? -1 : 1 // Completed items first
          }
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime() // Older first
        })

        // Keep the first (best) one, mark the rest as duplicates
        kept.push(similarPriorities[0])
        duplicates.push(...similarPriorities.slice(1))
      } else {
        kept.push(current)
      }

      processed.add(current.id)
    }

    if (duplicates.length === 0) {
      console.log('✅ No intelligent duplicates found')
      return NextResponse.json({ message: 'No intelligent duplicates found' }, { status: 200 })
    }

    console.log(`🗑️ Removing ${duplicates.length} intelligent duplicates...`)

    // Soft delete the duplicates
    const duplicateIds = duplicates.map((d) => d.id)
    const { error: deleteError } = await supabase
      .from('priorities')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', duplicateIds)

    if (deleteError) {
      console.error('❌ Error removing intelligent duplicates:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove intelligent duplicates' },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully removed ${duplicates.length} intelligent duplicates`)
    console.log(
      'Kept priorities:',
      kept.map((k) => ({ id: k.id, title: k.title, completed: k.is_completed }))
    )
    console.log(
      'Removed duplicates:',
      duplicates.map((d) => ({ id: d.id, title: d.title, completed: d.is_completed }))
    )

    return NextResponse.json(
      {
        message: `Successfully removed ${duplicates.length} intelligent duplicates`,
        removedCount: duplicates.length,
        keptCount: kept.length,
        duplicates: duplicates.map((d) => ({
          id: d.id,
          title: d.title,
          priority_type: d.priority_type,
          is_completed: d.is_completed,
        })),
        kept: kept.map((k) => ({
          id: k.id,
          title: k.title,
          priority_type: k.priority_type,
          is_completed: k.is_completed,
        })),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('💥 Unexpected error in smart-deduplicate API:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
