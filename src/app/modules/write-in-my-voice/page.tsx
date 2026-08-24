'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  Trash2,
  Sparkles,
  FileText,
  PenTool,
  Loader2,
  Copy,
  CheckCircle,
  BookOpen,
  Mail,
  MessageSquare,
  RefreshCw,
} from 'lucide-react'
import {
  MATERIAL_LABELS,
  MATERIAL_TYPES,
  SOURCE_LABELS,
  SOURCE_TYPES,
  MIN_WORDS_FOR_ANALYSIS,
} from '@/lib/write-in-my-voice/constants'
import type { VoiceMaterialType, VoiceSampleSourceType } from '@/lib/write-in-my-voice/constants'

type Sample = {
  id: string
  source_type: string
  file_name: string
  word_count: number
  created_at: string
}

type VoiceProfile = {
  tone: string
  writing_style: string
  common_themes: string[]
  signature_phrases: string[]
  personal_voice: string
  do_list: string[]
  avoid_list: string[]
}

type Draft = {
  id: string
  material_type: string
  prompt: string
  title: string | null
  content: string
  voice_match_score: number | null
  created_at: string
}

const MATERIAL_ICONS: Record<VoiceMaterialType, React.ReactNode> = {
  blog_post: <FileText className="h-4 w-4" />,
  social_media_post: <MessageSquare className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  book: <BookOpen className="h-4 w-4" />,
}

export default function WriteInMyVoiceModule() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [samples, setSamples] = useState<Sample[]>([])
  const [totalWords, setTotalWords] = useState(0)
  const [profile, setProfile] = useState<VoiceProfile | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])

  const [uploadSourceType, setUploadSourceType] = useState<VoiceSampleSourceType>('other')
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [materialType, setMaterialType] = useState<VoiceMaterialType>('blog_post')
  const [prompt, setPrompt] = useState('')
  const [generatedContent, setGeneratedContent] = useState<Draft | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [samplesRes, profileRes, draftsRes] = await Promise.all([
        fetch('/api/write-in-my-voice/samples'),
        fetch('/api/write-in-my-voice/profile'),
        fetch('/api/write-in-my-voice/drafts?limit=10'),
      ])

      if (samplesRes.ok) {
        const data = await samplesRes.json()
        setSamples(data.samples ?? [])
        setTotalWords(data.totalWords ?? 0)
      }

      if (profileRes.ok) {
        const data = await profileRes.json()
        if (data.profile?.voice_profile) {
          setProfile(data.profile.voice_profile)
          setConfidence(data.profile.confidence_score ?? null)
        } else {
          setProfile(null)
          setConfidence(null)
        }
      }

      if (draftsRes.ok) {
        const data = await draftsRes.json()
        setDrafts(data.drafts ?? [])
      }
    } catch (error) {
      console.error('Failed to load Write In My Voice data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('source_type', uploadSourceType)
        const res = await fetch('/api/write-in-my-voice/samples', {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          const err = await res.json()
          alert(err.error ?? 'Upload failed')
        }
      }
      await fetchAll()
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteSample = async (id: string) => {
    if (!confirm('Remove this writing sample?')) return
    const res = await fetch(`/api/write-in-my-voice/samples?id=${id}`, { method: 'DELETE' })
    if (res.ok) await fetchAll()
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/write-in-my-voice/analyze', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Analysis failed')
        return
      }
      setProfile(data.voice_profile)
      setConfidence(data.confidence_score)
      await fetchAll()
    } finally {
      setAnalyzing(false)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setGeneratedContent(null)
    try {
      const res = await fetch('/api/write-in-my-voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material_type: materialType, prompt: prompt.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Generation failed')
        return
      }
      setGeneratedContent(data.draft)
      await fetchAll()
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canAnalyze = totalWords >= MIN_WORDS_FOR_ANALYSIS && samples.length > 0
  const hasProfile = Boolean(profile)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-violet-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/modules"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-violet-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Life Hacks
        </Link>

        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-3">
              <PenTool className="h-8 w-8 text-violet-700" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Write In My Voice</h1>
              <p className="text-gray-600">
                Upload your past writing, learn your voice, and generate new content that sounds like
                you.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Upload samples */}
        <section className="mb-8 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Upload className="h-5 w-5 text-violet-600" />
            1. Upload Your Writing
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            Facebook exports, blog posts, emails — .txt, .md, .json, .csv, or .html (max 5 MB each).
          </p>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Source type</label>
            <select
              value={uploadSourceType}
              onChange={(e) => setUploadSourceType(e.target.value as VoiceSampleSourceType)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SOURCE_LABELS[t]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.json,.csv,.html,.htm"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <span className="text-sm text-gray-500">
              {samples.length} files · {totalWords.toLocaleString()} words
            </span>
          </div>

          {samples.length > 0 && (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
              {samples.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">{s.file_name}</span>
                    <span className="ml-2 text-gray-500">
                      {SOURCE_LABELS[s.source_type as VoiceSampleSourceType] ?? s.source_type} ·{' '}
                      {s.word_count} words
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSample(s.id)}
                    className="text-gray-400 hover:text-red-500"
                    aria-label="Delete sample"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Step 2: Analyze voice */}
        <section className="mb-8 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Sparkles className="h-5 w-5 text-violet-600" />
            2. Analyze Your Voice
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            AI reads your samples to learn tone, style, and signature patterns. Requires at least{' '}
            {MIN_WORDS_FOR_ANALYSIS} words.
          </p>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canAnalyze || analyzing}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {hasProfile ? 'Re-analyze Voice' : 'Analyze Voice'}
          </button>

          {hasProfile && profile && (
            <div className="mt-4 rounded-lg bg-violet-50 p-4 text-sm">
              <div className="mb-2 flex items-center gap-2 font-medium text-violet-900">
                <CheckCircle className="h-4 w-4" />
                Voice profile ready
                {confidence != null && (
                  <span className="text-violet-600">({Math.round(confidence * 100)}% confidence)</span>
                )}
              </div>
              <p>
                <strong>Tone:</strong> {profile.tone} · <strong>Style:</strong>{' '}
                {profile.writing_style}
              </p>
              {profile.common_themes?.length > 0 && (
                <p className="mt-1">
                  <strong>Themes:</strong> {profile.common_themes.join(', ')}
                </p>
              )}
              {profile.signature_phrases?.length > 0 && (
                <p className="mt-1">
                  <strong>Signature phrases:</strong> {profile.signature_phrases.slice(0, 5).join(', ')}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Step 3: Generate */}
        <section className="mb-8 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <PenTool className="h-5 w-5 text-violet-600" />
            3. Write In Your Voice
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            Choose a format, describe what you want to write, and AI will draft it in your personal
            tone. If your prompt relates to other LifeStacks data, that context is woven in
            automatically.
          </p>

          <div className="mb-4 flex flex-wrap gap-2">
            {MATERIAL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMaterialType(t)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  materialType === t
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {MATERIAL_ICONS[t]}
                {MATERIAL_LABELS[t]}
              </button>
            ))}
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to write — topic, audience, key points..."
            rows={4}
            className="mb-4 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!hasProfile || !prompt.trim() || generating}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate
          </button>

          {generatedContent && (
            <div className="mt-6 rounded-lg border border-violet-200 bg-violet-50/50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  {generatedContent.title || MATERIAL_LABELS[materialType]}
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      generatedContent.title
                        ? `${generatedContent.title}\n\n${generatedContent.content}`
                        : generatedContent.content
                    )
                  }
                  className="inline-flex items-center gap-1 text-sm text-violet-700 hover:text-violet-900"
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="whitespace-pre-wrap text-sm text-gray-800">{generatedContent.content}</div>
              {generatedContent.voice_match_score != null && (
                <p className="mt-2 text-xs text-gray-500">
                  Voice match: {Math.round(generatedContent.voice_match_score * 100)}%
                </p>
              )}
            </div>
          )}
        </section>

        {/* Recent drafts */}
        {drafts.length > 0 && (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Drafts</h2>
            <ul className="space-y-3">
              {drafts.map((d) => (
                <li
                  key={d.id}
                  className="cursor-pointer rounded-lg border border-gray-100 p-4 hover:border-violet-200"
                  onClick={() => setGeneratedContent(d)}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">
                      {d.title || MATERIAL_LABELS[d.material_type as VoiceMaterialType]}
                    </span>
                    <span className="text-gray-400">
                      {new Date(d.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{d.content}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
