import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Activity,
  BudgetPlan,
  Hustle,
  HustleLine,
  Loan,
  LoanLine,
  CardAccount,
  CardLine,
  CashAccount,
  CashAdjust,
  LedgerState,
  LifeEvent,
  MoneyEntry,
  Persona,
  Session,
  View,
} from '../types.ts'
import { migrateCashAccounts } from './cash.ts'
import { demoLedger, emptyBudgetPlan, emptyLedger } from './ledger.ts'

function stamp<T extends { createdAt?: string }>(row: T): T {
  return { ...row, createdAt: row.createdAt ?? new Date().toISOString() }
}

const LEDGER_KEY = 'orbit-ledger-v2'
const SESSION_KEY = 'orbit-session-v2'

function migrateBudgetPlan(raw?: BudgetPlan): BudgetPlan {
  const fallback = emptyBudgetPlan()
  const legacy = raw as (BudgetPlan & { income?: number; allocations?: Record<string, number> }) | undefined
  if (!legacy?.goals) return fallback
  if (legacy.allocations) {
    const income = Number(legacy.income) || 0
    return {
      goals: Object.fromEntries(
        Object.entries(fallback.goals).map(([key]) => [
          key,
          Math.round((income * (Number(legacy.goals[key as keyof BudgetPlan['goals']]) || 0)) / 100),
        ]),
      ) as BudgetPlan['goals'],
    }
  }
  return { goals: { ...fallback.goals, ...legacy.goals } }
}

function readLedger(): LedgerState {
  try {
    const raw = localStorage.getItem(LEDGER_KEY)
    if (!raw) return emptyLedger()
    const parsed = JSON.parse(raw) as LedgerState
    if (!parsed?.profiles?.kaylie || !parsed?.profiles?.nefi) return emptyLedger()
    return {
      profiles: parsed.profiles,
      entries: Array.isArray(parsed.entries)
        ? parsed.entries.map((e) => ({ ...e, cadence: e.cadence ?? 'monthly' }))
        : [],
      activity: Array.isArray(parsed.activity)
        ? parsed.activity.filter((a) => a.notes !== 'From this-check split')
        : [],
      hustles: Array.isArray(parsed.hustles) ? parsed.hustles : [],
      hustleLines: Array.isArray(parsed.hustleLines) ? parsed.hustleLines : [],
      loans: Array.isArray(parsed.loans) ? parsed.loans : [],
      loanLines: Array.isArray(parsed.loanLines) ? parsed.loanLines : [],
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      cardLines: Array.isArray(parsed.cardLines) ? parsed.cardLines : [],
      cashAccounts: migrateCashAccounts(parsed.cashAccounts),
      cashAdjusts: migrateCashAccounts(parsed.cashAccounts).length ? parsed.cashAdjusts ?? [] : [],
      events: Array.isArray(parsed.events)
        ? parsed.events.map((e) =>
            e.kind === 'wedding' && e.estimatedCost === 25000 ? { ...e, estimatedCost: 20000 } : e,
          )
        : [],
      budgetPlan: migrateBudgetPlan(parsed.budgetPlan),
    }
  } catch {
    return emptyLedger()
  }
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

interface Store {
  ready: boolean
  state: LedgerState
  session: Session | null
  enter: (persona: Persona) => void
  exit: () => void
  setView: (view: View) => void
  setAge: (who: 'kaylie' | 'nefi', age: number) => void
  setTagline: (who: 'kaylie' | 'nefi', tagline: string) => void
  setBudgetPlan: (plan: BudgetPlan) => void
  upsertEntry: (entry: MoneyEntry) => void
  removeEntry: (id: string) => void
  upsertEvent: (event: LifeEvent) => void
  removeEvent: (id: string) => void
  addActivity: (row: Activity) => void
  addActivities: (rows: Activity[]) => void
  removeActivity: (id: string) => void
  upsertHustle: (hustle: Hustle) => void
  removeHustle: (id: string) => void
  addHustleLine: (line: HustleLine) => void
  removeHustleLine: (id: string) => void
  upsertLoan: (loan: Loan) => void
  removeLoan: (id: string) => void
  addLoanLine: (line: LoanLine) => void
  removeLoanLine: (id: string) => void
  upsertCard: (card: CardAccount) => void
  removeCard: (id: string) => void
  addCardLine: (line: CardLine) => void
  removeCardLine: (id: string) => void
  upsertCash: (account: CashAccount) => void
  removeCash: (id: string) => void
  addCashAdjust: (row: CashAdjust) => void
  removeCashAdjust: (id: string) => void
  resetCash: () => void
  loadDemo: () => void
  reset: () => void
  exportJson: () => string
  importJson: (raw: string) => void
}

const Ctx = createContext<Store | null>(null)

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<LedgerState>(emptyLedger)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    setState(readLedger())
    setSession(readSession())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(LEDGER_KEY, JSON.stringify(state))
  }, [state, ready])

  useEffect(() => {
    if (!ready) return
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  }, [session, ready])

  const api = useMemo<Store>(
    () => ({
      ready,
      state,
      session,
      enter: (persona) => setSession({ persona, view: 'dashboard' }),
      exit: () => setSession(null),
      setView: (view) => setSession((s) => (s ? { ...s, view } : s)),
      setAge: (who, age) =>
        setState((s) => ({
          ...s,
          profiles: { ...s.profiles, [who]: { ...s.profiles[who], age } },
        })),
      setTagline: (who, tagline) =>
        setState((s) => ({
          ...s,
          profiles: { ...s.profiles, [who]: { ...s.profiles[who], tagline } },
        })),
      setBudgetPlan: (budgetPlan) => setState((s) => ({ ...s, budgetPlan })),
      upsertEntry: (entry) =>
        setState((s) => {
          const i = s.entries.findIndex((e) => e.id === entry.id)
          const entries = [...s.entries]
          if (i >= 0) entries[i] = entry
          else entries.unshift(entry)
          return { ...s, entries }
        }),
      removeEntry: (id) =>
        setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) })),
      upsertEvent: (event) =>
        setState((s) => {
          const i = s.events.findIndex((e) => e.id === event.id)
          const events = [...s.events]
          if (i >= 0) events[i] = event
          else events.unshift(event)
          return { ...s, events }
        }),
      removeEvent: (id) =>
        setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) })),
      addActivity: (row) => setState((s) => ({ ...s, activity: [stamp(row), ...s.activity] })),
      addActivities: (rows) =>
        setState((s) => ({ ...s, activity: [...rows.map(stamp), ...s.activity] })),
      removeActivity: (id) =>
        setState((s) => ({ ...s, activity: s.activity.filter((a) => a.id !== id) })),
      upsertHustle: (hustle) =>
        setState((s) => {
          const i = s.hustles.findIndex((h) => h.id === hustle.id)
          const hustles = [...s.hustles]
          if (i >= 0) hustles[i] = hustle
          else hustles.unshift(hustle)
          return { ...s, hustles }
        }),
      removeHustle: (id) =>
        setState((s) => ({
          ...s,
          hustles: s.hustles.filter((h) => h.id !== id),
          hustleLines: s.hustleLines.filter((l) => l.hustleId !== id),
        })),
      addHustleLine: (line) => setState((s) => ({ ...s, hustleLines: [stamp(line), ...s.hustleLines] })),
      removeHustleLine: (id) =>
        setState((s) => ({ ...s, hustleLines: s.hustleLines.filter((l) => l.id !== id) })),
      upsertLoan: (loan) =>
        setState((s) => {
          const loans = [...(s.loans ?? [])]
          const i = loans.findIndex((l) => l.id === loan.id)
          if (i >= 0) loans[i] = loan
          else loans.unshift(loan)
          return { ...s, loans }
        }),
      removeLoan: (id) =>
        setState((s) => ({
          ...s,
          loans: (s.loans ?? []).filter((l) => l.id !== id),
          loanLines: (s.loanLines ?? []).filter((l) => l.loanId !== id),
        })),
      addLoanLine: (line) =>
        setState((s) => ({ ...s, loanLines: [stamp(line), ...(s.loanLines ?? [])] })),
      removeLoanLine: (id) =>
        setState((s) => ({ ...s, loanLines: (s.loanLines ?? []).filter((l) => l.id !== id) })),
      upsertCard: (card) =>
        setState((s) => {
          const cards = [...(s.cards ?? [])]
          const i = cards.findIndex((c) => c.id === card.id)
          if (i >= 0) cards[i] = card
          else cards.unshift(card)
          return { ...s, cards }
        }),
      removeCard: (id) =>
        setState((s) => ({
          ...s,
          cards: (s.cards ?? []).filter((c) => c.id !== id),
          cardLines: (s.cardLines ?? []).filter((l) => l.cardId !== id),
        })),
      addCardLine: (line) =>
        setState((s) => ({ ...s, cardLines: [stamp(line), ...(s.cardLines ?? [])] })),
      removeCardLine: (id) =>
        setState((s) => ({ ...s, cardLines: (s.cardLines ?? []).filter((l) => l.id !== id) })),
      upsertCash: (account) =>
        setState((s) => {
          const cashAccounts = [...(s.cashAccounts ?? [])]
          const i = cashAccounts.findIndex((a) => a.id === account.id)
          if (i >= 0) cashAccounts[i] = account
          else cashAccounts.unshift(account)
          return { ...s, cashAccounts }
        }),
      removeCash: (id) =>
        setState((s) => ({
          ...s,
          cashAccounts: (s.cashAccounts ?? []).filter((a) => a.id !== id),
          cashAdjusts: (s.cashAdjusts ?? []).filter((a) => a.accountId !== id),
        })),
      addCashAdjust: (row) =>
        setState((s) => ({ ...s, cashAdjusts: [stamp(row), ...(s.cashAdjusts ?? [])] })),
      removeCashAdjust: (id) =>
        setState((s) => ({ ...s, cashAdjusts: (s.cashAdjusts ?? []).filter((a) => a.id !== id) })),
      resetCash: () => setState((s) => ({ ...s, cashAccounts: [], cashAdjusts: [] })),
      loadDemo: () => setState((s) => demoLedger(s)),
      reset: () => setState(emptyLedger()),
      exportJson: () => JSON.stringify(state, null, 2),
      importJson: (raw) => {
        const parsed = JSON.parse(raw) as LedgerState
        if (!parsed?.profiles?.kaylie) throw new Error('Not an Orbit ledger')
        setState({
          profiles: parsed.profiles,
          entries: (parsed.entries ?? []).map((e) => ({ ...e, cadence: e.cadence ?? 'monthly' })),
          activity: (parsed.activity ?? []).filter((a) => a.notes !== 'From this-check split'),
          hustles: parsed.hustles ?? [],
          hustleLines: parsed.hustleLines ?? [],
          loans: parsed.loans ?? [],
          loanLines: parsed.loanLines ?? [],
          cards: parsed.cards ?? [],
          cardLines: parsed.cardLines ?? [],
          cashAccounts: migrateCashAccounts(parsed.cashAccounts),
          cashAdjusts: migrateCashAccounts(parsed.cashAccounts).length ? parsed.cashAdjusts ?? [] : [],
          events: (parsed.events ?? []).map((e) =>
            e.kind === 'wedding' && e.estimatedCost === 25000 ? { ...e, estimatedCost: 20000 } : e,
          ),
          budgetPlan: migrateBudgetPlan(parsed.budgetPlan),
        })
      },
    }),
    [ready, state, session],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useLedger(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLedger outside provider')
  return ctx
}
