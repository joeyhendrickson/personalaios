'use client'

export interface SuggestedNextMove {
  type: 'strategic' | 'social' | 'maintenance' | 'recovery'
  action_type?: 'advance_goal' | 'strengthen_relationship' | 'test_alignment' | 'correct_trajectory'
  strategy?: string
  next_move: string
  reasoning: string
  optional_message: string | null
  optional_activity: string | null
  optional_agenda: string | null
}

export function SuggestedNextMoveCard({
  move,
  loading,
  error,
  onRequest,
}: {
  move: SuggestedNextMove | null
  loading: boolean
  error: string | null
  onRequest: () => void
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">Suggested next move</h2>
        <button
          type="button"
          onClick={onRequest}
          disabled={loading}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Thinking…' : 'Refresh'}
        </button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!move && !loading && !error ? (
        <p className="text-sm text-muted-foreground">
          Generate a single grounded recommendation from your notes and messages.
        </p>
      ) : null}
      {move ? (
        <div className="space-y-3 text-sm">
          <div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
              {move.type}
            </span>
            <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {(move.action_type ?? 'strengthen_relationship').replace(/_/g, ' ')}
            </span>
            <p className="mt-2 font-medium leading-snug text-foreground">{move.next_move}</p>
          </div>
          {move.strategy ? (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Strategy</p>
              <p className="leading-relaxed text-foreground">{move.strategy}</p>
            </div>
          ) : null}
          <p className="text-muted-foreground leading-relaxed">{move.reasoning}</p>
          {move.optional_message ? (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Draft message</p>
              <blockquote className="rounded-md border border-border bg-muted/40 px-3 py-2 italic leading-relaxed">
                {move.optional_message}
              </blockquote>
            </div>
          ) : null}
          {move.optional_activity ? (
            <p>
              <span className="font-medium">Activity: </span>
              {move.optional_activity}
            </p>
          ) : null}
          {move.optional_agenda ? (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Agenda</p>
              <p className="whitespace-pre-wrap leading-relaxed">{move.optional_agenda}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
