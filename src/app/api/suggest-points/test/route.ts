import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Point suggestion API is working!',
    timestamp: new Date().toISOString(),
    test_data: {
      title: 'Go for a 30-minute run',
      description: 'Morning jog around the neighborhood',
      category: 'health',
      expected_suggestion: 'Based on similar completed tasks or category defaults'
    }
  });
}
