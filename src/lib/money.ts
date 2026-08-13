import type { Cadence, MoneyEntry } from '../types.ts'

export function uid(): string {
  return crypto.randomUUID()
}

export const CADENCES: { id: Cadence; label: string }[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Every 2 weeks' },
  { id: 'semimonthly', label: 'Twice a month' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

export function cadenceLabel(cadence: Cadence = 'monthly'): string {
  return CADENCES.find((c) => c.id === cadence)?.label ?? 'Monthly'
}

/** Turn a paycheck / bill amount into a monthly run-rate. */
export function monthlyAmount(entry: Pick<MoneyEntry, 'amount' | 'cadence'>): number {
  const a = entry.amount
  switch (entry.cadence ?? 'monthly') {
    case 'weekly':
      return (a * 52) / 12
    case 'biweekly':
      return (a * 26) / 12
    case 'semimonthly':
      return a * 2
    case 'yearly':
      return a / 12
    default:
      return a
  }
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
