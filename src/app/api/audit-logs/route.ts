import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createError, handleApiError, ERROR_CODES } from '@/lib/error-handling';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const tableName = searchParams.get('table');
    const operation = searchParams.get('operation');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (tableName) {
      query = query.eq('table_name', tableName);
    }

    if (operation) {
      query = query.eq('operation', operation);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: logs, error } = await query;

    if (error) {
      throw handleApiError(error, 'Audit Logs API');
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (tableName) {
      countQuery = countQuery.eq('table_name', tableName);
    }

    if (operation) {
      countQuery = countQuery.eq('operation', operation);
    }

    if (startDate) {
      countQuery = countQuery.gte('created_at', startDate);
    }

    if (endDate) {
      countQuery = countQuery.lte('created_at', endDate);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.warn('Failed to get audit logs count:', countError);
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    });

  } catch (error) {
    const appError = handleApiError(error, 'Audit Logs API');
    
    return NextResponse.json(
      {
        error: appError.message,
        code: appError.code,
      },
      { status: 500 }
    );
  }
}

// POST endpoint for creating audit logs (system use only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { table_name, operation, record_id, old_data, new_data, metadata } = body;

    // Validate required fields
    if (!table_name || !operation || !record_id) {
      throw createError(
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        'Missing required fields: table_name, operation, record_id'
      );
    }

    // Validate operation
    if (!['INSERT', 'UPDATE', 'DELETE'].includes(operation)) {
      throw createError(
        ERROR_CODES.INVALID_FORMAT,
        'Invalid operation. Must be INSERT, UPDATE, or DELETE'
      );
    }

    const { data: log, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        table_name,
        operation,
        record_id,
        old_data,
        new_data,
        metadata,
      })
      .select()
      .single();

    if (error) {
      throw handleApiError(error, 'Create Audit Log');
    }

    return NextResponse.json({ log }, { status: 201 });

  } catch (error) {
    const appError = handleApiError(error, 'Create Audit Log');
    
    return NextResponse.json(
      {
        error: appError.message,
        code: appError.code,
      },
      { status: 500 }
    );
  }
}
