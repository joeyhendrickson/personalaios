import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contactId')

    let query = supabase
      .from('interactions')
      .select(
        `
        *,
        contacts (
          id,
          name,
          relationship_types (
            name
          )
        )
      `
      )
      .eq('user_id', user.id)
      .order('interaction_date', { ascending: false })

    if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    const { data: interactions, error } = await query

    if (error) {
      console.error('Error fetching interactions:', error)
      return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 })
    }

    return NextResponse.json({ interactions })
  } catch (error) {
    console.error('Error in interactions API:', error)
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
    const { contactId, interactionType, notes, outcome, followUpDate } = body

    if (!contactId || !interactionType) {
      return NextResponse.json(
        { error: 'Contact ID and interaction type are required' },
        { status: 400 }
      )
    }

    // Create interaction
    const { data: interaction, error: interactionError } = await supabase
      .from('interactions')
      .insert({
        contact_id: contactId,
        user_id: user.id,
        interaction_type: interactionType,
        notes,
        outcome,
        follow_up_date: followUpDate,
      })
      .select()
      .single()

    if (interactionError) {
      console.error('Error creating interaction:', interactionError)
      return NextResponse.json({ error: 'Failed to create interaction' }, { status: 500 })
    }

    // Update last contact date on the contact
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ last_contact_date: new Date().toISOString() })
      .eq('id', contactId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating last contact date:', updateError)
      // Don't fail the entire request if this update fails
    }

    return NextResponse.json({ interaction }, { status: 201 })
  } catch (error) {
    console.error('Error in create interaction API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
