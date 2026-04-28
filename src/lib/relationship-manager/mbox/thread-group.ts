import type { ParsedMailboxMessage } from './parse-mbox-chunk'

export function normalizeSubject(subject: string | null): string {
  if (!subject) return '(no subject)'
  let s = subject.trim().toLowerCase()
  while (/^(re|fw|fwd)\s*:\s*/i.test(s)) {
    s = s.replace(/^(re|fw|fwd)\s*:\s*/i, '').trim()
  }
  return s || '(no subject)'
}

/** Pick a stable thread key from Message-ID / In-Reply-To / References / subject. */
export function computeThreadExternalKey(
  msg: ParsedMailboxMessage,
  byMessageId: Map<string, ParsedMailboxMessage>
): string {
  let node = msg
  let guard = 0
  while (node.inReplyTo && byMessageId.has(node.inReplyTo) && guard < 200) {
    node = byMessageId.get(node.inReplyTo)!
    guard += 1
  }
  if (node.messageId) return node.messageId
  if (msg.references.length > 0) return msg.references[0]
  if (msg.messageId) return msg.messageId
  const t = msg.date ? msg.date.toISOString().slice(0, 7) : 'unknown-month'
  return `subject:${normalizeSubject(msg.subject)}:${t}`
}

export function groupMessagesIntoThreads(
  messages: ParsedMailboxMessage[]
): Map<string, ParsedMailboxMessage[]> {
  const byMessageId = new Map<string, ParsedMailboxMessage>()
  for (const m of messages) {
    if (m.messageId) byMessageId.set(m.messageId, m)
  }
  const buckets = new Map<string, ParsedMailboxMessage[]>()
  for (const m of messages) {
    const key = computeThreadExternalKey(m, byMessageId)
    const arr = buckets.get(key) || []
    arr.push(m)
    buckets.set(key, arr)
  }
  return buckets
}
