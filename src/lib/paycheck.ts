import type { LedgerState, Owner } from '../types.ts'
import { monthsUntil, usd } from './money.ts'
import { riskPosture } from './ledger.ts'

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

export function recommendPaycheckSplit(check: number, owner: Owner, state: LedgerState): PayPlan {
  const who =
    owner === 'shared' ? 'the house' : owner === 'kaylie' ? state.profiles.kaylie.name : state.profiles.nefi.name
  const age = Math.min(state.profiles.kaylie.age, state.profiles.nefi.age)
  const risk = riskPosture(age)
  const wedding = [...state.events].find((e) => e.kind === 'wedding')
  const monthsToWedding = wedding ? monthsUntil(wedding.date) : null
  const nearEvent = [...state.events]
    .filter((e) => e.kind !== 'wedding' && monthsUntil(e.date) > 0 && monthsUntil(e.date) < 24 && e.estimatedCost > 0)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  let needs = 0.5
  let funW = 0.1
  let emergency = 0.1
  let weddingW = wedding ? 0.15 : 0
  let eventW = 0
  let invest = 0.15
  const notes: string[] = [
    'Suggestion only. Logging this paycheck does not change investments or anything else you already entered.',
  ]

  if (wedding && monthsToWedding !== null && monthsToWedding > 0 && monthsToWedding < 18) {
    weddingW = 0.2
    invest = 0.1
    notes.push(
      `Wedding is about ${Math.max(1, Math.round(monthsToWedding))} months out${wedding.estimatedCost ? ` · ${usd(wedding.estimatedCost)}` : ''}. Park that slice in cash.`,
    )
  }

  if (nearEvent) {
    eventW = 0.08
    invest = Math.max(0.05, invest - 0.05)
    notes.push(`${nearEvent.title} is coming — optional sinking-fund skim, only if you log it.`)
  }

  notes.push(`${risk.label} posture at ${age}: long-horizon leftover can go to a Roth after cash jobs are funded.`)

  const weights = [
    { key: 'needs', w: needs },
    { key: 'fun', w: funW },
    { key: 'emergency', w: emergency },
    { key: 'wedding', w: weddingW },
    { key: 'event', w: eventW },
    { key: 'invest', w: invest },
  ]
  const dollars = roundDollars(Math.round(check), weights)
  const total = Math.round(check) || 1

  const labels: Record<string, string> = {
    needs: 'Needs',
    fun: 'Fun',
    emergency: 'Emergency',
    wedding: 'Wedding fund',
    event: nearEvent ? nearEvent.title : 'Sinking fund',
    invest: 'Invest',
  }
  const whys: Record<string, string> = {
    needs: 'Rent, food, transport — only log this if you actually paid it from this check.',
    fun: 'Date night / joy money. Does not get written unless you log it.',
    emergency: 'Cash cushion. Separate from the wedding.',
    wedding: 'HYSA only. This date does not get market risk.',
    event: 'A named pile for a dated cost.',
    invest: 'Roth / index. Your existing investments are not changed by this suggestion.',
  }

  const order = ['needs', 'fun', 'emergency', 'wedding', 'event', 'invest']
  const slices = order
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
    headline: `${who} got paid ${usd(check)}.`,
    sub: 'Log the paycheck to add it. The pie below is advice — it will not rewrite what you already logged.',
    slices,
    notes,
  }
}
