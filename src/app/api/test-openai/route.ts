import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function GET(request: NextRequest) {
  try {
    // Test different models to see which ones work
    const modelsToTest = [
      'gpt-4o',
      'gpt-4o-mini', 
      'gpt-3.5-turbo',
      'gpt-4',
      'gpt-3.5-turbo-16k'
    ];

    const results: { [key: string]: string } = {};

    for (const modelName of modelsToTest) {
      try {
        console.log(`Testing model: ${modelName}`);
        const result = await generateText({
          model: openai(modelName),
          messages: [
            {
              role: "user",
              content: "Say 'Hello' in one word."
            }
          ],
          maxTokens: 5
        });
        results[modelName] = 'SUCCESS: ' + result.text;
        console.log(`${modelName}: SUCCESS`);
      } catch (error: any) {
        results[modelName] = 'FAILED: ' + error.message;
        console.log(`${modelName}: FAILED - ${error.message}`);
      }
    }

    return NextResponse.json({
      message: 'Model availability test completed',
      results
    });

  } catch (error) {
    console.error('Error testing OpenAI models:', error);
    return NextResponse.json({
      error: 'Failed to test OpenAI models',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
