import type { CashAccount, LedgerState, Owner, Persona } from '../types.ts'
import { ownersFor } from './ledger.ts'

export interface CashEvent {
  date: string
  amount: number
  label: string
}

/** Snapshot already includes money through startDate. Only newer logs move the balance. */
function appliesToSnapshot(logDate: string, logCreatedAt: string | undefined, account: CashAccount): boolean {
  if (logDate > account.startDate) return true
  if (logDate < account.startDate) return false
  const started = account.createdAt
  return Boolean(started && logCreatedAt && logCreatedAt > started)
}

export function cashEventsFor(state: LedgerState, account: CashAccount): CashEvent[] {
  const owner = account.owner
  const events: CashEvent[] = []

  for (const a of state.activity ?? []) {
    if (a.owner !== owner || !appliesToSnapshot(a.date, a.createdAt, account)) continue
    if (a.kind === 'income') events.push({ date: a.date, amount: a.amount, label: a.label || 'Paycheck' })
    else if (a.kind === 'spend' || a.kind === 'fun') events.push({ date: a.date, amount: -a.amount, label: a.label })
    else if ((a.kind === 'savings' || a.kind === 'investments') && a.notes !== 'Starting balance') {
      events.push({ date: a.date, amount: -a.amount, label: a.label })
    }
  }

  for (const h of state.hustles ?? []) {
    if (h.owner !== owner) continue
    for (const l of state.hustleLines ?? []) {
      if (l.hustleId !== h.id || !appliesToSnapshot(l.date, l.createdAt, account)) continue
      events.push({
        date: l.date,
        amount: l.kind === 'revenue' ? l.amount : -l.amount,
        label: `${h.name} · ${l.label}`,
      })
    }
  }

  for (const loan of state.loans ?? []) {
    if (loan.owner !== owner) continue
    for (const l of state.loanLines ?? []) {
      if (l.loanId !== loan.id || l.kind !== 'payment' || !appliesToSnapshot(l.date, l.createdAt, account)) continue
      events.push({ date: l.date, amount: -l.amount, label: `${loan.name} · ${l.label}` })
    }
  }

  for (const card of state.cards ?? []) {
    if (card.owner !== owner) continue
    for (const l of state.cardLines ?? []) {
      if (l.cardId !== card.id || l.kind !== 'payment' || !appliesToSnapshot(l.date, l.createdAt, account)) continue
      events.push({ date: l.date, amount: -l.amount, label: `${card.name} · ${l.label}` })
    }
  }

  for (const adj of state.cashAdjusts ?? []) {
    if (adj.accountId !== account.id || !appliesToSnapshot(adj.date, adj.createdAt, account)) continue
    events.push({ date: adj.date, amount: adj.amount, label: adj.label })
  }

  return events.sort((a, b) => b.date.localeCompare(a.date) || Math.abs(b.amount) - Math.abs(a.amount))
}

export function liveBalance(state: LedgerState, account: CashAccount): number {
  const n = account.startBalance + cashEventsFor(state, account).reduce((sum, e) => sum + e.amount, 0)
  return Math.round(n * 100) / 100
}

export function visibleCash(state: LedgerState, persona: Persona): CashAccount[] {
  const allow = new Set(ownersFor(persona))
  return (state.cashAccounts ?? []).filter((a) => allow.has(a.owner))
}

export function cashOnHand(state: LedgerState, persona: Persona): number {
  const n = visibleCash(state, persona).reduce((sum, a) => sum + liveBalance(state, a), 0)
  return Math.round(n * 100) / 100
}

export function ownerName(owner: Owner, state: LedgerState): string {
  if (owner === 'shared') return 'Shared'
  return state.profiles[owner].name
}

/** Drop v1 accounts that stacked paychecks already sitting in the snapshot. */
export function migrateCashAccounts(accounts: CashAccount[] | undefined): CashAccount[] {
  if (!Array.isArray(accounts)) return []
  return accounts.filter((a) => Boolean(a.createdAt))
}
