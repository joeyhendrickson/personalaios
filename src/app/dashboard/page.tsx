import { Suspense } from 'react'
import Dashboard from './Dashboard'

export const dynamic = 'force-dynamic' // avoid static prerender for auth pages

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  )
}
