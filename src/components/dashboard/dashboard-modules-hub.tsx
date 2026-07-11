'use client'

import Link from 'next/link'
import { Activity, Brain, Heart, Sparkles, Target, Users, ChevronRight } from 'lucide-react'
import {
  LifeStacksCard,
  LifeStacksCardBody,
  LifeStacksCardHeader,
} from '@/components/ui/life-stacks-card'

const FEATURED_MODULES = [
  {
    href: '/modules/dream-catcher',
    title: 'Dream Catcher',
    description: 'Refresh your Life Plan and vision.',
    icon: Sparkles,
  },
  {
    href: '/modules/fitness-tracker',
    title: 'Fitness Tracker',
    description: 'Workouts, nutrition, and biometrics.',
    icon: Activity,
  },
  {
    href: '/modules/gratitude-journal',
    title: 'Gratitude Journal',
    description: 'Daily gratitude and reflection.',
    icon: Heart,
  },
  {
    href: '/modules/relationship-manager',
    title: 'Relationship Manager',
    description: 'Stay connected with people who matter.',
    icon: Users,
  },
  {
    href: '/modules/focus-enhancer',
    title: 'Focus Enhancer',
    description: 'Ruminations, blocks, and coping strategies.',
    icon: Target,
  },
  {
    href: '/modules/ai-coach',
    title: 'Life Coach',
    description: 'Goal setting and motivation.',
    icon: Brain,
  },
] as const

export function DashboardModulesHub() {
  return (
    <LifeStacksCard variant="glass" className="mb-8">
      <LifeStacksCardHeader>
        <h2 className="text-xl font-semibold text-foreground">Life modules</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Specialized tools that extend your dashboard — fitness, gratitude, relationships, focus,
          and more.
        </p>
      </LifeStacksCardHeader>
      <LifeStacksCardBody className="pt-0">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_MODULES.map(({ href, title, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-3 rounded-lg border border-border bg-background/60 p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
            >
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-foreground group-hover:text-primary">
                    {title}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4">
          <Link
            href="/modules"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Browse all modules
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </LifeStacksCardBody>
    </LifeStacksCard>
  )
}
