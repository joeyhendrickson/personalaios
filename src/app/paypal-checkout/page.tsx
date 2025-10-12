import { Suspense } from 'react'
import PayPalCheckout from './PayPalCheckout'

export const dynamic = 'force-dynamic' // avoid static prerender for auth pages

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PayPalCheckout />
    </Suspense>
  )
}
