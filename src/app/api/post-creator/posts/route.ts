import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: posts, error } = await supabase
      .from('post_creator_posts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching generated posts:', error)
      return NextResponse.json({ error: 'Failed to fetch generated posts' }, { status: 500 })
    }

    // Parse JSON fields
    const parsedPosts = (posts || []).map((post) => ({
      ...post,
      hashtags: typeof post.hashtags === 'string' ? JSON.parse(post.hashtags) : post.hashtags,
      generation_params:
        typeof post.generation_params === 'string'
          ? JSON.parse(post.generation_params)
          : post.generation_params,
    }))

    return NextResponse.json({
      posts: parsedPosts,
      message: 'Generated posts fetched successfully',
    })
  } catch (error) {
    console.error('Error in posts GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
