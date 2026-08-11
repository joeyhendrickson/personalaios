/** Canonical public site URL for metadata and absolute asset links. */
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://lifestacks.ai'
  )
}

export const siteMetadata = {
  name: 'Life Stacks',
  title: 'Life Stacks — Stack your life, powered by AI',
  description:
    'Your goals, habits, and Life Hacks — stacked. AI-powered productivity, coaching, and personal growth.',
  tagline: 'Stack your life, powered by AI.',
} as const
