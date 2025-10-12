import { Suspense } from 'react'
import Login from './Login'

export const dynamic = 'force-dynamic' // avoid static prerender for auth pages

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  )
}
