export function uid(): string {
  return crypto.randomUUID()
}

export function usd(n: number, digits = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number.isFinite(n) ? n : 0)
}

export function pct(n: number): string {
  if (!Number.isFinite(n)) return '0%'
  return `${Math.round(n * 100)}%`
}

export function monthsUntil(iso: string): number {
  const delta = new Date(iso).getTime() - Date.now()
  return delta / (1000 * 60 * 60 * 24 * 30.437)
}

export function prettyDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
