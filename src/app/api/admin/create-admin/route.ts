import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, name, role = 'admin' } = body;

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    // Check if user is already a super admin
    const { data: existingAdmin, error: adminCheckError } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('email', user.email)
      .eq('is_active', true)
      .single();

    if (adminCheckError || !existingAdmin || existingAdmin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // Check if admin user already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('Error checking existing admin user:', userCheckError);
      return NextResponse.json({ error: 'Failed to check existing admin user' }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json({ error: 'Admin user already exists' }, { status: 400 });
    }

    // Create admin user
    const { data: newAdmin, error: createError } = await supabase
      .from('admin_users')
      .insert({
        email,
        name,
        role: role === 'super_admin' ? 'super_admin' : 'admin'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating admin user:', createError);
      return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 });
    }

    return NextResponse.json({ 
      admin: newAdmin,
      message: 'Admin user created successfully'
    });

  } catch (error) {
    console.error('Unexpected error in create admin:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
