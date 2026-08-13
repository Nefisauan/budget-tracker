import type { LedgerState, MoneyEntry, Owner } from '../types.ts'
import { monthsUntil, monthlyAmount, usd } from './money.ts'
import { riskPosture, sumKind, weddingSavings } from './ledger.ts'

export interface PaySlice {
  key: string
  label: string
  color: string
  pct: number
  amount: number
  why: string
}

export interface PayPlan {
  headline: string
  sub: string
  slices: PaySlice[]
  notes: string[]
}

const COLORS: Record<string, string> = {
  needs: '#c56b86',
  fun: '#e4c37a',
  emergency: '#7ee7d6',
  wedding: '#f0b7c8',
  event: '#c4b5fd',
  invest: '#8b9cff',
  buffer: '#3a3948',
}

function roundDollars(total: number, weights: { key: string; w: number }[]): Record<string, number> {
  const positive = weights.filter((x) => x.w > 0)
  const sumW = positive.reduce((n, x) => n + x.w, 0) || 1
  const raw = positive.map((x) => ({ key: x.key, exact: (total * x.w) / sumW }))
  const floors = raw.map((x) => ({ key: x.key, n: Math.floor(x.exact) }))
  let leftover = total - floors.reduce((n, x) => n + x.n, 0)
  leftover = Math.round(leftover)
  const remainders = raw
    .map((x, i) => ({ i, frac: x.exact - floors[i].n }))
    .sort((a, b) => b.frac - a.frac)
  for (const r of remainders) {
    if (leftover <= 0) break
    floors[r.i].n += 1
    leftover -= 1
  }
  const out: Record<string, number> = {}
  for (const f of floors) out[f.key] = f.n
  return out
}

function clampW(n: number): number {
  return Math.max(0, n)
}

export function recommendPaycheckSplit(
  check: number,
  owner: Owner,
  state: LedgerState,
  entries: MoneyEntry[],
): PayPlan {
  const who =
    owner === 'shared' ? 'the house' : owner === 'kaylie' ? state.profiles.kaylie.name : state.profiles.nefi.name
  const age = Math.min(state.profiles.kaylie.age, state.profiles.nefi.age)
  const risk = riskPosture(age)
  const income = sumKind(entries, 'income')
  const spend = sumKind(entries, 'spend')
  const fun = sumKind(entries, 'fun')
  const savings = sumKind(entries, 'savings')
  const investments = sumKind(entries, 'investments')
  const weddingFund = weddingSavings(entries)
  const emergencyMonthly = entries
    .filter((e) => e.kind === 'savings' && e.category.toLowerCase().includes('emergency'))
    .reduce((n, e) => n + monthlyAmount(e), 0)
  const otherSavings = Math.max(0, savings - weddingFund - emergencyMonthly)
  const wedding = [...state.events].find((e) => e.kind === 'wedding')
  const monthsToWedding = wedding ? monthsUntil(wedding.date) : null
  const nearEvent = [...state.events]
    .filter((e) => e.kind !== 'wedding' && monthsUntil(e.date) > 0 && monthsUntil(e.date) < 24 && e.estimatedCost > 0)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  let needs = 0.5
  let funW = 0.1
  let emergency = 0.1
  let weddingW = 0.15
  let eventW = 0
  let invest = 0.15
  let buffer = 0

  const notes: string[] = []

  if (income > 0 && spend + fun + savings + investments > 0) {
    needs = spend / income
    funW = fun / income
    const savePct = savings / income
    const investPct = investments / income
    const rest = Math.max(0, 1 - needs - funW - savePct - investPct)
    if (savings > 0) {
      weddingW = savePct * (weddingFund / savings)
      emergency = savePct * (emergencyMonthly / savings)
      eventW = savePct * (otherSavings / savings)
    } else {
      weddingW = 0
      emergency = 0
      eventW = 0
    }
    invest = investPct
    buffer = rest
    notes.push('This follows the mix already on your ledger, then tilts for what’s coming.')
  } else {
    notes.push(`No monthly mix yet, so this is a starter split for age ${age}: live, enjoy a little, and fund the near term in cash.`)
  }

  if (wedding && monthsToWedding !== null && monthsToWedding > 0 && wedding.estimatedCost > 0) {
    const neededMonthly = wedding.estimatedCost / Math.max(monthsToWedding, 1)
    const behind = weddingFund < neededMonthly * 0.85
    if (monthsToWedding < 18 && behind) {
      const bump = monthsToWedding < 8 ? 0.12 : 0.08
      weddingW += bump
      invest = clampW(invest - bump * 0.7)
      funW = clampW(funW - bump * 0.3)
      notes.push(
        `Wedding is ${Math.max(1, Math.round(monthsToWedding))} months out and the sinking fund is behind ~${usd(neededMonthly)}/mo. This check puts extra in cash, not the market.`,
      )
    } else if (monthsToWedding < 24) {
      weddingW = Math.max(weddingW, 0.12)
      notes.push('Wedding dollars from this check stay in a HYSA. Long-term investing waits for non-wedding money.')
    }
  } else if (!wedding) {
    weddingW = 0
  }

  if (nearEvent) {
    const m = Math.max(1, monthsUntil(nearEvent.date))
    eventW = Math.max(eventW, 0.08)
    notes.push(`${nearEvent.title} is in ${Math.round(m)} months — skim a named sinking fund from this deposit.`)
  }

  const runway = spend > 0 ? savings / spend : 99
  if (runway < 1) {
    emergency = Math.max(emergency, 0.18)
    invest = clampW(invest - 0.08)
    notes.push('Emergency cash is thin. Fill a one-month cushion before you get brave with brokerage.')
  } else if (runway < 3) {
    emergency = Math.max(emergency, 0.1)
  }

  funW = Math.max(funW, 0.05)
  if (age < 26 && runway >= 1 && !(wedding && monthsToWedding !== null && monthsToWedding < 8)) {
    invest = Math.max(invest, 0.08)
    notes.push(`${risk.label} posture (~${risk.equity}% equity on long-horizon money). Roth/index after cash jobs are funded.`)
  }

  const weights = [
    { key: 'needs', w: clampW(needs) },
    { key: 'fun', w: clampW(funW) },
    { key: 'emergency', w: clampW(emergency) },
    { key: 'wedding', w: clampW(weddingW) },
    { key: 'event', w: clampW(eventW) },
    { key: 'invest', w: clampW(invest) },
    { key: 'buffer', w: clampW(buffer) },
  ]
  const dollars = roundDollars(Math.round(check), weights)
  const total = Math.round(check) || 1

  const labels: Record<string, string> = {
    needs: 'Needs',
    fun: 'Fun',
    emergency: 'Emergency',
    wedding: wedding ? 'Wedding fund' : 'Wedding',
    event: nearEvent ? nearEvent.title : 'Sinking fund',
    invest: 'Invest',
    buffer: 'Leave in checking',
  }
  const whys: Record<string, string> = {
    needs: 'Rent, food, transport — the life you already owe this month.',
    fun: 'A no-questions envelope so the rest of the plan actually sticks.',
    emergency: 'Cash for a bad week. Separate from the wedding.',
    wedding: 'HYSA only. This date does not get market risk.',
    event: 'A named pile for a dated cost, not “general savings.”',
    invest: 'Roth / index funds. Money you will not touch for 5+ years.',
    buffer: 'Float until the next bill hits. Don’t let it become mystery spending.',
  }

  const order = ['needs', 'fun', 'emergency', 'wedding', 'event', 'invest', 'buffer']
  const slices: PaySlice[] = order
    .filter((key) => (dollars[key] ?? 0) > 0)
    .map((key) => ({
      key,
      label: labels[key],
      color: COLORS[key],
      amount: dollars[key],
      pct: dollars[key] / total,
      why: whys[key],
    }))

  return {
    headline: `${who} got paid ${usd(check)}. Split it like this.`,
    sub: 'This is for this deposit — it does not change your monthly ledger unless you go add the lines.',
    slices,
    notes,
  }
}
