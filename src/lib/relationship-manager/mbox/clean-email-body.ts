function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/** Remove common quoted-reply prefixes and trailing signature blocks (best-effort). */
export function cleanEmailBody(raw: string, opts?: { maxLen?: number }): string {
  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = text.split('\n')
  const kept: string[] = []
  let quotedDepth = 0
  for (const line of lines) {
    const t = line.trimEnd()
    if (/^>+\s?/.test(t)) {
      quotedDepth += 1
      if (quotedDepth > 40) break
      continue
    }
    quotedDepth = 0
    if (/^On .+ wrote:$/i.test(t)) continue
    if (/^-{2,}\s*Original Message\s*-{2,}/i.test(t)) break
    kept.push(line)
  }
  text = kept.join('\n')
  const sigIdx = text.search(/\n-- \n/)
  if (sigIdx !== -1) {
    text = text.slice(0, sigIdx)
  }
  text = text.replace(/\n{3,}/g, '\n\n').trim()
  const maxLen = opts?.maxLen ?? 500_000
  if (text.length > maxLen) text = text.slice(0, maxLen)
  return text
}

export function pickPlainBody(text?: string | null, html?: string | null): string {
  const t = (text || '').trim()
  if (t.length > 0) return t
  if (html && html.trim().length > 0) return stripHtmlToText(html)
  return ''
}
