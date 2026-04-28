'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Inbox, Loader2, Upload } from 'lucide-react'

type JobRow = {
  id: string
  status: string
  original_file_name: string | null
  total_messages: number
  imported_messages: number
  skipped_messages: number
  duplicate_messages: number
  total_threads: number
  incoming_count: number
  outgoing_count: number
  date_range_start: string | null
  date_range_end: string | null
  error: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export function RelationshipMailboxImportPanel({
  relationshipId,
  relationshipName,
}: {
  relationshipId: string
  relationshipName: string
}) {
  const [contactEmail, setContactEmail] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [job, setJob] = useState<JobRow | null>(null)

  const pollJob = useCallback(async (jobId: string) => {
    for (let i = 0; i < 360; i += 1) {
      const r = await fetch(`/api/relationship-manager/import/jobs/${jobId}`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Failed to load job status')
      const row = j.job as JobRow
      setJob(row)
      if (row.status === 'completed' || row.status === 'failed') return row
      await new Promise((res) => setTimeout(res, 1500))
    }
    throw new Error(
      'Processing is taking longer than expected. Refresh this page and check status later.'
    )
  }, [])

  const run = async () => {
    setError(null)
    if (!file) {
      setError('Choose a .mbox file first.')
      return
    }
    setBusy(true)
    setPhase('idle')
    setJob(null)
    try {
      const fd = new FormData()
      fd.append('relationshipId', relationshipId)
      fd.append('file', file)
      if (contactEmail.trim()) fd.append('contactEmail', contactEmail.trim())

      const up = await fetch('/api/relationship-manager/import/mbox', {
        method: 'POST',
        body: fd,
      })
      const upJson = await up.json()
      if (!up.ok) throw new Error(upJson.error || 'Upload failed')

      const importJobId = upJson.importJobId as string
      setUploadComplete(true)

      const proc = await fetch('/api/relationship-manager/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: importJobId }),
      })
      const procJson = await proc.json()
      if (!proc.ok) throw new Error(procJson.error || 'Processing failed to start')

      await pollJob(importJobId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
      setUploadComplete(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <Link
        href={`/modules/relationship-manager/${relationshipId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {relationshipName}
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Inbox className="h-7 w-7" />
          Mailbox import
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add contact data from an Apple Mail, Gmail Takeout, or Thunderbird <code>.mbox</code>{' '}
          export. Messages are matched to this contact using their email addresses. Large files may
          take several minutes to process.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Add contact data → Upload mailbox export
        </h2>
        <p className="text-xs text-muted-foreground">
          Contact: <span className="font-medium text-foreground">{relationshipName}</span>
        </p>
        <div>
          <label className="text-xs text-muted-foreground">Contact email (optional override)</label>
          <input
            type="email"
            className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
            placeholder="name@example.com — used if not set on the relationship"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            disabled={busy}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">.mbox file</label>
          <input
            type="file"
            accept=".mbox,application/mbox"
            className="mt-1 block w-full text-sm"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {busy && uploadComplete && (
          <p className="text-sm text-muted-foreground">
            File stored. Parsing on the server — large exports can take several minutes. Status
            updates below when the import finishes.
          </p>
        )}
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? (uploadComplete ? 'Importing…' : 'Uploading…') : 'Upload mailbox export (.mbox)'}
        </button>
      </section>

      {job && (
        <section className="rounded-lg border border-border bg-muted/30 p-5 space-y-3">
          <h2 className="text-sm font-semibold">Import summary</h2>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium capitalize">{job.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Source file</dt>
              <dd className="truncate">{job.original_file_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Messages in file</dt>
              <dd>{job.total_messages}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Messages imported</dt>
              <dd>{job.imported_messages}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Threads</dt>
              <dd>{job.total_threads}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Incoming / outgoing</dt>
              <dd>
                {job.incoming_count} / {job.outgoing_count}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Duplicates skipped</dt>
              <dd>{job.duplicate_messages}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Malformed / skipped</dt>
              <dd>{job.skipped_messages}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Date range</dt>
              <dd>
                {job.date_range_start && job.date_range_end
                  ? `${job.date_range_start.slice(0, 10)} → ${job.date_range_end.slice(0, 10)}`
                  : '—'}
              </dd>
            </div>
          </dl>
          {job.error && (
            <p className="text-sm text-destructive">
              <span className="font-medium">Error: </span>
              {job.error}
            </p>
          )}
        </section>
      )}
    </div>
  )
}
