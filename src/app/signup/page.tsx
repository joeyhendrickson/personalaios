import { Suspense } from 'react'
import Signup from './Signup'

export const dynamic = 'force-dynamic' // avoid static prerender for auth pages

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Signup />
    </Suspense>
  )
}
