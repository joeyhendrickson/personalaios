import type { VoiceSampleSourceType } from './constants'

const ACCEPTED_EXTENSIONS = new Set(['.txt', '.md', '.json', '.csv', '.html', '.htm'])

export function inferSourceType(fileName: string, override?: string): VoiceSampleSourceType {
  if (override === 'facebook' || override === 'blog' || override === 'email' || override === 'other') {
    return override
  }
  const lower = fileName.toLowerCase()
  if (lower.includes('facebook') || lower.includes('fb_')) return 'facebook'
  if (lower.includes('blog')) return 'blog'
  if (lower.includes('mail') || lower.includes('email') || lower.includes('mbox')) return 'email'
  return 'other'
}

export function isAcceptedFileName(fileName: string): boolean {
  const dot = fileName.lastIndexOf('.')
  if (dot < 0) return false
  return ACCEPTED_EXTENSIONS.has(fileName.slice(dot).toLowerCase())
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseJsonContent(raw: string): string {
  try {
    const data = JSON.parse(raw) as unknown
    if (typeof data === 'string') return data
    if (Array.isArray(data)) {
      return data
        .map((item) => {
          if (typeof item === 'string') return item
          if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>
            const text =
              obj.text ?? obj.content ?? obj.message ?? obj.body ?? obj.post ?? obj.title
            return typeof text === 'string' ? text : JSON.stringify(item)
          }
          return String(item)
        })
        .join('\n\n')
    }
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>
      if (Array.isArray(obj.posts)) return parseJsonContent(JSON.stringify(obj.posts))
      if (Array.isArray(obj.messages)) return parseJsonContent(JSON.stringify(obj.messages))
    }
  } catch {
    // fall through to raw text
  }
  return raw
}

function parseCsvContent(raw: string): string {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length <= 1) return raw
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim())
    return cols.filter(Boolean).join(' — ')
  })
  return rows.join('\n\n')
}

export function parseUploadedSampleContent(fileName: string, raw: string): string {
  const lower = fileName.toLowerCase()
  let text = raw.replace(/^\uFEFF/, '').trim()

  if (lower.endsWith('.json')) {
    text = parseJsonContent(text)
  } else if (lower.endsWith('.csv')) {
    text = parseCsvContent(text)
  } else if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    text = stripHtml(text)
  } else {
    text = text.replace(/\r\n/g, '\n')
  }

  return text.replace(/\n{3,}/g, '\n\n').trim()
}
