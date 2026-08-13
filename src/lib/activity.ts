import type { Activity, FlowKind, LedgerState, Owner, Persona } from '../types.ts'
import { isoDate, prettyDate, weekLabel, weekStart } from './money.ts'
import { ownersFor } from './ledger.ts'

export function visibleActivity(state: LedgerState, persona: Persona): Activity[] {
  const allow = new Set(ownersFor(persona))
  return state.activity.filter((a) => allow.has(a.owner))
}

export function sumActivity(rows: Activity[], kind?: FlowKind): number {
  return rows.filter((a) => !kind || a.kind === kind).reduce((n, a) => n + a.amount, 0)
}

export function allocationFromActivity(rows: Activity[]): {
  key: string
  label: string
  value: number
  color: string
}[] {
  const spend = sumActivity(rows, 'spend')
  const fun = sumActivity(rows, 'fun')
  const savings = sumActivity(rows, 'savings')
  const investments = sumActivity(rows, 'investments')
  return [
    { key: 'spend', label: 'Needs', value: spend, color: '#c56b86' },
    { key: 'fun', label: 'Fun', value: fun, color: '#e4c37a' },
    { key: 'savings', label: 'Savings', value: savings, color: '#7ee7d6' },
    { key: 'investments', label: 'Invest', value: investments, color: '#8b9cff' },
  ].filter((s) => s.value > 0)
}

export function splitByOwnerActivity(rows: Activity[]): { name: string; value: number; fill: string }[] {
  const kaylie = rows.filter((a) => a.owner === 'kaylie' && a.kind === 'income').reduce((n, a) => n + a.amount, 0)
  const nefi = rows.filter((a) => a.owner === 'nefi' && a.kind === 'income').reduce((n, a) => n + a.amount, 0)
  return [
    { name: 'Kaylie', value: kaylie, fill: '#f0b7c8' },
    { name: 'Nefi', value: nefi, fill: '#7ee7d6' },
  ]
}

export function byCategoryActivity(rows: Activity[]): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const a of rows) {
    if (a.kind === 'income') continue
    map.set(a.category, (map.get(a.category) ?? 0) + a.amount)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function thisMonth(rows: Activity[], today = isoDate()): number {
  const prefix = today.slice(0, 7)
  return rows.filter((a) => a.date.startsWith(prefix)).reduce((n, a) => n + a.amount, 0)
}

export interface WeekBucket {
  start: string
  label: string
  range: string
  rows: Activity[]
  income: number
  spend: number
  fun: number
  savings: number
  investments: number
}

export function groupWeeks(rows: Activity[], today = isoDate()): WeekBucket[] {
  const map = new Map<string, Activity[]>()
  for (const row of rows) {
    const start = weekStart(row.date)
    const list = map.get(start) ?? []
    list.push(row)
    map.set(start, list)
  }
  return [...map.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((start) => {
      const list = map.get(start) ?? []
      const end = shiftEnd(start)
      return {
        start,
        label: weekLabel(start, today),
        range: `${prettyDate(start)} – ${prettyDate(end)}`,
        rows: list.sort((a, b) => b.date.localeCompare(a.date)),
        income: sumKind(list, 'income'),
        spend: sumKind(list, 'spend'),
        fun: sumKind(list, 'fun'),
        savings: sumKind(list, 'savings'),
        investments: sumKind(list, 'investments'),
      }
    })
}

function sumKind(rows: Activity[], kind: FlowKind): number {
  return rows.filter((a) => a.kind === kind).reduce((n, a) => n + a.amount, 0)
}

function shiftEnd(start: string): string {
  const [y, m, d] = start.split('-').map(Number)
  const dt = new Date(y, (m ?? 1) - 1, (d ?? 1) + 6)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function weekChart(rows: Activity[], weeks = 8, today = isoDate()): {
  week: string
  investments: number
  savings: number
  income: number
}[] {
  const start = weekStart(today)
  const buckets = groupWeeks(rows, today)
  const byStart = new Map(buckets.map((b) => [b.start, b]))
  const out = []
  for (let i = weeks - 1; i >= 0; i--) {
    const [y, m, d] = start.split('-').map(Number)
    const dt = new Date(y, (m ?? 1) - 1, (d ?? 1) - i * 7)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    const b = byStart.get(key)
    out.push({
      week: weekLabel(key, today).replace(' weeks ago', 'w').replace('This week', 'Now').replace('Last week', 'Last'),
      investments: b?.investments ?? 0,
      savings: b?.savings ?? 0,
      income: b?.income ?? 0,
    })
  }
  return out
}

export function runningTotal(rows: Activity[], kind: FlowKind): { date: string; total: number }[] {
  const sorted = [...rows].filter((a) => a.kind === kind).sort((a, b) => a.date.localeCompare(b.date))
  let total = 0
  return sorted.map((a) => {
    total += a.amount
    return { date: prettyDate(a.date), total }
  })
}

export function sliceToActivity(
  date: string,
  owner: Owner,
  sliceKey: string,
  label: string,
  amount: number,
): Omit<Activity, 'id'> | null {
  if (amount <= 0 || sliceKey === 'buffer') return null
  const map: Record<string, { kind: FlowKind; category: string }> = {
    needs: { kind: 'spend', category: 'Other' },
    fun: { kind: 'fun', category: 'Other' },
    emergency: { kind: 'savings', category: 'Emergency' },
    wedding: { kind: 'savings', category: 'Wedding' },
    event: { kind: 'savings', category: 'General' },
    invest: { kind: 'investments', category: 'Brokerage' },
  }
  const meta = map[sliceKey]
  if (!meta) return null
  return {
    date,
    owner,
    kind: meta.kind,
    category: meta.category,
    label,
    amount,
    notes: 'From this-check split',
  }
}
