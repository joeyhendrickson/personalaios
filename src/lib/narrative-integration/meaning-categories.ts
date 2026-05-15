export const MEANING_CATEGORIES = [
  'Self-knowledge',
  'Boundaries',
  'Discernment',
  'Strength',
  'Values',
  'Relationships',
  'Human nature',
  'Spiritual/existential meaning',
  'Life direction',
  'Compassion',
  'Agency',
] as const

export type MeaningCategory = (typeof MEANING_CATEGORIES)[number]
