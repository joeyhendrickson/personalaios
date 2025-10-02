'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database, Brain, Key, Copy, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react'

export default function SetupPage() {
  const envVars = [
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      description: 'Your Supabase project URL',
      required: true,
      example: 'https://your-project.supabase.co',
      icon: Database,
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      description: 'Supabase anonymous key',
      required: true,
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      icon: Key,
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      description: 'Supabase service role key (server-side only)',
      required: true,
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      icon: Key,
    },
    {
      name: 'OPENAI_API_KEY',
      description: 'OpenAI API key for AI features',
      required: true,
      example: 'sk-...',
      icon: Brain,
    },
    {
      name: 'NEXTAUTH_SECRET',
      description: 'NextAuth.js secret for session encryption',
      required: true,
      example: 'your-secret-key-here',
      icon: Key,
    },
    {
      name: 'NEXTAUTH_URL',
      description: 'Your application URL',
      required: true,
      example: 'http://localhost:3000',
      icon: ExternalLink,
    },
  ]

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Personal AI OS Setup Guide</h1>
          <p className="text-lg text-gray-600">
            Configure your environment variables to enable all features
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Environment Variables */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="mr-2 h-5 w-5" />
                  Environment Variables
                </CardTitle>
                <CardDescription>
                  Create a <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> file in
                  your project root
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {envVars.map((envVar) => (
                  <div key={envVar.name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <envVar.icon className="h-4 w-4 text-gray-500" />
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {envVar.name}
                        </code>
                        {envVar.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{envVar.description}</p>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-gray-50 px-2 py-1 rounded flex-1">
                        {envVar.example}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(`${envVar.name}=${envVar.example}`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Setup Instructions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Supabase Setup
                </CardTitle>
                <CardDescription>Set up your database and authentication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Create Supabase Project</p>
                      <p className="text-sm text-gray-600">
                        Go to{' '}
                        <a
                          href="https://supabase.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          supabase.com
                        </a>{' '}
                        and create a new project
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Get API Keys</p>
                      <p className="text-sm text-gray-600">
                        Go to Settings → API and copy your URL and keys
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Run Database Migrations</p>
                      <p className="text-sm text-gray-600">
                        Execute the SQL files in{' '}
                        <code className="bg-gray-100 px-1 rounded">supabase/migrations/</code>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="mr-2 h-5 w-5" />
                  OpenAI Setup
                </CardTitle>
                <CardDescription>Enable AI-powered features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm font-medium">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Get OpenAI API Key</p>
                      <p className="text-sm text-gray-600">
                        Visit{' '}
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          OpenAI Platform
                        </a>{' '}
                        and create an API key
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm font-medium">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Add to Environment</p>
                      <p className="text-sm text-gray-600">
                        Add your API key to the{' '}
                        <code className="bg-gray-100 px-1 rounded">OPENAI_API_KEY</code> variable
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Quick Start
                </CardTitle>
                <CardDescription>Get up and running quickly</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">
                    Copy this template to your{' '}
                    <code className="bg-gray-100 px-1 rounded">.env.local</code> file:
                  </p>
                  <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto">
                    {envVars.map((envVar) => (
                      <div key={envVar.name}>
                        {envVar.name}={envVar.example}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() =>
                      copyToClipboard(
                        envVars.map((envVar) => `${envVar.name}=${envVar.example}`).join('\n')
                      )
                    }
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Alert className="border-blue-200 bg-blue-50 text-blue-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              After setting up your environment variables, restart your development server with{' '}
              <code className="bg-blue-100 px-2 py-1 rounded">npm run dev</code>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}
