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
    const relationshipTypeId = searchParams.get('relationshipTypeId')

    let query = supabase
      .from('contacts')
      .select(
        `
        *,
        relationship_types (
          id,
          name,
          description
        ),
        contact_profiles (
          id,
          profile_data
        )
      `
      )
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name')

    if (relationshipTypeId) {
      query = query.eq('relationship_type_id', relationshipTypeId)
    }

    const { data: contacts, error } = await query

    if (error) {
      console.error('Error fetching contacts:', error)
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error('Error in contacts API:', error)
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
    const {
      name,
      relationshipTypeId,
      email,
      phone,
      zipcode,
      notes,
      preferredContactFrequencyDays,
      profileData,
    } = body

    if (!name || !relationshipTypeId) {
      return NextResponse.json(
        { error: 'Name and relationship type are required' },
        { status: 400 }
      )
    }

    // Create contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        user_id: user.id,
        name,
        relationship_type_id: relationshipTypeId,
        email,
        phone,
        zipcode,
        notes,
        preferred_contact_frequency_days: preferredContactFrequencyDays || 7,
      })
      .select()
      .single()

    if (contactError) {
      console.error('Error creating contact:', contactError)
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
    }

    // Create contact profile if profile data provided
    if (profileData && Object.keys(profileData).length > 0) {
      const { error: profileError } = await supabase.from('contact_profiles').insert({
        contact_id: contact.id,
        profile_data: profileData,
      })

      if (profileError) {
        console.error('Error creating contact profile:', profileError)
        // Don't fail the entire request if profile creation fails
      }
    }

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    console.error('Error in create contact API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
