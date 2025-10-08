import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const rateAppSchema = z.object({
  moduleId: z.string().min(1),
  rating: z.number().min(1).max(5),
  reviewText: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { moduleId, rating, reviewText } = rateAppSchema.parse(body)

    // Check if user already rated this app
    const { data: existingRating } = await supabase
      .from('app_ratings')
      .select('id')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .single()

    if (existingRating) {
      // Update existing rating
      const { error: updateError } = await supabase
        .from('app_ratings')
        .update({
          rating,
          review_text: reviewText || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRating.id)

      if (updateError) {
        console.error('Error updating rating:', updateError)
        return NextResponse.json({ error: 'Failed to update rating' }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Rating updated successfully',
        action: 'updated'
      })
    } else {
      // Create new rating
      const { error: insertError } = await supabase
        .from('app_ratings')
        .insert({
          user_id: user.id,
          module_id: moduleId,
          rating,
          review_text: reviewText || null
        })

      if (insertError) {
        console.error('Error creating rating:', insertError)
        return NextResponse.json({ error: 'Failed to create rating' }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Rating created successfully',
        action: 'created'
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.issues 
      }, { status: 400 })
    }

    console.error('Error in rating API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId')

    if (moduleId) {
      // Get specific module ratings
      const { data: ratings, error } = await supabase
        .from('app_ratings')
        .select(`
          id,
          rating,
          review_text,
          created_at,
          updated_at,
          user_id
        `)
        .eq('module_id', moduleId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching ratings:', error)
        return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
      }

      // Calculate average rating
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
        : 0

      // Get user's own rating if exists
      const userRating = ratings.find(rating => rating.user_id === user.id)

      return NextResponse.json({
        ratings,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalRatings: ratings.length,
        userRating: userRating ? {
          rating: userRating.rating,
          reviewText: userRating.review_text,
          createdAt: userRating.created_at,
          updatedAt: userRating.updated_at
        } : null
      })
    } else {
      // Get all ratings (for admin dashboard)
      const { data: ratings, error } = await supabase
        .from('app_ratings')
        .select(`
          id,
          rating,
          review_text,
          module_id,
          created_at,
          updated_at,
          user_id,
          user_profiles!inner(
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching all ratings:', error)
        return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
      }

      return NextResponse.json({ ratings })
    }
  } catch (error) {
    console.error('Error in ratings GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
