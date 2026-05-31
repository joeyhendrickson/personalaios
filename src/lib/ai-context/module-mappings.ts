/**
 * Module-to-table mappings for AI context.
 * Customize here when adding new modules.
 * @see docs/ai-context-cache-architecture.md
 */
export const MODULE_TABLE_MAPPINGS: Record<string, string[]> = {
  'fitness-tracker': ['fitness_goals', 'fitness_stats', 'fitness_progress', 'fitness_insights'],
  'budget-optimizer': [
    'budget_categories',
    'budget_goals',
    'budget_allocations',
    'budget_insights',
    'budget_periods',
  ],
  'day-trader': ['trading_analyses'],
  'relationship-manager': ['relationships', 'relationship_types', 'relationship_goals'],
  'dating-manager': ['dating_prospects', 'dating_evaluations', 'dating_partner_criteria'],
  'grocery-optimizer': ['grocery_receipts', 'grocery_items', 'grocery_analyses'],
  'ai-coach': ['ai_coach_sessions', 'ai_coach_insights'],
  'time-blocker': ['time_blocks', 'time_block_sessions'],
  'post-creator': ['post_creator_jobs', 'post_creator_posts', 'post_creator_voice_profiles'],
  'project-plan-builder': ['project_plan_builder_jobs', 'project_plan_builder_projects'],
  'raid-monitoring': ['raid_monitoring_jobs', 'raid_monitoring_entries'],
  'focus-enhancer': ['focus_sessions', 'focus_benchmarks', 'focus_analyses'],
  'habit-master': ['habit_master_templates', 'habit_master_insights'],
  'gratitude-journal': ['gratitude_journal_entries'],
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
