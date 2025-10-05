import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/business-hacks - Get all business apps for the current user
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

    const { data: businessApps, error: businessAppsError } = await supabase
      .from('business_apps')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (businessAppsError) {
      console.error('Error fetching business apps:', businessAppsError)
      return NextResponse.json({ error: 'Failed to fetch business apps' }, { status: 500 })
    }

    return NextResponse.json({ businessApps: businessApps || [] }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST /api/business-hacks/install - Install a new business app
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
    const { appName } = body

    if (!appName) {
      return NextResponse.json({ error: 'App name is required' }, { status: 400 })
    }

    // Check if app is already installed
    const { data: existingApp } = await supabase
      .from('business_apps')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', appName)
      .single()

    if (existingApp) {
      return NextResponse.json({ error: 'App is already installed' }, { status: 400 })
    }

    // Get app details based on name
    const appDetails = getAppDetails(appName)
    if (!appDetails) {
      return NextResponse.json({ error: 'Invalid app name' }, { status: 400 })
    }

    const { data: businessApp, error: businessAppError } = await supabase
      .from('business_apps')
      .insert({
        user_id: user.id,
        name: appDetails.name,
        description: appDetails.description,
        icon: appDetails.icon,
        is_active: true,
      })
      .select()
      .single()

    if (businessAppError) {
      console.error('Error creating business app:', businessAppError)
      return NextResponse.json({ error: 'Failed to install business app' }, { status: 500 })
    }

    return NextResponse.json({ businessApp }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function getAppDetails(appName: string) {
  const apps = {
    'Co-Writer': {
      name: 'Co-Writer',
      description:
        'AI-powered songwriting assistant for analyzing songs, providing feedback, and helping improve lyrics through iteration.',
      icon: 'Music',
    },
    'Ghost Writer': {
      name: 'Ghost Writer',
      description:
        'AI book writing assistant that helps structure and write books chapter by chapter, from outline to finished manuscript.',
      icon: 'BookOpen',
    },
    'Project Plan Builder': {
      name: 'Project Plan Builder',
      description:
        'AI-powered project planning tool that analyzes client documents and generates comprehensive project plans with BYOK integration.',
      icon: 'FileText',
    },
    'RAID Monitoring Tool': {
      name: 'RAID Monitoring Tool',
      description:
        'Continuous monitoring tool that analyzes Google Drive documents to build RAID logs and automatically detect critical fires.',
      icon: 'AlertTriangle',
    },
    'Post Creator': {
      name: 'Post Creator',
      description:
        'AI-powered social media post generator that analyzes your historical posts to create authentic content in your unique voice.',
      icon: 'PenTool',
    },
  }

  return apps[appName as keyof typeof apps] || null
}
