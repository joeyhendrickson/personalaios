/**
 * Split Unix mbox content on "From " separator lines (Apple Mail / Thunderbird / Gmail export).
 * First line may be "From ..."; subsequent messages start with \nFrom .
 */
export function splitMboxIntoRawMessages(mboxContent: string): string[] {
  const normalized = mboxContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  const chunks: string[][] = []
  let current: string[] = []

  const isSeparator = (line: string) => {
    if (!line.startsWith('From ')) return false
    // Heuristic: mbox separator has space after From and often contains @ or date
    return line.length > 5 && (line.includes('@') || /\d{4}/.test(line))
  }

  for (const line of lines) {
    if (isSeparator(line) && current.length > 0) {
      chunks.push(current)
      current = [line]
    } else {
      current.push(line)
    }
  }
  if (current.length) chunks.push(current)

  return chunks.map((c) => c.join('\n')).filter((c) => c.trim().length > 0)
}
