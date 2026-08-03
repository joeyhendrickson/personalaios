'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Sparkles,
  Target,
  Eye,
  User,
  Bot,
  Loader2,
  MessageSquare,
  Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type ConversationMessage = {
  id?: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  phase?: string
}

type SavedSessionDetail = {
  id: string
  assessment_data: Record<string, unknown> & {
    session_title?: string
    session_source?: string
    vision_statement?: string
    dreams_discovered?: string[]
    personal_insights?: string[]
    personality_traits?: string[]
    goals_generated?: Array<{ goal: string; category?: string; timeline?: string }>
    conversation_messages?: ConversationMessage[]
  }
  completed_at: string | null
  created_at: string
}

function sourceLabel(source?: string): string {
  if (source === 'onboarding') return 'New user setup'
  if (source === 'fear_catcher') return 'Fear Catcher'
  return 'Dream Catcher'
}

function StringList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export default function SavedDreamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  const [session, setSession] = useState<SavedSessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/modules/dream-catcher/saved/${sessionId}`)
        if (!res.ok) throw new Error('Failed to load saved dream')
        const data = await res.json()
        setSession(data.session)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    if (sessionId) void load()
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="container mx-auto px-6 py-12">
        <p className="text-red-600">{error || 'Session not found'}</p>
        <Link href="/modules/dream-catcher/saved">
          <Button variant="outline" className="mt-4">
            Back to Saved Dreams
          </Button>
        </Link>
      </div>
    )
  }

  const data = session.assessment_data
  const messages = data.conversation_messages ?? []
  const title = data.session_title || 'Saved Dream'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/modules/dream-catcher/saved">
                <Button variant="ghost" size="sm" className="mb-2 -ml-2">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Saved Dreams
                </Button>
              </Link>
              <h1 className="flex items-center text-2xl font-bold text-black">
                <Sparkles className="mr-2 h-7 w-7 text-purple-600" />
                {title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <Badge variant="secondary">{sourceLabel(data.session_source)}</Badge>
                <span>
                  {new Date(session.completed_at ?? session.created_at).toLocaleDateString(
                    'en-US',
                    { year: 'numeric', month: 'long', day: 'numeric' }
                  )}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push(`/modules/dream-catcher?sessionId=${session.id}`)}
            >
              Continue in Dream Catcher
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto grid gap-6 px-6 py-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          {data.vision_statement && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-base">
                  <Eye className="mr-2 h-4 w-4 text-purple-600" />
                  Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm italic text-gray-700">"{data.vision_statement}"</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">What we captured</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StringList title="Dreams discovered" items={data.dreams_discovered ?? []} />
              <StringList title="Personal insights" items={data.personal_insights ?? []} />
              <StringList title="Personality traits" items={data.personality_traits ?? []} />
              {data.goals_generated && data.goals_generated.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center text-sm font-semibold text-gray-900">
                    <Target className="mr-1 h-4 w-4 text-purple-600" />
                    Goals ({data.goals_generated.length})
                  </h3>
                  <ul className="space-y-2">
                    {data.goals_generated.map((g, i) => (
                      <li key={i} className="rounded-md border bg-white p-2 text-sm text-gray-700">
                        {g.goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <MessageSquare className="mr-2 h-4 w-4 text-purple-600" />
              Your responses & conversation
              {messages.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({messages.length} messages)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">
                <Lightbulb className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                No conversation transcript was stored for this session. Structured answers above may
                still be available.
              </div>
            ) : (
              <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                {messages.map((msg, i) => (
                  <div
                    key={msg.id ?? i}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100">
                        <Bot className="h-4 w-4 text-purple-700" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
                        msg.role === 'user'
                          ? 'bg-black text-white'
                          : 'border border-gray-200 bg-white text-gray-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.phase && (
                        <p
                          className={`mt-2 text-xs ${msg.role === 'user' ? 'text-gray-300' : 'text-gray-500'}`}
                        >
                          {msg.phase}
                        </p>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                        <User className="h-4 w-4 text-gray-700" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
