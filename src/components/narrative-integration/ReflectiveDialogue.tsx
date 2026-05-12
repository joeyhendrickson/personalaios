'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Send, User } from 'lucide-react'

type Msg = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

export default function ReflectiveDialogue(props: {
  session: {
    id: string
    current_phase: string
    safety_status: 'ok' | 'needs_grounding' | 'high_risk'
  }
  disabled: boolean
  onUpdated: (session: any) => void
  onRefresh: () => void
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(
          `/api/modules/narrative-integration/sessions/${props.session.id}/messages`
        )
        const json = await res.json()
        if (res.ok) setMessages(json.messages || [])
      } catch {
        // ignore
      }
    })()
  }, [props.session.id])

  const send = async () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setError(null)

    const optimistic: Msg = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMessages((p) => [...p, optimistic])

    try {
      setLoading(true)
      const res = await fetch('/api/modules/narrative-integration/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: props.session.id,
          message: text,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || json?.details || 'Failed to get response')

      setMessages((p) => [
        ...p,
        { id: json.messageId || `a-${Date.now()}`, role: 'assistant', content: json.response },
      ])

      if (json.session) props.onUpdated(json.session)
      props.onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get response')
    } finally {
      setLoading(false)
    }
  }

  const placeholder =
    props.session.safety_status === 'high_risk'
      ? 'Stabilization mode: keep it to “Am I safe right now?” and grounding.'
      : 'Type a short response…'

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Guided reflection</h2>
        <p className="text-sm text-gray-600">
          One question at a time. If you notice looping, we’ll shift toward belief, meaning, and
          next action.
        </p>
      </div>

      <div className="h-[420px] overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="text-sm text-gray-600">
            When you’re ready, share one sentence about what feels unresolved — or what you want to
            stop replaying.
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%]">
              <div
                className={`flex items-start gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`p-2 rounded-full ${
                    m.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            </div>
          </div>
        ))}

        {loading && <div className="text-sm text-gray-600">Reflecting…</div>}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="px-5 py-3 bg-red-50 border-t border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="px-5 py-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={props.disabled || loading}
          />
          <button
            onClick={send}
            disabled={props.disabled || loading || !input.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
