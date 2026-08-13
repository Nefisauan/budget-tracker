import type { LedgerState, Loan, LoanLine, Persona } from '../types.ts'
import { isoDate } from './money.ts'
import { ownersFor } from './ledger.ts'

export const LOAN_CATEGORIES = ['Student', 'Auto', 'Personal', 'Medical', 'Other'] as const

export function visibleLoans(state: LedgerState, persona: Persona): Loan[] {
  const allow = new Set(ownersFor(persona))
  return (state.loans ?? []).filter((l) => allow.has(l.owner))
}

export function linesForLoan(state: LedgerState, loanId?: string): LoanLine[] {
  return (state.loanLines ?? []).filter((l) => !loanId || l.loanId === loanId)
}

export interface LoanTotals {
  start: number
  paid: number
  charged: number
  remaining: number
  paidThisMonth: number
}

export function loanTotals(loan: Loan, lines: LoanLine[], today = isoDate()): LoanTotals {
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
  return {
    start: loan.startBalance,
    paid,
    charged,
    remaining: Math.max(0, loan.startBalance + charged - paid),
    paidThisMonth,
  }
}

export function debtSummary(state: LedgerState, persona: Persona, today = isoDate()): {
  remaining: number
  paid: number
  paidThisMonth: number
  start: number
} {
  const loans = visibleLoans(state, persona)
  let remaining = 0
  let paid = 0
  let paidThisMonth = 0
  let start = 0
  for (const loan of loans) {
    const t = loanTotals(loan, linesForLoan(state, loan.id), today)
    remaining += t.remaining
    paid += t.paid
    paidThisMonth += t.paidThisMonth
    start += t.start
  }
  return { remaining, paid, paidThisMonth, start }
}
