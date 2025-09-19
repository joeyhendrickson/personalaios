import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role, is_active')
      .eq('email', user.email)
      .eq('is_active', true)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get URL parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Build query for users with analytics
    let query = supabase
      .from('user_analytics_summary')
      .select(`
        *,
        auth.users!inner(
          id,
          email,
          created_at,
          last_sign_in_at
        )
      `);

    // Add search filter if provided
    if (search) {
      query = query.ilike('auth.users.email', `%${search}%`);
    }

    // Add sorting
    const sortColumn = sortBy === 'email' ? 'auth.users.email' : 
                      sortBy === 'created_at' ? 'auth.users.created_at' :
                      sortBy === 'last_visit' ? 'last_visit' :
                      sortBy === 'total_visits' ? 'total_visits' :
                      'created_at';

    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: users, error: usersError } = await query;

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('user_analytics_summary')
      .select('id', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.ilike('auth.users.email', `%${search}%`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error fetching user count:', countError);
      return NextResponse.json({ error: 'Failed to fetch user count' }, { status: 500 });
    }

    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Unexpected error in admin users:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
