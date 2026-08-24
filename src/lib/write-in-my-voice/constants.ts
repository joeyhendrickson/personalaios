/** Canonical module identifier — matches route, Pinecone metadata, and chunk prefixes */
export const WRITE_IN_MY_VOICE_MODULE_ID = 'write-in-my-voice'

export const VOICE_CORPUS_PREFIX = `${WRITE_IN_MY_VOICE_MODULE_ID}:corpus`

export const SOURCE_TYPES = ['facebook', 'blog', 'email', 'other'] as const
export type VoiceSampleSourceType = (typeof SOURCE_TYPES)[number]

export const MATERIAL_TYPES = ['blog_post', 'social_media_post', 'email', 'book'] as const
export type VoiceMaterialType = (typeof MATERIAL_TYPES)[number]

export const MATERIAL_LABELS: Record<VoiceMaterialType, string> = {
  blog_post: 'Blog Post',
  social_media_post: 'Social Media Post',
  email: 'Email',
  book: 'Book',
}

export const SOURCE_LABELS: Record<VoiceSampleSourceType, string> = {
  facebook: 'Facebook Posts',
  blog: 'Blog Posts',
  email: 'Emails',
  other: 'Other Writing',
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB per file
export const MAX_SAMPLES_PER_USER = 50
export const MIN_WORDS_FOR_ANALYSIS = 200
export const VOICE_CHUNK_SIZE = 1200

export function sampleChunkId(sampleId: string, chunkIndex: number): string {
  return `${VOICE_CORPUS_PREFIX}:sample:${sampleId}:chunk:${chunkIndex}`
}

export function profileSummaryChunkId(): string {
  return `${VOICE_CORPUS_PREFIX}:profile:summary`
}
