import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createRelationshipSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  relationship_type: z.enum([
    'family',
    'friend',
    'colleague',
    'business',
    'mentor',
    'acquaintance',
  ]),
  contact_frequency_days: z.number().min(1).max(365),
  notes: z.string().optional().or(z.literal('')),
  priority_level: z.number().min(1).max(5),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: relationships, error } = await supabase
      .from('relationships')
      .select(
        `
        *,
        relationship_photos!left(count),
        contact_history!left(id, created_at)
      `
      )
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority_level', { ascending: true })
      .order('last_contact_date', { ascending: false, nullsFirst: true })

    if (error) {
      console.error('Error fetching relationships:', error)
      return NextResponse.json({ error: 'Failed to fetch relationships' }, { status: 500 })
    }

    // Process relationships to include computed fields
    const processedRelationships = relationships.map((rel) => {
      const photosCount = rel.relationship_photos?.[0]?.count || 0
      const lastContactDate = rel.contact_history?.[0]?.created_at || rel.last_contact_date

      return {
        ...rel,
        photos_count: photosCount,
        last_contact_date: lastContactDate,
      }
    })

    return NextResponse.json({ relationships: processedRelationships })
  } catch (error) {
    console.error('Error in relationships GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const body = await request.json()
    const validatedData = createRelationshipSchema.parse(body)

    // Clean up empty strings
    const cleanData = {
      ...validatedData,
      email: validatedData.email || null,
      phone: validatedData.phone || null,
      notes: validatedData.notes || null,
    }

    const { data: relationship, error } = await supabase
      .from('relationships')
      .insert({
        user_id: user.id,
        ...cleanData,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating relationship:', error)
      return NextResponse.json({ error: 'Failed to create relationship' }, { status: 500 })
    }

    return NextResponse.json({ relationship })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    console.error('Error in relationships POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
