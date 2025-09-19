import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ErrorHandler, createError, ERROR_CODES } from '@/lib/error-handling';

// Verify the request is from a valid cron service
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.warn('CRON_SECRET not set - allowing all requests in development');
    return process.env.NODE_ENV === 'development';
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  const errorHandler = ErrorHandler.getInstance();
  
  try {
    // Verify this is a legitimate cron request
    if (!verifyCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    
    // Run the nightly maintenance function
    const { data, error } = await supabase.rpc('run_nightly_maintenance');
    
    if (error) {
      throw createError(
        ERROR_CODES.WEEK_ROLLOVER_FAILED,
        'Failed to run nightly maintenance',
        error,
        'Cron Job'
      );
    }

    // Log successful execution
    errorHandler.logError({
      code: 'CRON_SUCCESS',
      message: 'Nightly maintenance completed successfully',
      details: { data },
      context: 'Cron Job',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Nightly maintenance completed successfully',
      timestamp: new Date().toISOString(),
      data,
    });

  } catch (error) {
    const appError = error instanceof Error ? 
      createError(ERROR_CODES.WEEK_ROLLOVER_FAILED, error.message, error, 'Cron Job') :
      createError(ERROR_CODES.INTERNAL_ERROR, 'Unknown error in cron job', error, 'Cron Job');

    errorHandler.logError({
      code: appError.code,
      message: appError.message,
      details: appError.details,
      context: appError.context,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        error: appError.message,
        code: appError.code,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Allow GET for testing
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 404 }
    );
  }

  return POST(request);
}
