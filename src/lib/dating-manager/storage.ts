export const DATING_MANAGER_BUCKET = 'dating-manager'

function safeFileSegment(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
}

export function buildDatingStoragePath(
  userId: string,
  prospectId: string,
  folder: 'prospect-photos' | 'couple-photos',
  fileName: string
): string {
  const stamp = Date.now()
  return `${userId}/${prospectId}/${folder}/${stamp}-${safeFileSegment(fileName)}`
}
