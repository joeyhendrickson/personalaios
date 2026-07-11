/** One Home vs legacy dashboard layout — revert-friendly via env + localStorage. */

export type DashboardLayoutMode = 'one-home' | 'legacy'
export type HomeTab = 'today' | 'plan' | 'modules'

export type DashboardHomeSection =
  | 'priorities'
  | 'goals'
  | 'projects'
  | 'tasks'
  | 'habits'
  | 'education'
  | 'accomplishments'
  | 'categories'

const STORAGE_KEY = 'lifestacks-dashboard-layout'

const TODAY_SECTIONS: DashboardHomeSection[] = ['priorities', 'tasks', 'habits', 'accomplishments']

const PLAN_SECTIONS: DashboardHomeSection[] = ['goals', 'projects', 'education', 'categories']

export function getDefaultLayoutMode(): DashboardLayoutMode {
  const env = process.env.NEXT_PUBLIC_DASHBOARD_LAYOUT
  if (env === 'legacy') return 'legacy'
  return 'one-home'
}

export function readStoredLayoutMode(): DashboardLayoutMode | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'legacy' || stored === 'one-home') return stored
  return null
}

export function persistLayoutMode(mode: DashboardLayoutMode): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, mode)
}

export function sectionInHomeTab(section: DashboardHomeSection, tab: HomeTab): boolean {
  if (tab === 'today') return TODAY_SECTIONS.includes(section)
  if (tab === 'plan') return PLAN_SECTIONS.includes(section)
  return false
}

export function shouldShowDashboardSection(
  section: DashboardHomeSection,
  layoutMode: DashboardLayoutMode,
  homeTab: HomeTab,
  sectionVisibility: Record<DashboardHomeSection, boolean>
): boolean {
  if (!sectionVisibility[section]) return false
  if (layoutMode === 'legacy') return true
  if (homeTab === 'modules') return false
  return sectionInHomeTab(section, homeTab)
}

export function shouldShowVisionSection(
  layoutMode: DashboardLayoutMode,
  homeTab: HomeTab
): boolean {
  return layoutMode === 'legacy' || homeTab === 'plan'
}

export function shouldShowTodayStats(layoutMode: DashboardLayoutMode, homeTab: HomeTab): boolean {
  return layoutMode === 'legacy' || homeTab === 'today'
}

export function shouldShowModulesHub(layoutMode: DashboardLayoutMode, homeTab: HomeTab): boolean {
  return layoutMode === 'one-home' && homeTab === 'modules'
}
