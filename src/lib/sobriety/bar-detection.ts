export type TransactionLike = {
  id?: string | null
  date?: string | null
  name?: string | null
  merchant_name?: string | null
  category?: string[] | string | null
  amount?: number | null
}

export type PlaceMatch = {
  merchant_name: string
  category: 'bar' | 'restaurant' | 'other'
  confidence: 'high' | 'medium' | 'low'
  reason: string
  date: string | null
  amount: number
  transaction_id: string | null
}

const BAR_KEYWORDS = [
  'bar',
  'pub',
  'tavern',
  'brewery',
  'brewpub',
  'taproom',
  'tap house',
  'taphouse',
  'saloon',
  'speakeasy',
  'wine bar',
  'winebar',
  'cocktail',
  'distillery',
  'liquor',
  'nightclub',
  'night club',
  'lounge',
  'sports bar',
  'irish pub',
  'beer garden',
  'cidery',
  'meadery',
]

const RESTAURANT_KEYWORDS = [
  'restaurant',
  'grill',
  'bistro',
  'cafe',
  'café',
  'diner',
  'kitchen',
  'steakhouse',
  'pizzeria',
  'taqueria',
  'cantina',
  'brasserie',
  'eatery',
  'gastropub',
]

const BAR_CATEGORIES = ['bars', 'nightlife', 'alcohol', 'beer', 'wine', 'liquor', 'cocktails']

const RESTAURANT_CATEGORIES = ['restaurants', 'food and drink', 'food & drink', 'dining']

function norm(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function categoryBlob(category: TransactionLike['category']): string {
  if (!category) return ''
  if (Array.isArray(category)) return norm(category.join(' '))
  return norm(String(category))
}

function merchantLabel(tx: TransactionLike): string {
  return (tx.merchant_name || tx.name || '').trim()
}

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k))
}

export function classifyDrinkingPlace(tx: TransactionLike): PlaceMatch | null {
  const label = merchantLabel(tx)
  if (!label) return null

  const text = norm(`${label} ${tx.name || ''}`)
  const cats = categoryBlob(tx.category)
  const amount = Math.abs(Number(tx.amount) || 0)

  const barByKeyword = hasKeyword(text, BAR_KEYWORDS)
  const barByCategory = hasKeyword(cats, BAR_CATEGORIES)
  const restaurantByKeyword = hasKeyword(text, RESTAURANT_KEYWORDS)
  const restaurantByCategory = hasKeyword(cats, RESTAURANT_CATEGORIES)

  if (barByKeyword || barByCategory) {
    return {
      merchant_name: label,
      category: 'bar',
      confidence: barByKeyword && barByCategory ? 'high' : 'high',
      reason: barByCategory
        ? 'Budget category looks like a bar or nightlife spend'
        : 'Merchant name matches a bar, pub, or nightlife venue',
      date: tx.date || null,
      amount,
      transaction_id: tx.id || null,
    }
  }

  if (restaurantByKeyword || restaurantByCategory) {
    return {
      merchant_name: label,
      category: 'restaurant',
      confidence: restaurantByKeyword ? 'medium' : 'low',
      reason: 'Restaurant or dining spend — confirm only if you drank here',
      date: tx.date || null,
      amount,
      transaction_id: tx.id || null,
    }
  }

  return null
}

export function groupPlaceMatches(matches: PlaceMatch[]): Array<{
  merchant_name: string
  category: 'bar' | 'restaurant' | 'other'
  visit_count: number
  total_spend: number
  last_seen_date: string | null
  sample_dates: string[]
  transaction_ids: string[]
  confidence: 'high' | 'medium' | 'low'
  reason: string
}> {
  const byName = new Map<string, PlaceMatch[]>()
  for (const match of matches) {
    const key = norm(match.merchant_name)
    const list = byName.get(key) ?? []
    list.push(match)
    byName.set(key, list)
  }

  const grouped = [...byName.values()].map((list) => {
    const primary =
      list.find((m) => m.category === 'bar') ??
      list.find((m) => m.category === 'restaurant') ??
      list[0]
    const dates = list
      .map((m) => m.date)
      .filter((d): d is string => Boolean(d))
      .sort()
      .reverse()
    const confidenceRank = { high: 3, medium: 2, low: 1 }
    const bestConfidence = list.reduce(
      (best, m) => (confidenceRank[m.confidence] > confidenceRank[best] ? m.confidence : best),
      primary.confidence
    )

    return {
      merchant_name: primary.merchant_name,
      category: primary.category,
      visit_count: list.length,
      total_spend: Math.round(list.reduce((sum, m) => sum + m.amount, 0) * 100) / 100,
      last_seen_date: dates[0] ?? null,
      sample_dates: [...new Set(dates)].slice(0, 8),
      transaction_ids: list.map((m) => m.transaction_id).filter((id): id is string => Boolean(id)),
      confidence: bestConfidence,
      reason: primary.reason,
    }
  })

  return grouped.sort((a, b) => {
    if (a.category !== b.category) {
      if (a.category === 'bar') return -1
      if (b.category === 'bar') return 1
    }
    return b.visit_count - a.visit_count
  })
}
