import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Verify user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all refund requests with user details
    const { data: refundRequests, error } = await supabase
      .from('refund_requests')
      .select(
        `
        *,
        auth.users!inner(email, created_at as user_created_at)
      `
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching refund requests:', error)
      return NextResponse.json({ error: 'Failed to fetch refund requests' }, { status: 500 })
    }

    return NextResponse.json({ refundRequests })
  } catch (error) {
    console.error('Refund requests fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const { requestId, action, adminNotes } = await request.json()

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Request ID and action are required' }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get refund request details
    const { data: refundRequest, error: fetchError } = await supabase
      .from('refund_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError || !refundRequest) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 })
    }

    if (refundRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Refund request already processed' }, { status: 400 })
    }

    let newStatus = action === 'approve' ? 'approved' : 'rejected'
    const updateData: any = {
      status: newStatus,
      processed_by: user.id,
      processed_at: new Date().toISOString(),
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    }

    // If approving, process the actual refund
    if (action === 'approve') {
      try {
        const refundResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/subscriptions/refund`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscriptionId: refundRequest.paypal_subscription_id,
              reason: `Admin approved refund - ${adminNotes || 'manual approval'}`,
            }),
          }
        )

        if (refundResponse.ok) {
          const refundResult = await refundResponse.json()
          updateData.refund_id = refundResult.refundId
          updateData.status = 'processed'
          newStatus = 'processed'
        } else {
          const errorResult = await refundResponse.json()
          throw new Error(errorResult.error || 'Refund processing failed')
        }
      } catch (refundError) {
        console.error('Refund processing failed:', refundError)
        return NextResponse.json(
          {
            error: `Failed to process refund: ${refundError instanceof Error ? refundError.message : 'Unknown error'}`,
          },
          { status: 500 }
        )
      }
    }

    // Update refund request
    const { error: updateError } = await supabase
      .from('refund_requests')
      .update(updateData)
      .eq('id', requestId)

    if (updateError) {
      console.error('Error updating refund request:', updateError)
      return NextResponse.json({ error: 'Failed to update refund request' }, { status: 500 })
    }

    // Log admin activity
    await supabase.from('user_activity_logs').insert({
      user_id: user.id,
      activity_type: `refund_request_${action}ed`,
      activity_data: {
        refund_request_id: requestId,
        user_email: refundRequest.email,
        amount: refundRequest.amount,
        action: action,
        admin_notes: adminNotes || null,
      },
      created_at: new Date().toISOString(),
    })

    console.log(`✅ Refund request ${action}ed by admin:`, requestId)

    return NextResponse.json({
      success: true,
      message: `Refund request ${action}ed successfully`,
      status: newStatus,
    })
  } catch (error) {
    console.error('Refund request processing error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
