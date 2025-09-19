import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET(request: NextRequest) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // List available models
    const models = await openai.models.list();
    
    const modelList = models.data.map(model => ({
      id: model.id,
      owned_by: model.owned_by,
      created: model.created
    }));

    return NextResponse.json({
      message: 'Available models',
      models: modelList,
      total: modelList.length
    });

  } catch (error) {
    console.error('Error listing OpenAI models:', error);
    return NextResponse.json({
      error: 'Failed to list OpenAI models',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
