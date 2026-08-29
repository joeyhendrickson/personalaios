/**
 * Preview layout — isolated from app dark-mode overrides where possible.
 * Route: /preview/home (not linked from production nav by default).
 */
export default function PreviewHomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="preview-home-root min-h-screen bg-slate-100 text-slate-900 [&_.dark]:bg-slate-100">
      {children}
    </div>
  )
}
