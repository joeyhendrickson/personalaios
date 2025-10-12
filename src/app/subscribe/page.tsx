import { Suspense } from 'react'
import Subscribe from './Subscribe'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Subscribe />
    </Suspense>
  )
}
