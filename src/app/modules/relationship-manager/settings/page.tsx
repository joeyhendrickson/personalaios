'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plug } from 'lucide-react'

export default function RelationshipManagerSettingsPage() {
  const [twilio, setTwilio] = useState<{ configured?: boolean; errors?: string[] } | null>(null)

  useEffect(() => {
    fetch('/api/relationship-manager/integrations/twilio/validate')
      .then((r) => r.json())
      .then(setTwilio)
      .catch(() => setTwilio({ configured: false, errors: ['Request failed'] }))
  }, [])

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link
        href="/modules/relationship-manager"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Relationship Manager
      </Link>
      <h1 className="mb-2 text-2xl font-semibold">Integrations</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Server-side credentials are never shown here. This page only confirms connectivity patterns.
      </p>
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 font-medium">
          <Plug className="h-4 w-4" />
          Twilio SMS
        </div>
        {twilio == null && <p className="text-sm text-muted-foreground">Checking…</p>}
        {twilio?.configured === true && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Credentials detected (validate route OK).
          </p>
        )}
        {twilio?.configured === false && (
          <ul className="list-inside list-disc text-sm text-amber-700 dark:text-amber-400">
            {(twilio.errors ?? ['Not configured']).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
