import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      name,
      email,
      phone,
      zipcode,
      notes,
      engagementScore,
      preferredContactFrequencyDays,
      profileData,
    } = body

    // Update contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .update({
        name,
        email,
        phone,
        zipcode,
        notes,
        engagement_score: engagementScore,
        preferred_contact_frequency_days: preferredContactFrequencyDays,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (contactError) {
      console.error('Error updating contact:', contactError)
      return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
    }

    // Update contact profile if profile data provided
    if (profileData && Object.keys(profileData).length > 0) {
      const { error: profileError } = await supabase.from('contact_profiles').upsert({
        contact_id: id,
        profile_data: profileData,
      })

      if (profileError) {
        console.error('Error updating contact profile:', profileError)
        // Don't fail the entire request if profile update fails
      }
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error in update contact API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('contacts')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting contact:', error)
      return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete contact API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
