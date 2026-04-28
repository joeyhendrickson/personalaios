import type { SupabaseClient } from '@supabase/supabase-js'
import { RELATIONSHIP_MANAGER_BUCKET } from '@/lib/relationship-manager/storage'
import { splitMboxIntoRawMessages } from './split-mbox'
import { parseMboxChunk, type ParsedMailboxMessage } from './parse-mbox-chunk'
import { cleanEmailBody, pickPlainBody } from './clean-email-body'
import { groupMessagesIntoThreads } from './thread-group'
import { embedTextForMailbox, hashContent, vectorToPgString } from './mbox-embeddings'
import { buildMailboxImportStructuredInsight, insertMailboxImportInsight } from './mbox-insights'

function normEmail(e: string | null | undefined): string | null {
  if (!e) return null
  const x = e.trim().toLowerCase()
  return x || null
}

function collectParticipantEmails(m: ParsedMailboxMessage): Set<string> {
  const s = new Set<string>()
  for (const x of m.fromList) if (x.email) s.add(x.email)
  for (const x of m.toList) if (x.email) s.add(x.email)
  for (const x of m.ccList) if (x.email) s.add(x.email)
  return s
}

function messageTouchesContact(m: ParsedMailboxMessage, contactEmails: Set<string>): boolean {
  const parts = collectParticipantEmails(m)
  for (const e of parts) {
    if (contactEmails.has(e)) return true
  }
  return false
}

export async function processMboxImportJob(
  supabase: SupabaseClient,
  params: { jobId: string; userId: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { jobId, userId } = params

  const { data: job, error: jobErr } = await supabase
    .from('relationship_import_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (jobErr || !job) {
    return { ok: false, error: 'Job not found' }
  }

  if (job.status !== 'pending') {
    return { ok: false, error: 'Job is not pending' }
  }

  const filePath = job.file_path as string | null
  if (!filePath) {
    await supabase
      .from('relationship_import_jobs')
      .update({
        status: 'failed',
        error: 'Missing file path',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
    return { ok: false, error: 'Missing file path' }
  }

  const contactId = job.contact_id as string | null
  if (!contactId) {
    await supabase
      .from('relationship_import_jobs')
      .update({
        status: 'failed',
        error: 'Missing contact',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
    return { ok: false, error: 'Missing contact' }
  }

  const meta = (job.metadata || {}) as {
    relationshipId?: string
    userAccountEmails?: string[]
    contactEmailOverride?: string | null
  }

  const userEmails = new Set<string>()
  for (const e of meta.userAccountEmails || []) {
    const n = normEmail(e)
    if (n) userEmails.add(n)
  }

  const { data: contactRow } = await supabase
    .from('relationship_contacts')
    .select('primary_email, aliases')
    .eq('id', contactId)
    .eq('user_id', userId)
    .single()

  const contactEmails = new Set<string>()
  const pe = normEmail(contactRow?.primary_email as string | null)
  if (pe) contactEmails.add(pe)
  for (const a of (contactRow?.aliases as string[] | null) || []) {
    const n = normEmail(a)
    if (n) contactEmails.add(n)
  }
  const override = normEmail(meta.contactEmailOverride ?? undefined)
  if (override) contactEmails.add(override)

  if (contactEmails.size === 0) {
    await supabase
      .from('relationship_import_jobs')
      .update({
        status: 'failed',
        error:
          'Contact has no email or aliases to match; add an email on the contact or pass contactEmail when uploading.',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
    return { ok: false, error: 'No contact email configured' }
  }

  await supabase
    .from('relationship_import_jobs')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
      error: null,
    })
    .eq('id', jobId)

  try {
    const dl = await supabase.storage.from(RELATIONSHIP_MANAGER_BUCKET).download(filePath)
    if (dl.error || !dl.data) {
      throw new Error('Failed to download mbox file')
    }

    const buf = Buffer.from(await dl.data.arrayBuffer())
    const rawText = buf.toString('utf8')

    const rawChunks = splitMboxIntoRawMessages(rawText)
    const totalParsed = rawChunks.length
    let skippedMalformed = 0
    const parsed: ParsedMailboxMessage[] = []

    for (const chunk of rawChunks) {
      const p = await parseMboxChunk(chunk)
      if (!p) {
        skippedMalformed += 1
        continue
      }
      parsed.push(p)
    }

    const filtered = parsed.filter((m) => messageTouchesContact(m, contactEmails))

    const { data: existingRows } = await supabase
      .from('relationship_messages')
      .select('external_message_id, body_hash')
      .eq('user_id', userId)
      .eq('contact_id', contactId)

    const existingMids = new Set(
      (existingRows || [])
        .map((r) => r.external_message_id as string | null)
        .filter((x): x is string => !!x)
    )
    const existingBodyHashes = new Set(
      (existingRows || [])
        .filter((r) => !r.external_message_id)
        .map((r) => r.body_hash as string | null)
        .filter((x): x is string => !!x)
    )

    const threadBuckets = groupMessagesIntoThreads(filtered)

    let imported = 0
    let duplicates = 0
    let incoming = 0
    let outgoing = 0
    let dateStart: Date | null = null
    let dateEnd: Date | null = null

    const seenInImport = new Set<string>()
    const importedForInsight: ParsedMailboxMessage[] = []

    for (const [threadKey, msgs] of threadBuckets) {
      const sorted = [...msgs].sort((a, b) => {
        const ta = a.date?.getTime() || 0
        const tb = b.date?.getTime() || 0
        return ta - tb
      })

      const first = sorted[0]
      const last = sorted[sorted.length - 1]
      const subj = first?.subject || sorted.find((m) => m.subject)?.subject || null

      const { data: threadRow, error: threadErr } = await supabase
        .from('relationship_threads')
        .insert({
          user_id: userId,
          contact_id: contactId,
          source_type: 'email',
          external_thread_key: threadKey.slice(0, 4000),
          subject: subj,
          first_message_at: first?.date?.toISOString() || null,
          last_message_at: last?.date?.toISOString() || null,
          message_count: 0,
          metadata: {},
        })
        .select('id')
        .single()

      if (threadErr || !threadRow) continue

      const threadId = threadRow.id as string
      let insertedInThread = 0

      for (const m of sorted) {
        const plain = pickPlainBody(m.textBody, m.htmlBody)
        const cleaned = cleanEmailBody(plain)
        const fromEmail = m.fromList[0]?.email ? normEmail(m.fromList[0].email) : null
        const fromName = m.fromList[0]?.name || null
        const toEmails = m.toList.map((x) => x.email)
        const ccEmails = m.ccList.map((x) => x.email)

        const mid = m.messageId || null
        const bodyHash = hashContent(cleaned.slice(0, 12_000))

        if (mid && (existingMids.has(mid) || seenInImport.has(`mid:${mid}`))) {
          duplicates += 1
          continue
        }
        if (!mid && (existingBodyHashes.has(bodyHash) || seenInImport.has(`bh:${bodyHash}`))) {
          duplicates += 1
          continue
        }
        if (mid) seenInImport.add(`mid:${mid}`)
        else seenInImport.add(`bh:${bodyHash}`)

        let direction: string | null = 'unknown'
        if (fromEmail && userEmails.has(fromEmail)) direction = 'outgoing'
        else if (fromEmail && contactEmails.has(fromEmail)) direction = 'incoming'
        else {
          const toHasContact = toEmails.some((e) => contactEmails.has(normEmail(e) || ''))
          const fromIsUser = fromEmail && userEmails.has(fromEmail)
          if (fromIsUser) direction = 'outgoing'
          else if (toHasContact) direction = 'incoming'
        }

        if (direction === 'incoming') incoming += 1
        if (direction === 'outgoing') outgoing += 1

        const ts = m.date
        if (ts) {
          if (!dateStart || ts < dateStart) dateStart = ts
          if (!dateEnd || ts > dateEnd) dateEnd = ts
        }

        const { data: msgRow, error: msgErr } = await supabase
          .from('relationship_messages')
          .insert({
            user_id: userId,
            contact_id: contactId,
            thread_id: threadId,
            import_job_id: jobId,
            source_type: 'email',
            external_message_id: mid,
            timestamp: ts?.toISOString() || null,
            direction,
            from_email: fromEmail,
            from_name: fromName,
            to_emails: toEmails,
            cc_emails: ccEmails,
            subject: m.subject,
            cleaned_body: cleaned || null,
            raw_body: m.rawBody?.slice(0, 500_000) || null,
            body_hash: bodyHash,
            has_attachments: (m.attachmentMeta?.length || 0) > 0,
            attachment_metadata: m.attachmentMeta || [],
            metadata: {
              in_reply_to: m.inReplyTo,
              references: m.references,
            },
          })
          .select('id')
          .single()

        if (msgErr || !msgRow) {
          skippedMalformed += 1
          continue
        }

        if (mid) existingMids.add(mid)
        existingBodyHashes.add(bodyHash)
        imported += 1
        insertedInThread += 1
        importedForInsight.push(m)

        const msgId = msgRow.id as string
        const contentHash = hashContent(cleaned.slice(0, 12_000))
        const vec = cleaned.length > 0 ? await embedTextForMailbox(cleaned) : null
        const embeddingModel = 'text-embedding-3-small'

        await supabase.from('relationship_message_embeddings').insert({
          user_id: userId,
          contact_id: contactId,
          message_id: msgId,
          embedding_model: embeddingModel,
          content_hash: contentHash,
          embedding: vec ? (vectorToPgString(vec) as unknown as string) : null,
          token_count: Math.ceil(Math.min(cleaned.length, 8000) / 4),
        })
      }

      await supabase
        .from('relationship_threads')
        .update({
          message_count: insertedInThread,
          first_message_at: first?.date?.toISOString() || null,
          last_message_at: last?.date?.toISOString() || null,
        })
        .eq('id', threadId)
    }

    const insight = buildMailboxImportStructuredInsight({
      imported,
      threads: threadBuckets.size,
      incoming,
      outgoing,
      duplicates,
      skipped: skippedMalformed,
      dateStart: dateStart?.toISOString() || null,
      dateEnd: dateEnd?.toISOString() || null,
      messages: importedForInsight,
    })

    await insertMailboxImportInsight(supabase, userId, contactId, jobId, insight)

    await supabase
      .from('relationship_import_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_messages: totalParsed,
        imported_messages: imported,
        skipped_messages: skippedMalformed,
        duplicate_messages: duplicates,
        total_threads: threadBuckets.size,
        incoming_count: incoming,
        outgoing_count: outgoing,
        date_range_start: dateStart?.toISOString() || null,
        date_range_end: dateEnd?.toISOString() || null,
        error: null,
      })
      .eq('id', jobId)

    console.log('[mbox-import]', {
      jobId,
      status: 'completed',
      totalParsed,
      imported,
      threads: threadBuckets.size,
      skippedMalformed,
      duplicates,
    })

    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Import failed'
    await supabase
      .from('relationship_import_jobs')
      .update({
        status: 'failed',
        error: msg,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
    console.log('[mbox-import]', { jobId, status: 'failed', error: msg })
    return { ok: false, error: msg }
  }
}
