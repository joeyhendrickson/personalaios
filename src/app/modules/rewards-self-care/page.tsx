'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Gift } from 'lucide-react'
import RewardsSection from '@/components/rewards/rewards-section'

const MODULE_ID = 'rewards-self-care'

export default function RewardsSelfCareModulePage() {
  useEffect(() => {
    void fetch('/api/modules/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId: MODULE_ID }),
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50">
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Link href="/modules">
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors h-9 rounded-md px-3 hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4" />
                Life Hacks
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-black flex items-center gap-3">
                <Gift className="h-8 w-8 text-amber-600" />
                Rewards & Self-Care
              </h1>
              <p className="text-sm text-gray-600">
                Exchange points for rewards, partner offers, and personal milestones
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <RewardsSection />
      </div>
    </div>
  )
}
