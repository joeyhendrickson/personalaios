'use client'

import { CalendarDays, LayoutGrid, ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HomeTab } from '@/lib/dashboard/dashboard-layout'

const TABS: { id: HomeTab; label: string; icon: typeof ListTodo }[] = [
  { id: 'today', label: 'Today', icon: ListTodo },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'modules', label: 'Modules', icon: LayoutGrid },
]

type DashboardHomeTabBarProps = {
  activeTab: HomeTab
  onTabChange: (tab: HomeTab) => void
}

export function DashboardHomeTabBar({ activeTab, onTabChange }: DashboardHomeTabBarProps) {
  return (
    <nav
      className="mb-8 flex flex-wrap gap-2 rounded-lg border border-border bg-card/80 p-1.5 backdrop-blur-sm"
      aria-label="Dashboard home"
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              'inline-flex flex-1 min-w-[7rem] items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
