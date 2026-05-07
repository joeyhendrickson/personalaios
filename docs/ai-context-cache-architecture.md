# AI Context Cache Architecture

## Current State (Before Implementation)

### AI Entry Points

| Route                                              | Trigger                            | Data Fetched                                              | Raw Data in Prompt                 |
| -------------------------------------------------- | ---------------------------------- | --------------------------------------------------------- | ---------------------------------- |
| `/api/chat`                                        | Every chat message                 | 11+ tables, module data (20 rows/table per module)        | Yes – full dump into system prompt |
| `/api/ai/project-goal-alignment`                   | Dashboard mount                    | goals, tasks, habits, priorities                          | Yes                                |
| `/api/analytics/ai-insights`                       | Analytics refresh                  | goals, tasks, habits, priorities, accomplishments, points | Yes                                |
| `/api/budget/analyze`                              | Budget Analysis button             | goals, expected income/expenses, transactions (90 days)   | Yes                                |
| `/api/ai/life-coach`                               | AI Coach message                   | Comprehensive fetch via `fetchComprehensiveUserData`      | Yes                                |
| `/api/projects/recommendations`                    | Task Advisor "Get recommendations" | goals, tasks                                              | Yes                                |
| `/api/projects/strategic-*`                        | Active Projects widget             | goals, tasks, habits                                      | Yes                                |
| `/api/habit-master/ai-insights`                    | Habit Master module                | habit data                                                | Yes                                |
| Module-specific (day-trader, focus-enhancer, etc.) | Module buttons                     | Module tables                                             | Yes                                |

### Data Ontology (Supabase)

- **Core**: `projects` (dashboard projects; formerly `weekly_goals`), `tasks`, `goals` (user goals), `priorities`, `daily_habits`, `education_items`, `points_ledger`, `accomplishments`
- **Profile**: `profiles`, `user_profiles` (assessment_data)
- **Budget**: `transactions`, `bank_connections`, `expected_income`, `expected_expenses`
- **Modules**: Per-module tables (see `moduleTableMappings` in chat route)

### Gaps

- No caching: every AI call fetches raw data
- No token-efficient summarization
- No daily precompute
- No manual refresh for AI context
- `fetchDashboardData` refreshes dashboard UI data only – not AI context

---

## Target State

### Four-Layer Context Model

1. **Static Profile** (low volatility): name, preferences, goals, assessment_data, vision
2. **Structured State** (medium): dashboard values, financial summaries, task status, module metrics
3. **Derived Insights** (computed): AI summaries, patterns, risk flags, recommendations
4. **Ephemeral** (high): recent messages, current intent, page context – assembled at call time

### Components

- **`user_context_cache`** – Stores precomputed summaries (layers 1–3)
- **`cache_refresh_jobs`** – Tracks refresh runs, prevents duplicates
- **Cache Generator** – Fetches data → normalizes → summarizes (cheap model) → stores
- **assembleAIContext()** – Loads cache + merges ephemeral → token-efficient payload
- **Manual Refresh API** – `/api/ai/context-cache/refresh` – user-triggered
- **Daily Cron** – `/api/cron/refresh-ai-context` – batch refresh all users

### Staleness Policy

- **Fresh**: `last_full_refresh_at` within 24h OR `last_incremental_refresh_at` within 2h
- **Fallback**: If missing/stale, AI calls fall back to live fetch (current behavior)
- **Manual refresh**: Always triggers full refresh; future AI calls use new cache

### Cost Strategy

- **Summarization**: defaults to the same chat model as the app (`gpt-5-mini`, or `OPENAI_SUMMARIZATION_MODEL` to override)
- **User-facing**: `gpt-5-mini` by default (or `OPENAI_MODEL`)
- Summarize once per day (or on manual refresh); reuse for many AI calls

---

## Env Vars

| Variable                     | Required   | Description                                    |
| ---------------------------- | ---------- | ---------------------------------------------- |
| `OPENAI_API_KEY`             | Yes        | For summarization and user-facing AI           |
| `OPENAI_SUMMARIZATION_MODEL` | No         | Optional override for cache summarization only |
| `SUPABASE_SERVICE_ROLE_KEY`  | Yes        | For cache writes and cron (bypasses RLS)       |
| `CRON_SECRET`                | Yes (prod) | Bearer token for cron endpoints                |

---

## Testing Strategy

1. **Manual refresh**: Click "Refresh AI Context" in dashboard menu; verify cache row updated.
2. **Chat**: Send a message; verify response uses context (check logs for "using cached context").
3. **Stale fallback**: Delete cache row or set `last_full_refresh_at` to 25h ago; chat should still work (live fetch).
4. **Cron**: In dev, `GET /api/cron/refresh-ai-context`; in prod, verify Vercel cron triggers at 3 AM.
5. **Auth**: Ensure one user cannot access another's cache (RLS enforced).

---

## Future Extensibility

- **Redis**: Add Redis layer for hot cache; Supabase as source of truth. TTL = 24h.
- **Vector layer**: Store embeddings of summaries for semantic search; optional RAG later.
- **Incremental refresh**: Track `source_data_checksum` per module; refresh only changed modules.
- **module_context_snapshots**: Optional per-module cache for large modules (e.g. budget).
