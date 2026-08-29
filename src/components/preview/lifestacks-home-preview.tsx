'use client'

import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import {
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Circle,
  Home,
  Layers,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'

const SIDEBAR_BG = '#1c2434'
const SIDEBAR_ACTIVE = '#2a3447'

function LifeStacksLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex flex-col gap-[3px]">
        <div className="h-[5px] w-7 rounded-sm bg-emerald-400" />
        <div className="h-[5px] w-7 rounded-sm bg-sky-400" />
        <div className="h-[5px] w-7 rounded-sm bg-violet-400" />
      </div>
      <div className="text-lg font-bold leading-none tracking-tight">
        <span className="text-white">Life</span>
        <span className="text-emerald-400">Stacks</span>
      </div>
    </div>
  )
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  href = '#',
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  active?: boolean
  href?: string
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? 'bg-[#2a3447] text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {label}
    </Link>
  )
}

function Sparkline({
  color = '#60a5fa',
  fill = 'rgba(96,165,250,0.15)',
}: {
  color?: string
  fill?: string
}) {
  return (
    <svg viewBox="0 0 200 48" className="h-12 w-full" preserveAspectRatio="none">
      <path
        d="M0,38 C20,34 35,28 55,30 C75,32 90,18 110,22 C130,26 145,12 165,16 C180,19 190,14 200,10 L200,48 L0,48 Z"
        fill={fill}
      />
      <path
        d="M0,38 C20,34 35,28 55,30 C75,32 90,18 110,22 C130,26 145,12 165,16 C180,19 190,14 200,10"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FinanceChart() {
  return (
    <svg viewBox="0 0 200 56" className="h-14 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="financeFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(16,185,129,0.35)" />
          <stop offset="100%" stopColor="rgba(16,185,129,0.02)" />
        </linearGradient>
      </defs>
      <path
        d="M0,48 L0,42 C25,40 40,36 60,32 C80,28 95,24 115,20 C135,16 155,12 175,8 C185,6 192,5 200,4 L200,56 L0,56 Z"
        fill="url(#financeFill)"
      />
      <path
        d="M0,42 C25,40 40,36 60,32 C80,28 95,24 115,20 C135,16 155,12 175,8 C185,6 192,5 200,4"
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FocusRing({ percent }: { percent: number }) {
  const r = 42
  const c = 2 * Math.PI * r
  const offset = c - (percent / 100) * c
  return (
    <div className="relative mx-auto h-28 w-28">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#10b981"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold text-slate-900">{percent}%</span>
        <span className="text-[11px] text-slate-500">Complete</span>
      </div>
    </div>
  )
}

function PreviewCard({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}>
      <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  )
}

export function LifestacksHomePreview() {
  const tasks = [
    { label: 'Morning Workout', time: '8:00 AM', done: true },
    { label: 'Team Call', time: '10:00 AM', done: true },
    { label: 'Financial Review', time: '12:00 PM', done: true },
    { label: 'Work on Business Stack', time: '2:00 PM', done: false },
  ]
  const tasksLeft = tasks.filter((t) => !t.done).length
  const progress = Math.round(((tasks.length - tasksLeft) / tasks.length) * 100)

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {/* Sidebar */}
      <aside
        className="flex w-[220px] shrink-0 flex-col px-4 py-6 lg:w-[240px]"
        style={{ backgroundColor: SIDEBAR_BG }}
      >
        <LifeStacksLogo />

        <div className="mt-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-600 text-sm font-semibold text-white">
            A
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Good morning, Alex</p>
            <p className="text-xs text-slate-400">Let&apos;s build your best life.</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          <NavItem icon={Home} label="Home" active href="/preview/home" />
          <NavItem icon={Layers} label="Stacks" href="/modules" />
          <NavItem icon={Calendar} label="Calendar" href="/modules/calendar-ai" />
          <NavItem icon={CheckCircle2} label="Tasks" href="/dashboard" />
          <NavItem icon={MessageSquare} label="Advisors" href="/dashboard" />
          <NavItem icon={BarChart3} label="Insights" href="/modules/analytics-dashboard" />
          <NavItem icon={Users} label="Connections" href="/modules/relationship-manager" />
          <NavItem icon={Settings} label="Settings" href="/profile" />
        </nav>

        <p className="mt-6 text-xs italic leading-relaxed text-emerald-400/90">
          &ldquo;Life is short. Build the life you actually want to live.&rdquo;
        </p>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Today at a Glance</h1>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            Design preview — not live
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {/* Today's Plan */}
          <PreviewCard title="Today's Plan">
            <ul className="space-y-3">
              {tasks.map((task) => (
                <li key={task.label} className="flex items-start gap-3">
                  {task.done ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                    >
                      {task.label}
                    </p>
                    <p className="text-xs text-slate-500">{task.time}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="mb-2 flex justify-between text-xs text-slate-500">
                <span>{tasksLeft} tasks left</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </PreviewCard>

          {/* Health */}
          <PreviewCard title="Health">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-rose-500">♥</span>
              <span className="text-3xl font-bold text-slate-900">72</span>
              <span className="text-sm text-slate-500">HRV</span>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-semibold text-slate-800">7h 42m</p>
                <p className="text-[11px] text-slate-500">Sleep</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">8,243</p>
                <p className="text-[11px] text-slate-500">Steps</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">76</p>
                <p className="text-[11px] text-slate-500">Readiness</p>
              </div>
            </div>
            <Sparkline />
          </PreviewCard>

          {/* Financial Overview */}
          <PreviewCard title="Financial Overview">
            <div className="mb-1 flex flex-wrap items-baseline gap-2">
              <span className="text-xs text-slate-500">Net Worth</span>
              <span className="text-2xl font-bold text-slate-900">$128,450</span>
            </div>
            <p className="mb-3 text-xs font-medium text-emerald-600">+2.4% this month</p>
            <FinanceChart />
            <div className="mt-3 grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
              <div>
                <p className="text-[11px] text-slate-500">Investments</p>
                <p className="text-sm font-semibold text-slate-800">$86,230</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Cash</p>
                <p className="text-sm font-semibold text-slate-800">$12,840</p>
              </div>
            </div>
          </PreviewCard>

          {/* Upcoming */}
          <PreviewCard title="Upcoming">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Weekend in Costa Rica</p>
                  <p className="text-xs text-slate-500">May 24 – May 31</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Product Launch Prep</p>
                  <p className="text-xs text-slate-500">May 27</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                  <span className="text-sm">🎂</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Mom&apos;s Birthday</p>
                  <p className="text-xs text-slate-500">May 30</p>
                </div>
              </li>
            </ul>
            <Link
              href="/modules/calendar-ai"
              className="mt-4 inline-block text-sm font-medium text-sky-600 hover:text-sky-700"
            >
              View calendar →
            </Link>
          </PreviewCard>

          {/* Top Focus */}
          <PreviewCard title="Top Focus">
            <p className="mb-4 text-center text-sm font-medium text-slate-700">
              Launch new digital product
            </p>
            <FocusRing percent={65} />
            <p className="mt-4 text-center text-xs text-slate-500">
              Next step: <span className="font-medium text-slate-700">Finish landing page</span>
            </p>
          </PreviewCard>

          {/* AI Insight */}
          <PreviewCard title="AI Insight" className="relative">
            <Sparkles className="absolute right-5 top-5 h-5 w-5 text-violet-500" />
            <p className="pr-8 text-sm leading-relaxed text-slate-600">
              You&apos;ve been sleeping better and hitting your step goal consistently. Energy
              levels trending up this week. Keep it up! Consider blocking focus time tomorrow
              morning.
            </p>
          </PreviewCard>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Preview only ·{' '}
          <Link href="/" className="text-sky-600 hover:underline">
            Back to current homepage
          </Link>
          {' · '}
          <Link href="/dashboard" className="text-sky-600 hover:underline">
            Current dashboard
          </Link>
        </p>
      </main>
    </div>
  )
}
