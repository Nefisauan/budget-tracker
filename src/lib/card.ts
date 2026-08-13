import type { CardAccount, CardLine, LedgerState, Persona } from '../types.ts'
import { isoDate } from './money.ts'
import { ownersFor } from './ledger.ts'

export function visibleCards(state: LedgerState, persona: Persona): CardAccount[] {
  const allow = new Set(ownersFor(persona))
  return (state.cards ?? []).filter((c) => allow.has(c.owner))
}

export function linesForCard(state: LedgerState, cardId?: string): CardLine[] {
  return (state.cardLines ?? []).filter((l) => !cardId || l.cardId === cardId)
}

export interface CardTotals {
  start: number
  paid: number
  charged: number
  remaining: number
  paidThisMonth: number
  utilization: number
}

export function cardTotals(card: CardAccount, lines: CardLine[], today = isoDate()): CardTotals {
  const month = today.slice(0, 7)
  let paid = 0
  let charged = 0
  let paidThisMonth = 0
  for (const l of lines) {
    if (l.kind === 'payment') {
      paid += l.amount
      if (l.date.startsWith(month)) paidThisMonth += l.amount
    } else {
      charged += l.amount
    }
  }
  const remaining = Math.max(0, card.startBalance + charged - paid)
  return {
    start: card.startBalance,
    paid,
    charged,
    remaining,
    paidThisMonth,
    utilization: card.limit > 0 ? remaining / card.limit : 0,
  }
}

export function cardSummary(state: LedgerState, persona: Persona, today = isoDate()): {
  remaining: number
  paid: number
  paidThisMonth: number
} {
  let remaining = 0
  let paid = 0
  let paidThisMonth = 0
  for (const card of visibleCards(state, persona)) {
    const t = cardTotals(card, linesForCard(state, card.id), today)
    remaining += t.remaining
    paid += t.paid
    paidThisMonth += t.paidThisMonth
  }
  return { remaining, paid, paidThisMonth }
}
