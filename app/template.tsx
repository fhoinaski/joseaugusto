'use client'

/**
 * app/template.tsx
 *
 * Next.js re-mounts this component on every navigation (unlike layout.tsx
 * which persists). This gives us a lightweight fade+slide-up entrance
 * animation that runs on every page change without a full reload.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-transition">
      {children}
    </div>
  )
}
