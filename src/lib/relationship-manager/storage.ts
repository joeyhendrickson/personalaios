export const RELATIONSHIP_MANAGER_BUCKET = 'relationship-manager'

export function safeFileSegment(name: string): string {
  const base = name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120)
  return base || 'file'
}

export function buildStoragePath(
  userId: string,
  relationshipId: string,
  folder: 'photos' | 'documents' | 'message-screenshots' | 'mbox-imports',
  fileName: string
): string {
  const stamp = Date.now()
  return `${userId}/${relationshipId}/${folder}/${stamp}-${safeFileSegment(fileName)}`
}

/** Path for uploaded .mbox tied to an import job (relationshipId segment keeps bucket layout consistent). */
export function buildMboxImportStoragePath(
  userId: string,
  relationshipId: string,
  jobId: string,
  originalFileName: string
): string {
  return `${userId}/${relationshipId}/mbox-imports/${jobId}-${safeFileSegment(originalFileName)}`
}
