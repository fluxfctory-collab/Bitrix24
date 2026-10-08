import { LayoutDashboard, PlayCircle, SearchX } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { BrandLockup } from '../components/brand/VoiceMark'
import { EmptyState } from '../components/ui/States'
import { copy } from '../copy'

const linkClass =
  'inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] px-4 text-sm font-medium transition-colors sm:h-10'

export function NotFound({ embedded = false }: { embedded?: boolean }) {
  useEffect(() => {
    document.title = `${copy.notFound.title} · ${copy.brand.name}`
  }, [])

  const content = (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface shadow-card">
      <EmptyState
        icon={SearchX}
        title={copy.notFound.title}
        body={copy.notFound.body}
        action={
          <>
            <Link to="/demo" className={`${linkClass} bg-brand text-white hover:bg-brand-hover`}>
              <PlayCircle aria-hidden="true" className="size-4" />
              {copy.notFound.toDemo}
            </Link>
            <Link to="/dashboard" className={`${linkClass} border border-line-strong bg-surface text-ink hover:bg-subtle`}>
              <LayoutDashboard aria-hidden="true" className="size-4" />
              {copy.notFound.toDashboard}
            </Link>
          </>
        }
      />
    </div>
  )

  if (embedded) {
    return (
      <>
        <h1 className="sr-only">{copy.notFound.title}</h1>
        {content}
      </>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[1424px] items-center px-4 sm:px-5 lg:px-8">
          <Link to="/demo" className="rounded-lg">
            <BrandLockup />
          </Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-10 outline-none">
        <div className="w-full">
          <h1 className="sr-only">{copy.notFound.title}</h1>
          {content}
        </div>
      </main>
    </div>
  )
}
