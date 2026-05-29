const CATEGORY_EMOJI: Record<string, string> = {
  quick_money: '⚡',
  save_money: '💳',
  health: '💪',
  network_expansion: '🤝',
  business_growth: '📈',
  fires: '🔥',
  good_living: '🌟',
  big_vision: '🎯',
  job: '💼',
  organization: '📁',
  tech_issues: '🔧',
  business_launch: '🚀',
  future_planning: '🗺️',
  innovation: '💡',
  productivity: '🚀',
  learning: '📚',
  financial: '💰',
  personal: '👤',
  other: '📋',
}

export function getProjectCategoryEmoji(category: string | undefined | null): string {
  if (!category) return '📋'
  return CATEGORY_EMOJI[category] ?? '📋'
}
