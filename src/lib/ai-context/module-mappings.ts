/**
 * Module-to-table mappings for AI context.
 * Aligned to actual Supabase schemas — see supabase/migrations.
 * @see docs/ai-context-cache-architecture.md
 */

export const MODULE_TABLE_MAPPINGS: Record<string, string[]> = {
  'fitness-tracker': [
    'fitness_goals',
    'fitness_stats',
    'fitness_progress',
    'fitness_insights',
    'fitness_biometrics',
    'fitness_energy_history',
    'recovery_tracking',
    'daily_nutrition',
    'workout_sessions',
  ],
  'budget-optimizer': [
    'budget_goals',
    'budget_insights',
    'budget_categories',
    'expected_income',
    'expected_expenses',
    'potential_income',
    'potential_expenses',
    'manual_accounts',
    'accountability_questions',
  ],
  'day-trader': ['trading_analyses'],
  'relationship-manager': [
    'relationships',
    'relationship_goals',
    'relationship_notes',
    'relationship_summaries',
    'contact_history',
  ],
  'dating-manager': ['dating_prospects', 'dating_evaluations', 'dating_partner_criteria'],
  'grocery-optimizer': [
    'grocery_receipts',
    'grocery_items',
    'grocery_analyses',
    'grocery_preferences',
  ],
  'focus-enhancer': [
    'focus_analyses',
    'focus_conversations',
    'focus_analysis_summaries',
    'user_fears_insights',
    'focus_suggestions',
  ],
  'habit-master': [
    'habit_master_habits',
    'habit_master_completions',
    'habit_master_streaks',
    'habit_master_insights',
  ],
  'gratitude-journal': ['gratitude_journal_entries'],
  'narrative-integration': [
    'narrative_integration_sessions',
    'narrative_integration_events',
    'narrative_integration_summaries',
    'narrative_integration_messages',
  ],
  'calendar-ai': ['calendar_connections', 'calendar_preferences'],
  'dream-catcher': ['dream_catcher_sessions', 'user_vision'],
  'time-blocker': ['time_blocks', 'discussion_sessions'],
  'post-creator': ['post_creator_jobs', 'post_creator_posts', 'post_creator_voice_profiles'],
  'project-plan-builder': ['project_plan_builder_jobs', 'project_plan_builder_projects'],
  'raid-monitoring': ['raid_monitoring_jobs', 'raid_monitoring_entries'],
}

/** Advisory categories each module can inform (used for cross-module routing) */
export const MODULE_ADVISORY_CATEGORIES: Record<string, string[]> = {
  'budget-optimizer': [
    'financial management',
    'spending improvement',
    'revenue maximization',
    'personal organization',
    'life management',
  ],
  'day-trader': [
    'financial management',
    'economic or market prediction',
    'stock trading',
    'business opportunity identification',
    'revenue maximization',
  ],
  'fitness-tracker': [
    'health/wellness',
    'nutrition improvement',
    'habits improvement',
    'self-care',
    'alignment of goals to current energy levels',
  ],
  'relationship-manager': [
    'relationship management',
    'relationship alignment',
    'emotional stability',
    'personal needs',
    'self-care',
  ],
  'dating-manager': ['dating', 'relationship management', 'emotional stability', 'personal needs'],
  'grocery-optimizer': [
    'nutrition improvement',
    'spending improvement',
    'health/wellness',
    'financial management',
  ],
  'focus-enhancer': [
    'focus',
    'emotional stability',
    'trauma management',
    'habit management',
    'time management',
  ],
  'narrative-integration': [
    'emotional stability',
    'spiritual growth',
    'trauma management',
    'self-care',
    'vision casting',
  ],
  'gratitude-journal': ['gratitude', 'emotional stability', 'spiritual growth', 'self-care'],
  'habit-master': ['habits improvement', 'habit management', 'focus', 'emotional stability'],
  'calendar-ai': [
    'calendar integration',
    'daily routine planning',
    'time management',
    'prioritizing tasks',
  ],
  'dream-catcher': ['vision casting', 'spiritual growth', 'goal planning', 'personal needs'],
}

const FALLBACK_PATTERNS = [
  '_goals',
  '_data',
  '_entries',
  '_records',
  '_stats',
  '_progress',
  '_analyses',
  '_insights',
  '_items',
  '_categories',
]

export function getModuleTables(moduleId: string): string[] {
  const mapped = MODULE_TABLE_MAPPINGS[moduleId]
  if (mapped?.length) return mapped
  const moduleName = moduleId.replace(/-/g, '_')
  return FALLBACK_PATTERNS.map((suffix) => `${moduleName}${suffix}`)
}

export function getModuleCategories(moduleId: string): string[] {
  return MODULE_ADVISORY_CATEGORIES[moduleId] ?? ['life management']
}

/** Reverse lookup: which installed modules are relevant to a topic keyword */
export function modulesForTopic(topic: string, installedModuleIds: string[]): string[] {
  const t = topic.toLowerCase()
  return installedModuleIds.filter((id) =>
    getModuleCategories(id).some((cat) => cat.includes(t) || t.includes(cat.split('/')[0] ?? ''))
  )
}
