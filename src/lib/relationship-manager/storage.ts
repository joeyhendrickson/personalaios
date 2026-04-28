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
  folder: 'photos' | 'documents' | 'message-screenshots',
  fileName: string
): string {
  const stamp = Date.now()
  return `${userId}/${relationshipId}/${folder}/${stamp}-${safeFileSegment(fileName)}`
}
