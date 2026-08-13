import type { FormEvent, ReactNode } from 'react'

export function GoldRule() {
  return <div className="hairline my-6 w-full" />
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="text-[11px] tracking-[0.18em] text-mute uppercase">{label}</span>
      {children}
    </label>
  )
}

export function fieldClass() {
  return 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-mist outline-none transition focus:border-gold/50'
}

export function Button({
  children,
  onClick,
  type = 'button',
  tone = 'gold',
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  tone?: 'gold' | 'ghost' | 'rose' | 'teal'
  className?: string
}) {
  const tones = {
    gold: 'bg-gold text-ink hover:bg-[#f0d59a]',
    ghost: 'border border-white/15 bg-white/5 text-mist hover:bg-white/10',
    rose: 'bg-rose text-ink hover:bg-[#f7c9d6]',
    teal: 'bg-teal text-ink hover:bg-[#a6f3e6]',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs tracking-wide transition ${
        active ? 'bg-gold text-ink' : 'border border-white/12 bg-white/5 text-mute hover:text-mist'
      }`}
    >
      {children}
    </button>
  )
}

export function Metric({
  kicker,
  value,
  hint,
  accent,
}: {
  kicker: string
  value: string
  hint?: string
  accent?: string
}) {
  return (
    <div className="glass rounded-3xl p-5">
      <p className="text-[11px] tracking-[0.2em] text-mute uppercase">{kicker}</p>
      <p className="mt-2 font-display text-3xl font-medium" style={{ color: accent ?? '#e4c37a' }}>
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-mute">{hint}</p> : null}
    </div>
  )
}

export function Panel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`glass rounded-3xl p-5 md:p-6 ${className}`}>{children}</section>
}

export function FormGrid({
  onSubmit,
  children,
}: {
  onSubmit: (e: FormEvent) => void
  children: ReactNode
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </form>
  )
}
