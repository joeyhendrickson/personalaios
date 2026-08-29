import { LifestacksHomePreview } from '@/components/preview/lifestacks-home-preview'

export const metadata = {
  title: 'Home Preview | LifeStacks',
  description: 'Design preview — new LifeStacks home dashboard (not production).',
  robots: { index: false, follow: false },
}

export default function PreviewHomePage() {
  return <LifestacksHomePreview />
}
