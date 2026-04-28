import 'server-only'

/**
 * Google People API — read structured contacts after user OAuth.
 * Does NOT provide Photos face→name graph. Use for import + enrichment only.
 *
 * Setup: Google Cloud OAuth client, scopes e.g.
 * - https://www.googleapis.com/auth/contacts.readonly
 * - https://www.googleapis.com/auth/userinfo.email (optional)
 *
 * Tokens: store in relationship_external_accounts (encrypt at rest with TOKEN_ENCRYPTION_KEY).
 */
export const GOOGLE_PEOPLE_SCOPES = ['https://www.googleapis.com/auth/contacts.readonly'] as const

export interface GooglePersonConnection {
  resourceName?: string
  names?: { displayName?: string; givenName?: string; familyName?: string }[]
  emailAddresses?: { value?: string }[]
  phoneNumbers?: { value?: string }[]
  organizations?: { name?: string; title?: string }[]
}

export async function fetchPeopleConnections(
  accessToken: string,
  pageSize = 500
): Promise<GooglePersonConnection[]> {
  const url = new URL('https://people.googleapis.com/v1/people/me/connections')
  url.searchParams.set('pageSize', String(pageSize))
  url.searchParams.set('personFields', 'names,emailAddresses,phoneNumbers,organizations')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`People API ${res.status}: ${text.slice(0, 500)}`)
  }
  const data = (await res.json()) as { connections?: GooglePersonConnection[] }
  return data.connections ?? []
}
