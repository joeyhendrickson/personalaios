/** Human-readable labels for Life Hack module ids */
export const MODULE_LABELS: Record<string, string> = {
  'day-trader': 'Market Advisor',
  'budget-optimizer': 'Budget Advisor',
  'grocery-optimizer': 'Grocery Store Optimizer',
  'ai-coach': 'Life Coach',
  'habit-master': 'Habit Master',
  'focus-enhancer': 'Focus Enhancer',
  'dream-catcher': 'Dream Catcher',
  'narrative-integration': 'I Am Present',
  'gratitude-journal': 'Gratitude Journal',
  'fitness-tracker': 'Fitness Tracker',
  'relationship-manager': 'Relationship Manager',
  'relationship-intel': 'Relationship Intel',
  'analytics-dashboard': 'Analytics Dashboard',
  'rewards-self-care': 'Rewards & Self-Care',
  'project-plan-builder': 'Project Plan Builder',
  'raid-monitoring': 'RAID Monitoring',
  dashboard: 'Dashboard',
  chat: 'AI Advisor Chat',
  priorities: 'Priorities',
  projects: 'Projects',
  tasks: 'Tasks',
  habits: 'Habits',
}

export function labelForModule(moduleId: string): string {
  return (
    MODULE_LABELS[moduleId] || moduleId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
}
