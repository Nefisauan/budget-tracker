import type { Hustle, HustleLine, LedgerState, Persona } from '../types.ts'
import { isoDate } from './money.ts'
import { ownersFor } from './ledger.ts'

export const HUSTLE_CATEGORIES = {
  revenue: ['Sales', 'Freelance', 'Tips', 'Refund', 'Other'],
  cost: ['Supplies', 'Inventory', 'Ads', 'Software', 'Gas', 'Fees', 'Other'],
} as const

export function visibleHustles(state: LedgerState, persona: Persona): Hustle[] {
  const allow = new Set(ownersFor(persona))
  return state.hustles.filter((h) => allow.has(h.owner))
}

export function linesFor(state: LedgerState, hustleId?: string): HustleLine[] {
  return state.hustleLines.filter((l) => !hustleId || l.hustleId === hustleId)
}

export interface HustleTotals {
  revenue: number
  cost: number
  profit: number
  margin: number
  monthRevenue: number
  monthCost: number
  monthProfit: number
}

export function hustleTotals(lines: HustleLine[], today = isoDate()): HustleTotals {
  const month = today.slice(0, 7)
  let revenue = 0
  let cost = 0
  let monthRevenue = 0
  let monthCost = 0
  for (const l of lines) {
    if (l.kind === 'revenue') {
      revenue += l.amount
      if (l.date.startsWith(month)) monthRevenue += l.amount
    } else {
      cost += l.amount
      if (l.date.startsWith(month)) monthCost += l.amount
    }
  }
  const profit = revenue - cost
  const monthProfit = monthRevenue - monthCost
  return {
    revenue,
    cost,
    profit,
    margin: revenue > 0 ? profit / revenue : 0,
    monthRevenue,
    monthCost,
    monthProfit,
  }
}

export function visibleHustleLines(state: LedgerState, persona: Persona): HustleLine[] {
  const ids = new Set(visibleHustles(state, persona).map((h) => h.id))
  return state.hustleLines.filter((l) => ids.has(l.hustleId))
}

export function costSplit(lines: HustleLine[]): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const l of lines) {
    if (l.kind !== 'cost') continue
    map.set(l.category, (map.get(l.category) ?? 0) + l.amount)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}
