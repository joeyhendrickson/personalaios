import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { ContentGenerator } from '@/lib/post-creator/content-generation'
import { decrypt } from '@/lib/crypto'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      platform,
      topic,
      sentiment,
      target_audience,
      goal,
      length_percentage,
      include_hashtags,
      include_call_to_action,
    } = body

    if (!platform || !topic || !target_audience || !goal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user's voice profile
    const { data: voiceProfile, error: profileError } = await supabase
      .from('post_creator_voice_profiles')
      .select('voice_profile')
      .eq('user_id', user.id)
      .single()

    if (profileError || !voiceProfile) {
      return NextResponse.json(
        { error: 'No voice profile found. Please complete voice analysis first.' },
        { status: 400 }
      )
    }

    // Get OpenAI API key
    const { data: credentials } = await supabase
      .from('project_plan_builder_credentials')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .single()

    const openaiKey = credentials?.openai_api_key
      ? decrypt(credentials.openai_api_key)
      : process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: 'OpenAI API key not found' }, { status: 400 })
    }

    // Generate post using AI
    const contentGenerator = new ContentGenerator(openaiKey)
    const generatedPost = await contentGenerator.generatePost(voiceProfile.voice_profile, {
      platform,
      topic,
      sentiment,
      target_audience,
      goal,
      length_percentage,
      include_hashtags,
      include_call_to_action,
    })

    // Store the generated post
    const postId = uuidv4()
    const { data: post, error: postError } = await supabase
      .from('post_creator_posts')
      .insert({
        id: postId,
        user_id: user.id,
        platform,
        content: generatedPost.content,
        title: generatedPost.title,
        hashtags: generatedPost.hashtags,
        call_to_action: generatedPost.call_to_action,
        engagement_score: generatedPost.engagement_score,
        voice_match_score: generatedPost.voice_match_score,
        generation_params: {
          topic,
          sentiment,
          target_audience,
          goal,
          length_percentage,
          include_hashtags,
          include_call_to_action,
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (postError) {
      console.error('Error storing generated post:', postError)
      return NextResponse.json({ error: 'Failed to store generated post' }, { status: 500 })
    }

    return NextResponse.json({
      post,
      message: 'Post generated successfully',
    })
  } catch (error) {
    console.error('Error generating post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
