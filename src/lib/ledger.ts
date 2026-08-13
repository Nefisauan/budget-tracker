import type { Activity, Cadence, FlowKind, LedgerState, MoneyEntry, Owner, Persona } from '../types.ts'
import { isoDate, monthlyAmount, shiftDays, uid } from './money.ts'

export const CATEGORIES: Record<FlowKind, string[]> = {
  income: ['Salary', 'Freelance', 'Bonus', 'Family', 'Other'],
  spend: ['Housing', 'Food', 'Transport', 'Health', 'Shopping', 'Wedding', 'Utilities', 'Other'],
  fun: ['Dining', 'Travel', 'Hobbies', 'Nights out', 'Gifts', 'Other'],
  savings: ['Emergency', 'Wedding', 'Home', 'Travel', 'General'],
  investments: ['Retirement', 'Brokerage', 'Crypto', 'Other'],
}

export const KIND_COPY: Record<FlowKind, { title: string; hint: string; verb: string }> = {
  income: { title: 'Income', hint: 'What you earn, and how often it lands', verb: 'Add income' },
  spend: { title: 'Needs & spending', hint: 'The life you already live', verb: 'Add spend' },
  fun: { title: 'Fun', hint: 'Joy is a line item', verb: 'Add fun' },
  savings: { title: 'Savings', hint: 'Cash with a job to do', verb: 'Add savings' },
  investments: { title: 'Investments', hint: 'Money that goes to work', verb: 'Add investment' },
}

export function emptyLedger(): LedgerState {
  return {
    profiles: {
      kaylie: { name: 'Kaylie', age: 22, tagline: 'Rose orbit' },
      nefi: { name: 'Nefi', age: 22, tagline: 'Teal orbit' },
    },
    entries: [],
    activity: [],
    events: [
      {
        id: uid(),
        title: 'Our wedding',
        date: '2027-06-12',
        kind: 'wedding',
        estimatedCost: 25000,
        notes: 'The big day — keep this fund in cash, not the market.',
      },
    ],
  }
}

export function demoLedger(base: LedgerState): LedgerState {
  const stamp = new Date().toISOString()
  const row = (
    owner: Owner,
    kind: FlowKind,
    category: string,
    label: string,
    amount: number,
    cadence: Cadence = 'monthly',
  ): MoneyEntry => ({
    id: uid(),
    owner,
    kind,
    category,
    label,
    amount,
    cadence,
    notes: '',
    createdAt: stamp,
  })

  const today = isoDate()
  const act = (
    daysAgo: number,
    owner: Owner,
    kind: FlowKind,
    category: string,
    label: string,
    amount: number,
  ): Activity => ({
    id: uid(),
    date: shiftDays(today, -daysAgo),
    owner,
    kind,
    category,
    label,
    amount,
    notes: '',
  })

  return {
    ...base,
    entries: [
      row('kaylie', 'income', 'Salary', 'Kaylie · day job', 4200),
      row('nefi', 'income', 'Salary', 'Nefi · day job', 4800),
      row('shared', 'spend', 'Housing', 'Rent', 1850),
      row('shared', 'spend', 'Food', 'Groceries', 540),
      row('shared', 'spend', 'Transport', 'Cars & transit', 260),
      row('shared', 'spend', 'Utilities', 'Wifi, power, phones', 220),
      row('kaylie', 'fun', 'Dining', 'Kaylie fun money', 180),
      row('nefi', 'fun', 'Hobbies', 'Nefi fun money', 220),
      row('shared', 'fun', 'Nights out', 'Date nights', 120),
      row('shared', 'savings', 'Wedding', 'Wedding sinking fund', 900),
      row('shared', 'savings', 'Emergency', 'Emergency fund', 400),
      row('kaylie', 'investments', 'Retirement', 'Kaylie Roth / 401k', 350),
      row('nefi', 'investments', 'Retirement', 'Nefi Roth / 401k', 400),
      row('shared', 'investments', 'Brokerage', 'Joint index funds', 250),
    ],
    activity: [
      act(21, 'kaylie', 'investments', 'Retirement', 'Kaylie Roth', 200),
      act(21, 'nefi', 'investments', 'Retirement', 'Nefi Roth', 250),
      act(21, 'shared', 'savings', 'Wedding', 'Wedding HYSA', 400),
      act(14, 'kaylie', 'investments', 'Retirement', 'Kaylie Roth', 200),
      act(14, 'nefi', 'investments', 'Retirement', 'Nefi Roth', 250),
      act(14, 'shared', 'savings', 'Wedding', 'Wedding HYSA', 450),
      act(7, 'kaylie', 'investments', 'Retirement', 'Kaylie Roth', 220),
      act(7, 'nefi', 'investments', 'Retirement', 'Nefi Roth', 250),
      act(7, 'shared', 'savings', 'Emergency', 'Emergency fund', 150),
      act(1, 'kaylie', 'investments', 'Retirement', 'Kaylie Roth', 200),
      act(1, 'nefi', 'investments', 'Retirement', 'Nefi Roth', 280),
      act(1, 'shared', 'savings', 'Wedding', 'Wedding HYSA', 500),
    ],
  }
}

export function ownersFor(persona: Persona): Owner[] {
  if (persona === 'together') return ['kaylie', 'nefi', 'shared']
  return [persona, 'shared']
}

export function visibleEntries(state: LedgerState, persona: Persona): MoneyEntry[] {
  const allow = new Set(ownersFor(persona))
  return state.entries.filter((e) => allow.has(e.owner))
}

export function sumKind(entries: MoneyEntry[], kind: FlowKind): number {
  return entries.filter((e) => e.kind === kind).reduce((n, e) => n + monthlyAmount(e), 0)
}

export function byCategory(entries: MoneyEntry[], kind?: FlowKind): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const e of entries) {
    if (kind && e.kind !== kind) continue
    if (e.kind === 'income') continue
    map.set(e.category, (map.get(e.category) ?? 0) + monthlyAmount(e))
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function splitByOwner(entries: MoneyEntry[]): { name: string; value: number; fill: string }[] {
  const kaylie = entries.filter((e) => e.owner === 'kaylie' && e.kind === 'income').reduce((n, e) => n + monthlyAmount(e), 0)
  const nefi = entries.filter((e) => e.owner === 'nefi' && e.kind === 'income').reduce((n, e) => n + monthlyAmount(e), 0)
  return [
    { name: 'Kaylie', value: kaylie, fill: '#f0b7c8' },
    { name: 'Nefi', value: nefi, fill: '#7ee7d6' },
  ]
}

export function allocationSlices(entries: MoneyEntry[]): {
  key: string
  label: string
  value: number
  color: string
}[] {
  const income = sumKind(entries, 'income')
  const spend = sumKind(entries, 'spend')
  const fun = sumKind(entries, 'fun')
  const savings = sumKind(entries, 'savings')
  const investments = sumKind(entries, 'investments')
  const assigned = spend + fun + savings + investments
  const unassigned = Math.max(0, income - assigned)
  const slices = [
    { key: 'spend', label: 'Needs', value: spend, color: '#c56b86' },
    { key: 'fun', label: 'Fun', value: fun, color: '#e4c37a' },
    { key: 'savings', label: 'Savings', value: savings, color: '#7ee7d6' },
    { key: 'investments', label: 'Invest', value: investments, color: '#8b9cff' },
    { key: 'free', label: 'Unassigned', value: unassigned, color: '#3a3948' },
  ]
  return slices.filter((s) => s.value > 0)
}

export function weddingSavings(entries: MoneyEntry[]): number {
  return entries
    .filter((e) => e.kind === 'savings' && e.category.toLowerCase().includes('wedding'))
    .reduce((n, e) => n + monthlyAmount(e), 0)
}

export function riskPosture(age: number): { label: string; equity: number; blurb: string } {
  if (age < 25) {
    return {
      label: 'Adventurous',
      equity: 90,
      blurb: 'Decades of compounding ahead. Long-term money can sit in broad equity index funds.',
    }
  }
  if (age < 30) {
    return {
      label: 'Growth',
      equity: 85,
      blurb: 'Still young enough to take real market risk — as long as near-term cash is fenced off.',
    }
  }
  if (age < 40) {
    return {
      label: 'Balanced growth',
      equity: 75,
      blurb: 'Growth first, with a thicker cash cushion as life gets more expensive.',
    }
  }
  if (age < 50) {
    return {
      label: 'Balanced',
      equity: 65,
      blurb: 'Keep investing, but volatility hurts more when big goals are closer.',
    }
  }
  return {
    label: 'Measured',
    equity: 50,
    blurb: 'Protect what you have built. Growth still matters; drawdown recovery is slower.',
  }
}
