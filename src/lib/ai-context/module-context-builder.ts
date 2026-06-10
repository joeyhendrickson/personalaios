/**
 * Deterministic extractors: turn raw module rows into Advisor-ready summaries.
 * Includes objective facts and subjective user-provided content.
 */
import type { ModuleContextSummary } from '@/types/context-cache'
import type { BudgetContextData, RawUserData } from './fetch-user-data'
import { getModuleCategories } from './module-mappings'

const MAX_STRING = 200
const MAX_ITEMS = 5

function str(v: unknown, max = MAX_STRING): string {
  if (v == null) return ''
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function pickRows(
  data: Record<string, unknown[]>,
  ...tableNames: string[]
): Record<string, unknown>[] {
  for (const name of tableNames) {
    const rows = data[name]
    if (rows?.length) return rows as Record<string, unknown>[]
  }
  return []
}

function emptySummary(moduleId: string): ModuleContextSummary {
  return {
    moduleId,
    hasData: false,
    recordCount: 0,
    categories: getModuleCategories(moduleId),
    objectiveFacts: [],
    subjectiveNotes: [],
    recentHighlights: [],
  }
}

function extractBudgetOptimizer(
  moduleId: string,
  data: Record<string, unknown[]>,
  budget: BudgetContextData | undefined
): ModuleContextSummary {
  const summary = emptySummary(moduleId)
  const goals = pickRows(data, 'budget_goals')
  const insights = pickRows(data, 'budget_insights')
  const expectedIncome = pickRows(data, 'expected_income')
  const expectedExpenses = pickRows(data, 'expected_expenses')
  const manualAccounts = pickRows(data, 'manual_accounts')

  summary.recordCount =
    goals.length +
    insights.length +
    expectedIncome.length +
    expectedExpenses.length +
    manualAccounts.length +
    (budget?.transactions.length ?? 0)

  if (summary.recordCount === 0) return summary
  summary.hasData = true

  for (const g of goals.slice(0, MAX_ITEMS)) {
    summary.objectiveFacts.push(
      `Budget goal: ${str(g.title)} — target ${str(g.target_value)} ${str(g.target_unit || g.goal_category || '')}`.trim()
    )
  }

  for (const inc of expectedIncome.slice(0, 3)) {
    summary.objectiveFacts.push(
      `Expected income: ${str(inc.category)} $${Number(inc.amount || 0).toFixed(0)}/${str(inc.frequency || 'month')}`
    )
  }
  for (const exp of expectedExpenses.slice(0, 3)) {
    summary.objectiveFacts.push(
      `Expected expense: ${str(exp.category)} $${Number(exp.amount || 0).toFixed(0)}/${str(exp.frequency || 'month')}`
    )
  }

  if (budget?.monthIncome != null) {
    summary.objectiveFacts.push(
      `Last 30 days income (transactions): $${budget.monthIncome.toFixed(0)}`
    )
  }
  if (budget?.monthExpenses != null) {
    summary.objectiveFacts.push(
      `Last 30 days spending (transactions): $${budget.monthExpenses.toFixed(0)}`
    )
  }
  if (budget?.monthNet != null) {
    summary.objectiveFacts.push(
      `Last 30 days net (income − expenses − transfers): $${budget.monthNet.toFixed(0)}`
    )
  }
  if (budget?.transferTotal && budget.transferTotal > 0) {
    summary.objectiveFacts.push(`Total transfers out (30d): $${budget.transferTotal.toFixed(0)}`)
  }
  if (budget?.overridesAppliedCount && budget.overridesAppliedCount > 0) {
    summary.objectiveFacts.push(
      `${budget.overridesAppliedCount} transaction(s) use your income/expense/transfer overrides from Budget Manager`
    )
  }
  if (budget?.topSpendingCategories?.length) {
    summary.objectiveFacts.push(
      `Top spending categories: ${budget.topSpendingCategories.join(', ')}`
    )
  }
  if (budget?.tradingTransferTotal && budget.tradingTransferTotal > 0) {
    summary.objectiveFacts.push(
      `Transfers to trading/investment platforms (30d): $${budget.tradingTransferTotal.toFixed(0)}`
    )
  }
  if (budget?.recentTransactions?.length) {
    summary.recentHighlights.push(
      ...budget.recentTransactions
        .slice(0, 5)
        .map(
          (t) =>
            `${t.date}: ${t.name} $${Math.abs(t.amount).toFixed(0)}${t.kind ? ` (${t.kind})` : ''}${t.category ? ` [${t.category}]` : ''}`
        )
    )
  }

  for (const i of insights.slice(0, 3)) {
    summary.subjectiveNotes.push(`${str(i.title)}: ${str(i.description, 150)}`)
  }

  for (const a of manualAccounts.slice(0, 3)) {
    summary.objectiveFacts.push(
      `Manual account ${str(a.institution_name)} (${str(a.account_type)}): $${Number(a.amount || 0).toFixed(0)}`
    )
  }

  return summary
}

function extractDayTrader(moduleId: string, data: Record<string, unknown[]>): ModuleContextSummary {
  const summary = emptySummary(moduleId)
  const analyses = pickRows(data, 'trading_analyses')
  summary.recordCount = analyses.length
  if (!analyses.length) return summary
  summary.hasData = true

  for (const a of analyses.slice(0, MAX_ITEMS)) {
    const symbol = str(a.stock_symbol || a.name)
    const power = a.buying_power != null ? `$${Number(a.buying_power).toFixed(0)} buying power` : ''
    const investor = str(a.investor_type, 40)
    summary.objectiveFacts.push(
      `Analysis: ${symbol}${power ? ` — ${power}` : ''}${investor ? ` (${investor})` : ''}`.trim()
    )
    const events = a.event_monitoring as { selectedEvents?: string[] } | null
    if (events?.selectedEvents?.length) {
      summary.subjectiveNotes.push(
        `Watching events: ${events.selectedEvents.slice(0, 4).join(', ')}`
      )
    }
    const results = a.analysis_results as { summary?: string; thesis?: string } | null
    if (results?.thesis) summary.subjectiveNotes.push(`Thesis: ${str(results.thesis, 150)}`)
    if (results?.summary) summary.recentHighlights.push(str(results.summary, 150))
  }
  return summary
}

function extractFitness(moduleId: string, data: Record<string, unknown[]>): ModuleContextSummary {
  const summary = emptySummary(moduleId)
  const goals = pickRows(data, 'fitness_goals')
  const biometrics = pickRows(data, 'fitness_biometrics')
  const energy = pickRows(data, 'fitness_energy_history')
  const nutrition = pickRows(data, 'daily_nutrition')

  summary.recordCount = goals.length + biometrics.length + energy.length + nutrition.length
  if (summary.recordCount === 0) return summary
  summary.hasData = true

  for (const g of goals.slice(0, MAX_ITEMS)) {
    summary.objectiveFacts.push(
      `Fitness goal: ${str(g.title || g.goal_type)} — ${str(g.current_value)}/${str(g.target_value)} ${str(g.target_unit || '')}`.trim()
    )
  }
  const latestBio = biometrics[0]
  if (latestBio) {
    summary.objectiveFacts.push(
      `Latest biometrics: energy ${str(latestBio.energy_level_self_1_10)}/10, stress ${str(latestBio.stress_level_1_10)}/10`
    )
    if (latestBio.notes) summary.subjectiveNotes.push(str(latestBio.notes))
  }
  const latestEnergy = energy[0]
  if (latestEnergy) {
    summary.objectiveFacts.push(
      `Energy score ${str(latestEnergy.energy_score ?? latestEnergy.computed_energy_score)}; stress ${str(latestEnergy.stress_score ?? latestEnergy.computed_stress_score)}`
    )
  }
  if (nutrition[0]) {
    const n = nutrition[0]
    summary.objectiveFacts.push(
      `Recent nutrition: ${str(n.calories)} cal, protein ${str(n.protein_g)}g`
    )
  }
  return summary
}

function extractRelationships(
  moduleId: string,
  data: Record<string, unknown[]>
): ModuleContextSummary {
  const summary = emptySummary(moduleId)
  const rels = pickRows(data, 'relationships')
  const notes = pickRows(data, 'relationship_notes')
  const summaries = pickRows(data, 'relationship_summaries')

  summary.recordCount = rels.length + notes.length + summaries.length
  if (summary.recordCount === 0) return summary
  summary.hasData = true

  for (const r of rels.slice(0, MAX_ITEMS)) {
    summary.objectiveFacts.push(
      `${str(r.name)} (${str(r.relationship_type)}) — last contact ${str(r.last_contact_date || r.last_interaction)}`
    )
    if (r.vision) summary.subjectiveNotes.push(`${str(r.name)} vision: ${str(r.vision, 120)}`)
    if (r.notes) summary.subjectiveNotes.push(`${str(r.name)} notes: ${str(r.notes, 120)}`)
    if (r.interests)
      summary.subjectiveNotes.push(`${str(r.name)} interests: ${str(r.interests, 80)}`)
  }
  for (const s of summaries.slice(0, 2)) {
    summary.subjectiveNotes.push(str(s.summary || s.content, 150))
  }
  return summary
}

function extractDating(moduleId: string, data: Record<string, unknown[]>): ModuleContextSummary {
  const summary = emptySummary(moduleId)
  const prospects = pickRows(data, 'dating_prospects')
  const criteria = pickRows(data, 'dating_partner_criteria')

  summary.recordCount = prospects.length + criteria.length
  if (summary.recordCount === 0) return summary
  summary.hasData = true

  for (const p of prospects.slice(0, 3)) {
    summary.subjectiveNotes.push(
      `Prospect: positive ${str(p.positive_qualities, 80)}; concerns ${str(p.toxic_qualities, 80)}`
    )
    if (p.feels_known != null) {
      summary.subjectiveNotes.push(`Feels known rating: ${str(p.feels_known)}`)
    }
    if (p.notes) summary.subjectiveNotes.push(str(p.notes, 120))
  }
  if (criteria[0]?.summary) {
    summary.subjectiveNotes.push(`Partner criteria: ${str(criteria[0].summary, 150)}`)
  }
  return summary
}

function extractFocus(moduleId: string, data: Record<string, unknown[]>): ModuleContextSummary {
  const summary = emptySummary(moduleId)
  const fears = pickRows(data, 'user_fears_insights')
  const convos = pickRows(data, 'focus_conversations')
  const analyses = pickRows(data, 'focus_analyses')

  summary.recordCount = fears.length + convos.length + analyses.length
  if (summary.recordCount === 0) return summary
  summary.hasData = true

  for (const f of fears.slice(0, 3)) {
    summary.subjectiveNotes.push(`Fear (${str(f.fear_type)}): ${str(f.description, 120)}`)
    if (f.coping_strategies)
      summary.subjectiveNotes.push(`Coping: ${str(f.coping_strategies, 100)}`)
  }
  for (const c of convos.slice(0, 2)) {
    summary.subjectiveNotes.push(`User shared: ${str(c.user_message, 120)}`)
  }
  if (analyses[0]?.problematic_apps) {
    summary.objectiveFacts.push(`Problematic apps: ${str(analyses[0].problematic_apps, 100)}`)
  }
  return summary
}

function extractNarrative(moduleId: string, data: Record<string, unknown[]>): ModuleContextSummary {
  const summary = emptySummary(moduleId)
  const sessions = pickRows(data, 'narrative_integration_sessions')
  const events = pickRows(data, 'narrative_integration_events')

  summary.recordCount = sessions.length + events.length
  if (summary.recordCount === 0) return summary
  summary.hasData = true

  const latest = sessions[0]
  if (latest) {
    summary.subjectiveNotes.push(
      `Present state: emotional ${str(latest.emotional_state)}, stress ${str(latest.stress_level)}/10, rumination ${str(latest.rumination_level)}/10`
    )
    if (latest.meaning_statement)
      summary.subjectiveNotes.push(`Meaning: ${str(latest.meaning_statement, 150)}`)
    if (latest.user_goal)
      summary.subjectiveNotes.push(`Session goal: ${str(latest.user_goal, 120)}`)
  }
  for (const e of events.slice(0, 2)) {
    summary.subjectiveNotes.push(
      `Past event: ${str(e.title || e.event_description, 80)} — impact ${str(e.emotional_impact, 80)}`
    )
  }
  return summary
}

function extractGratitude(moduleId: string, data: Record<string, unknown[]>): ModuleContextSummary {
  const summary = emptySummary(moduleId)
  const entries = pickRows(data, 'gratitude_journal_entries')
  summary.recordCount = entries.length
  if (!entries.length) return summary
  summary.hasData = true

  for (const e of entries.slice(0, 3)) {
    const items = Array.isArray(e.gratitude_items)
      ? (e.gratitude_items as string[]).slice(0, 3)
      : []
    summary.subjectiveNotes.push(
      `${str(e.entry_date)} mood ${str(e.mood_rating)}/5: ${items.join('; ') || str(e.reflection, 120)}`
    )
  }
  return summary
}

function extractGrocery(moduleId: string, data: Record<string, unknown[]>): ModuleContextSummary {
  const summary = emptySummary(moduleId)
  const receipts = pickRows(data, 'grocery_receipts')
  const items = pickRows(data, 'grocery_items')
  const prefs = pickRows(data, 'grocery_preferences')

  summary.recordCount = receipts.length + items.length
  if (summary.recordCount === 0 && !prefs.length) return summary
  summary.hasData = true

  for (const r of receipts.slice(0, 3)) {
    summary.objectiveFacts.push(
      `Receipt ${str(r.store_name || r.merchant)} ${str(r.purchase_date || r.date)}: $${Number(r.total_amount || 0).toFixed(2)}`
    )
  }
  const itemNames = items
    .slice(0, 8)
    .map((i) => str(i.name || i.item_name, 40))
    .filter(Boolean)
  if (itemNames.length) {
    summary.recentHighlights.push(`Recent purchases: ${itemNames.join(', ')}`)
  }
  if (prefs[0]) {
    summary.subjectiveNotes.push(
      `Dietary prefs: ${str(prefs[0].dietary_restrictions || prefs[0].preferences, 100)}`
    )
  }
  return summary
}

function extractCalendar(moduleId: string, data: Record<string, unknown[]>): ModuleContextSummary {
  const summary = emptySummary(moduleId)
  const prefs = pickRows(data, 'calendar_preferences')
  const connections = pickRows(data, 'calendar_connections')

  summary.recordCount = prefs.length + connections.length
  if (summary.recordCount === 0) return summary
  summary.hasData = true

  if (connections[0]?.connected_email) {
    summary.objectiveFacts.push(`Calendar connected: ${str(connections[0].connected_email)}`)
  }
  const p = prefs[0]
  if (p) {
    const windows = p.time_windows as unknown[] | undefined
    summary.objectiveFacts.push(
      `Schedule windows: ${str(p.days)} ${p.start_hour}:00–${p.end_hour}:00${windows?.length ? ` (${windows.length} custom windows)` : ''}`
    )
  }
  return summary
}

function extractHabitMaster(
  moduleId: string,
  data: Record<string, unknown[]>
): ModuleContextSummary {
  const summary = emptySummary(moduleId)
  const habits = pickRows(data, 'habit_master_habits')
  const streaks = pickRows(data, 'habit_master_streaks')

  summary.recordCount = habits.length
  if (!habits.length) return summary
  summary.hasData = true

  for (const h of habits.slice(0, MAX_ITEMS)) {
    summary.objectiveFacts.push(`Habit: ${str(h.title || h.name)}`)
    if (h.personal_value) summary.subjectiveNotes.push(`Value: ${str(h.personal_value, 100)}`)
    if (h.reframe_statement)
      summary.subjectiveNotes.push(`Reframe: ${str(h.reframe_statement, 100)}`)
  }
  if (streaks[0]?.current_streak) {
    summary.objectiveFacts.push(`Longest active streak: ${str(streaks[0].current_streak)} days`)
  }
  return summary
}

function extractGeneric(moduleId: string, data: Record<string, unknown[]>): ModuleContextSummary {
  const summary = emptySummary(moduleId)
  let count = 0
  for (const [table, rows] of Object.entries(data)) {
    count += rows.length
    for (const row of rows.slice(0, 2)) {
      const r = row as Record<string, unknown>
      const title = r.title || r.name || r.summary
      if (title) summary.recentHighlights.push(`${table}: ${str(title, 100)}`)
    }
  }
  summary.recordCount = count
  summary.hasData = count > 0
  return summary
}

const EXTRACTORS: Record<
  string,
  (
    moduleId: string,
    data: Record<string, unknown[]>,
    budget?: BudgetContextData
  ) => ModuleContextSummary
> = {
  'budget-optimizer': extractBudgetOptimizer,
  'day-trader': (id, d) => extractDayTrader(id, d),
  'fitness-tracker': (id, d) => extractFitness(id, d),
  'relationship-manager': (id, d) => extractRelationships(id, d),
  'dating-manager': (id, d) => extractDating(id, d),
  'focus-enhancer': (id, d) => extractFocus(id, d),
  'narrative-integration': (id, d) => extractNarrative(id, d),
  'gratitude-journal': (id, d) => extractGratitude(id, d),
  'grocery-optimizer': (id, d) => extractGrocery(id, d),
  'calendar-ai': (id, d) => extractCalendar(id, d),
  'habit-master': (id, d) => extractHabitMaster(id, d),
}

export function buildModuleContextSummaries(raw: RawUserData): ModuleContextSummary[] {
  return raw.moduleData.map(({ module_id, data, total_records }) => {
    const extractor = EXTRACTORS[module_id]
    if (extractor) {
      return extractor(module_id, data, raw.budgetContext)
    }
    const generic = extractGeneric(module_id, data)
    if (total_records > 0 && !generic.hasData) {
      generic.hasData = true
      generic.recordCount = total_records
      generic.objectiveFacts.push(`${Object.keys(data).length} tables, ${total_records} records`)
    }
    return generic
  })
}

export function formatModuleContextForPrompt(summaries: ModuleContextSummary[]): string {
  const withData = summaries.filter((s) => s.hasData)
  if (!withData.length) {
    return 'MODULE CONTEXT: No installed modules with stored data yet. Encourage the user to add data in relevant modules.'
  }

  const blocks = withData.map((s) => {
    const lines: string[] = [`### ${s.moduleId} (${s.categories.slice(0, 3).join(', ')})`]
    if (s.aiSummary) {
      lines.push(`Summary: ${s.aiSummary}`)
    } else {
      if (s.objectiveFacts.length) {
        lines.push('Facts: ' + s.objectiveFacts.slice(0, 8).join(' | '))
      }
      if (s.subjectiveNotes.length) {
        lines.push('User-provided/subjective: ' + s.subjectiveNotes.slice(0, 6).join(' | '))
      }
      if (s.recentHighlights.length) {
        lines.push('Recent: ' + s.recentHighlights.slice(0, 5).join(' | '))
      }
    }
    return lines.join('\n')
  })

  return `MODULE CONTEXT (cite specific facts below when advising — do not invent data):\n${blocks.join('\n\n')}`
}
