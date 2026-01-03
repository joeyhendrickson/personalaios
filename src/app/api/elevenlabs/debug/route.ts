import { NextRequest, NextResponse } from 'next/server'

// Diagnostic endpoint to check API key configuration in production
// This helps diagnose 401 errors without exposing the actual key
export async function GET(request: NextRequest) {
  const apiKeyFromProcess = process.env.ELEVENLABS_API_KEY
  const apiKeyTrimmed = apiKeyFromProcess?.trim()

  // Test the API key by making a simple request to ElevenLabs
  let apiTestResult: any = { status: 'not_tested' }
  if (apiKeyTrimmed) {
    try {
      const testResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': apiKeyTrimmed,
        },
      })

      apiTestResult = {
        status: testResponse.status,
        statusText: testResponse.statusText,
        ok: testResponse.ok,
        message: testResponse.ok
          ? 'API key is valid and working'
          : `API key test failed: ${testResponse.status} ${testResponse.statusText}`,
      }

      if (!testResponse.ok) {
        const errorText = await testResponse.text()
        try {
          const errorJson = JSON.parse(errorText)
          apiTestResult.error = errorJson
        } catch {
          apiTestResult.errorText = errorText
        }
      }
    } catch (error) {
      apiTestResult = {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  return NextResponse.json(
    {
      hasApiKey: !!apiKeyFromProcess,
      hasTrimmedApiKey: !!apiKeyTrimmed,
      apiKeyLength: apiKeyFromProcess?.length || 0,
      trimmedKeyLength: apiKeyTrimmed?.length || 0,
      apiKeyPrefix: apiKeyTrimmed ? `${apiKeyTrimmed.substring(0, 10)}...` : 'none',
      apiKeyEndsWith:
        apiKeyTrimmed && apiKeyTrimmed.length > 10
          ? `...${apiKeyTrimmed.substring(apiKeyTrimmed.length - 4)}`
          : 'none',
      apiKeyLooksValid: apiKeyTrimmed ? /^[a-zA-Z0-9]{20,}/.test(apiKeyTrimmed) : false,
      nodeEnv: process.env.NODE_ENV,
      apiTest: apiTestResult,
      // Check for common issues
      issues: [
        !apiKeyFromProcess && 'ELEVENLABS_API_KEY is not set in process.env',
        apiKeyFromProcess &&
          apiKeyFromProcess.length !== apiKeyTrimmed?.length &&
          'API key has leading/trailing whitespace',
        apiKeyTrimmed && !/^[a-zA-Z0-9]{20,}/.test(apiKeyTrimmed) && 'API key format looks invalid',
        apiTestResult.status === 401 &&
          'API key is being rejected by ElevenLabs (401 Unauthorized)',
        apiTestResult.status === 403 && 'API key is invalid or expired (403 Forbidden)',
      ].filter(Boolean),
    },
    { status: 200 }
  )
}
