export interface TextChunk {
  text: string
  index: number
  tokens: number
  metadata: {
    document_name: string
    document_type: string
    chunk_start: number
    chunk_end: number
  }
}

export class TextChunker {
  private maxTokens: number
  private overlapTokens: number

  constructor(maxTokens: number = 800, overlapTokens: number = 120) {
    this.maxTokens = maxTokens
    this.overlapTokens = overlapTokens
  }

  chunkText(text: string, documentName: string, documentType: string = 'text'): TextChunk[] {
    // Clean and normalize text
    const cleanText = this.cleanText(text)

    // Split into sentences for better chunking
    const sentences = this.splitIntoSentences(cleanText)

    const chunks: TextChunk[] = []
    let currentChunk = ''
    let currentTokens = 0
    let chunkIndex = 0
    let chunkStart = 0

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]
      const sentenceTokens = this.estimateTokens(sentence)

      // If adding this sentence would exceed max tokens, create a chunk
      if (currentTokens + sentenceTokens > this.maxTokens && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex,
          tokens: currentTokens,
          metadata: {
            document_name: documentName,
            document_type: documentType,
            chunk_start: chunkStart,
            chunk_end: chunkStart + currentChunk.length,
          },
        })

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk)
        currentChunk = overlapText + sentence
        currentTokens = this.estimateTokens(overlapText) + sentenceTokens
        chunkStart += currentChunk.length - overlapText.length - sentence.length
        chunkIndex++
      } else {
        currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence
        currentTokens += sentenceTokens
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex,
        tokens: currentTokens,
        metadata: {
          document_name: documentName,
          document_type: documentType,
          chunk_start: chunkStart,
          chunk_end: chunkStart + currentChunk.length,
        },
      })
    }

    return chunks
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - could be improved with NLP libraries
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s + '.') // Add period back

    return sentences
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    // This is approximate and could be improved with actual tokenization
    return Math.ceil(text.length / 4)
  }

  private getOverlapText(chunk: string): string {
    if (chunk.length === 0) return ''

    // Get the last portion of the chunk for overlap
    const words = chunk.split(' ')
    const overlapWords = words.slice(-Math.floor(this.overlapTokens * 0.75)) // Rough word count

    return overlapWords.join(' ') + ' '
  }
}

export function extractTextFromHTML(html: string): string {
  // Simple HTML tag removal
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractTextFromMarkdown(markdown: string): string {
  // Simple markdown to text conversion
  return markdown
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Convert images to alt text
    .replace(/^#{1,6}\s+/gm, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/~~([^~]+)~~/g, '$1') // Remove strikethrough
    .replace(/^[-*+]\s+/gm, '') // Remove list markers
    .replace(/^\d+\.\s+/gm, '') // Remove numbered list markers
    .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
    .trim()
}

export function chunkDocument(
  content: string,
  documentName: string,
  mimeType: string,
  maxTokens: number = 800,
  overlapTokens: number = 120
): TextChunk[] {
  let text = content

  // Extract text based on document type
  if (mimeType.includes('html')) {
    text = extractTextFromHTML(content)
  } else if (mimeType.includes('markdown')) {
    text = extractTextFromMarkdown(content)
  }

  const chunker = new TextChunker(maxTokens, overlapTokens)
  return chunker.chunkText(text, documentName, mimeType)
}
