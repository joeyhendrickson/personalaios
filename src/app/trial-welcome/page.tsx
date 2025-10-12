import { Suspense } from 'react'
import TrialWelcome from './TrialWelcome'

export const dynamic = 'force-dynamic' // avoid static prerender for auth pages

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TrialWelcome />
    </Suspense>
  )
}
