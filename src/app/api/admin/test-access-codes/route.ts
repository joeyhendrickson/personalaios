import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET() {
  console.log('🧪 TEST ACCESS CODES API CALLED')

  const testResults: any = {
    timestamp: new Date().toISOString(),
    steps: [],
  }

  try {
    const supabase = await createClient()

    // Step 1: Check admin authentication
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    testResults.session = {
      exists: !!session,
      user_email: session?.user?.email,
      error: sessionError?.message,
    }
    testResults.steps.push(`✅ Session check: ${session ? 'Found' : 'None'}`)

    if (sessionError || !session?.user) {
      testResults.steps.push('❌ No valid session')
      return NextResponse.json({ testResults })
    }

    // Step 2: Check admin status
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('email', session.user.email)
      .single()

    testResults.adminCheck = {
      isAdmin: !!adminUser,
      adminData: adminUser,
      error: adminError?.message,
    }
    testResults.steps.push(`✅ Admin check: ${adminUser ? 'YES' : 'NO'}`)

    if (adminError || !adminUser) {
      testResults.steps.push('❌ User is not admin')
      return NextResponse.json({ testResults })
    }

    // Step 3: Create service role client
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    testResults.steps.push('✅ Service role client created')

    // Step 4: Check if access_codes table exists
    const { data: tableCheck, error: tableError } = await serviceSupabase
      .from('access_codes')
      .select('count', { count: 'exact' })
      .limit(1)

    testResults.tableCheck = {
      exists: !tableError,
      error: tableError?.message,
      count: tableCheck?.length,
    }
    testResults.steps.push(`✅ Table check: ${tableError ? 'ERROR' : 'EXISTS'}`)

    // Step 5: Check if function exists by trying to call it
    try {
      const { data: functionTest, error: functionError } = await serviceSupabase.rpc(
        'create_access_code',
        {
          code_name: 'Test Code',
          code_email: 'test@example.com',
          expires_days: 30,
        }
      )

      testResults.functionTest = {
        success: !functionError,
        data: functionTest,
        error: functionError?.message,
      }
      testResults.steps.push(`✅ Function test: ${functionError ? 'ERROR' : 'SUCCESS'}`)

      if (!functionError && functionTest) {
        testResults.steps.push(`✅ Generated code: ${functionTest[0]?.code}`)
      }
    } catch (functionException) {
      testResults.functionTest = {
        success: false,
        error: functionException instanceof Error ? functionException.message : 'Unknown error',
      }
      testResults.steps.push(`❌ Function exception: ${testResults.functionTest.error}`)
    }

    // Step 6: Check existing codes
    const { data: existingCodes, error: codesError } = await serviceSupabase
      .from('access_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    testResults.existingCodes = {
      count: existingCodes?.length || 0,
      codes: existingCodes,
      error: codesError?.message,
    }
    testResults.steps.push(`✅ Existing codes: ${existingCodes?.length || 0} found`)

    testResults.steps.push('✅ All tests completed')

    return NextResponse.json({
      success: true,
      testResults,
      message: 'Access codes system test complete',
    })
  } catch (error) {
    testResults.steps.push(
      `❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    testResults.error = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({
      success: false,
      testResults,
      error: testResults.error,
    })
  }
}
