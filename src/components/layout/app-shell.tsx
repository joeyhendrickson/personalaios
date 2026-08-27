'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  Bug,
  Calendar,
  CheckCircle,
  ChevronDown,
  FileSpreadsheet,
  Hexagon,
  Home,
  Layers,
  LogOut,
  Menu,
  Receipt,
  RefreshCw,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { useChatContext } from '@/components/chat/chat-context'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { WakeWordToggle } from '@/components/chat/wake-word-toggle'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import { LifeStacksMark } from '@/components/layout/lifestacks-mark'

export type AppShellActive =
  | 'home'
  | 'stacks'
  | 'calendar'
  | 'tasks'
  | 'advisors'
  | 'insights'
  | 'connections'
  | 'settings'

const NAV: Array<{
  id: AppShellActive
  href?: string
  icon: typeof Home
  labelKey: string
}> = [
  { id: 'home', href: '/dashboard', icon: Home, labelKey: 'nav.home' },
  { id: 'stacks', href: '/modules', icon: Layers, labelKey: 'nav.modules' },
  { id: 'calendar', href: '/modules/calendar-ai', icon: Calendar, labelKey: 'nav.calendar' },
  { id: 'tasks', href: '/dashboard#tasks', icon: CheckCircle, labelKey: 'nav.tasks' },
  { id: 'advisors', icon: Hexagon, labelKey: 'nav.advisors' },
  {
    id: 'insights',
    href: '/modules/analytics-dashboard',
    icon: BarChart3,
    labelKey: 'nav.insights',
  },
  {
    id: 'connections',
    href: '/modules/relationship-manager',
    icon: Users,
    labelKey: 'nav.connections',
  },
  { id: 'settings', href: '/profile', icon: Settings, labelKey: 'nav.settings' },
]

function greetingKey(greeting?: 'morning' | 'afternoon' | 'evening') {
  if (greeting === 'afternoon') return 'shell.goodAfternoon'
  if (greeting === 'evening') return 'shell.goodEvening'
  return 'shell.goodMorning'
}

export function AppShell({
  active,
  firstName,
  avatarUrl,
  greeting,
  children,
}: {
  active: AppShellActive
  firstName?: string
  avatarUrl?: string | null
  greeting?: 'morning' | 'afternoon' | 'evening'
  children: React.ReactNode
}) {
  const { t } = useLanguage()
  const { signOut, user } = useAuth()
  const { isAdmin } = useAdminAuth()
  const { wakeWordEnabled, setWakeWordEnabled, wakeWordSupported, openAdvisor } = useChatContext()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [refreshingAiContext, setRefreshingAiContext] = useState(false)

  const resolvedName =
    firstName ||
    (user?.user_metadata?.full_name as string | undefined)?.split(/\s+/)[0] ||
    (user?.email || '').split('@')[0] ||
    'there'
  const resolvedAvatar =
    avatarUrl ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const onNav = (item: (typeof NAV)[number]) => {
    if (item.id === 'advisors') {
      openAdvisor()
      setMobileOpen(false)
      return
    }
    if (item.id === 'tasks' && pathname === '/dashboard') {
      window.location.hash = 'tasks'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
      setMobileOpen(false)
      return
    }
    if (item.href) router.push(item.href)
  }

  const initials = resolvedName.slice(0, 1).toUpperCase()

  const sidebar = (
    <div className="flex h-full flex-col bg-[#1a1d23] text-white">
      <div className="px-5 pt-6 pb-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <LifeStacksMark className="app-shell-mark h-10 w-10 shrink-0" />
          <span className="text-lg font-semibold tracking-tight">LifeStacks</span>
        </Link>
      </div>

      <div className="px-5 pb-6">
        <div className="flex items-center gap-3">
          {resolvedAvatar ? (
            // User-uploaded / OAuth avatars are remote URLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolvedAvatar}
              alt=""
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white/10"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-700/80 text-lg font-semibold">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-white">
              {t(greetingKey(greeting), { name: resolvedName })}
            </p>
            <p className="truncate text-xs text-white/55">{t('shell.tagline')}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const Icon = item.icon
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNav(item)}
              className={cn(
                'flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-[#2f6f64] text-white shadow-sm'
                  : 'text-white/80 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon
                className={cn('h-[18px] w-[18px]', isActive ? 'text-emerald-200' : 'text-white/70')}
              />
              {t(item.labelKey)}
            </button>
          )
        })}
      </nav>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-lg px-4 py-2 text-xs uppercase tracking-wide text-white/45 hover:text-white/80"
        >
          More
          <ChevronDown className={cn('h-4 w-4 transition-transform', moreOpen && 'rotate-180')} />
        </button>
        {moreOpen && (
          <div className="mb-3 space-y-0.5 rounded-xl bg-white/5 p-1">
            <Link
              href="/import"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/5"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t('nav.import')}
            </Link>
            <Link
              href="/bug-report"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/5"
            >
              <Bug className="h-4 w-4" />
              Report Bug
            </Link>
            <Link
              href="/dashboard/ai-usage"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/5"
            >
              <Receipt className="h-4 w-4" />
              AI usage
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-emerald-200 hover:bg-white/5"
              >
                <Hexagon className="h-4 w-4" />
                Admin
              </Link>
            )}
            <button
              type="button"
              disabled={refreshingAiContext}
              onClick={async () => {
                setRefreshingAiContext(true)
                try {
                  await fetch('/api/ai/context-cache/refresh', { method: 'POST' })
                } finally {
                  setRefreshingAiContext(false)
                }
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', refreshingAiContext && 'animate-spin')} />
              {refreshingAiContext ? 'Updating...' : 'Update AI Context'}
            </button>
            <div className="px-3 py-2">
              <WakeWordToggle
                enabled={wakeWordEnabled}
                supported={wakeWordSupported}
                onChange={setWakeWordEnabled}
                compact
              />
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await signOut()
                } catch (error) {
                  console.error('Error signing out:', error)
                }
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
              {t('nav.signOut')}
            </button>
          </div>
        )}
        <p className="px-4 pb-6 pt-2 text-[13px] leading-snug text-emerald-400">
          “{t('shell.quote')}”
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] lg:block">{sidebar}</aside>

      <div className="sticky top-0 z-30 flex items-center justify-between bg-[#1a1d23] px-4 py-3 text-white lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <LifeStacksMark className="app-shell-mark h-8 w-8 shrink-0" />
          <span className="font-semibold">LifeStacks</span>
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-white hover:bg-white/10"
        >
          <Menu className="h-5 w-5 text-white" stroke="currentColor" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[280px] max-w-[85vw]">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-md p-1 text-white hover:bg-white/10"
            >
              <X className="h-5 w-5 text-white" stroke="currentColor" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="lg:pl-[260px]">{children}</main>
    </div>
  )
}
