import { simpleParser } from 'mailparser'

function addressesFromField(field: unknown): { email: string; name: string }[] {
  if (!field || typeof field !== 'object') return []
  const obj = field as { value?: { address?: string; name?: string }[] }
  const vals = obj.value || []
  const out: { email: string; name: string }[] = []
  for (const v of vals) {
    const email = (v.address || '').trim().toLowerCase()
    if (email) out.push({ email, name: (v.name || '').trim() })
  }
  return out
}

function normalizeMessageIdList(refs: unknown): string[] {
  if (Array.isArray(refs)) {
    return refs.map((r) => String(r).trim().replace(/^<|>$/g, '')).filter(Boolean)
  }
  if (typeof refs === 'string') {
    return refs
      .split(/\s+/)
      .map((s) => s.trim().replace(/^<|>$/g, ''))
      .filter(Boolean)
  }
  return []
}

export type ParsedMailboxMessage = {
  messageId: string | null
  inReplyTo: string | null
  references: string[]
  date: Date | null
  subject: string | null
  fromList: { email: string; name: string }[]
  toList: { email: string; name: string }[]
  ccList: { email: string; name: string }[]
  textBody: string
  htmlBody: string | null
  rawBody: string
  attachmentMeta: { filename?: string; contentType?: string; size?: number }[]
}

export async function parseMboxChunk(raw: string): Promise<ParsedMailboxMessage | null> {
  try {
    const parsed = await simpleParser(raw)
    const p = parsed as {
      messageId?: string
      inReplyTo?: string | false
      references?: unknown
      date?: Date
      subject?: string
      from?: unknown
      to?: unknown
      cc?: unknown
      text?: string
      html?: string | false
      attachments?: { filename?: string; contentType?: string; size?: number }[]
    }

    const refList = normalizeMessageIdList(p.references)

    const inReplyRaw = p.inReplyTo
    const inReplyTo =
      typeof inReplyRaw === 'string' && inReplyRaw.trim()
        ? inReplyRaw.trim().replace(/^<|>$/g, '')
        : null

    const messageId = p.messageId ? String(p.messageId).trim().replace(/^<|>$/g, '') : null

    const fromList = addressesFromField(p.from)
    const toList = addressesFromField(p.to)
    const ccList = addressesFromField(p.cc)

    const textBody = (p.text || '').trim()
    const htmlBody = p.html && typeof p.html === 'string' ? p.html : null
    const rawBody = textBody || htmlBody || ''

    const attachmentMeta =
      p.attachments?.map((a) => ({
        filename: a.filename || undefined,
        contentType: a.contentType || undefined,
        size: typeof a.size === 'number' ? a.size : undefined,
      })) || []

    return {
      messageId,
      inReplyTo,
      references: refList,
      date: p.date ? new Date(p.date) : null,
      subject: p.subject ? p.subject.trim() : null,
      fromList,
      toList,
      ccList,
      textBody,
      htmlBody,
      rawBody,
      attachmentMeta,
    }
  } catch {
    return null
  }
}
