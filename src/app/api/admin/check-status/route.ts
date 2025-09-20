import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin - SIMPLE CHECK
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, name, role')
      .eq('email', user.email)
      .single();

    if (adminError || !adminUser) {
      console.error('Admin check failed:', {
        userEmail: user.email,
        adminError: adminError,
        adminUser: adminUser
      });
      return NextResponse.json({ 
        error: 'Admin access required',
        debug: {
          userEmail: user.email,
          adminError: adminError?.message
        }
      }, { status: 403 });
    }

    // Return admin user data
    return NextResponse.json({
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        is_active: true // If in admin_users table, they're active
      }
    });

  } catch (error) {
    console.error('Unexpected error in admin check status:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
