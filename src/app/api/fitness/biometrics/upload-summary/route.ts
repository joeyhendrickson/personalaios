import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('screenshot') as File | null
    if (!file) return NextResponse.json({ error: 'screenshot file required' }, { status: 400 })

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/iphone-fitness-summary/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('body-photos').upload(path, file)
    if (uploadError) {
      console.error(uploadError)
      return NextResponse.json(
        { error: 'Upload failed', details: uploadError.message },
        { status: 500 }
      )
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('body-photos').getPublicUrl(path)

    return NextResponse.json({ image_url: publicUrl })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
