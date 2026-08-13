export type Persona = 'kaylie' | 'nefi' | 'together'
export type Owner = 'kaylie' | 'nefi' | 'shared'
export type FlowKind = 'income' | 'spend' | 'fun' | 'savings' | 'investments'
export type Cadence = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'yearly'
export type EventKind = 'wedding' | 'travel' | 'home' | 'career' | 'family' | 'celebration' | 'other'
export type HustleLineKind = 'revenue' | 'cost'
export type LoanLineKind = 'payment' | 'charge'
export type BudgetCategory = 'needs' | 'fun' | 'business' | 'extra' | 'investing' | 'savings'
export type View = 'dashboard' | 'budget' | 'cash' | 'paycheck' | 'activity' | 'hustle' | 'loans' | 'cards' | 'income' | 'spend' | 'fun' | 'savings' | 'investments' | 'events' | 'advice'

export interface ProfileMeta {
  name: string
  age: number
  tagline: string
}

export interface MoneyEntry {
  id: string
  owner: Owner
  kind: FlowKind
  category: string
  label: string
  amount: number
  cadence: Cadence
  notes: string
  createdAt: string
}

export interface Activity {
  id: string
  date: string
  owner: Owner
  kind: FlowKind
  category: string
  label: string
  amount: number
  notes: string
  createdAt?: string
}

export interface Hustle {
  id: string
  name: string
  owner: Owner
  notes: string
}

export interface HustleLine {
  id: string
  hustleId: string
  kind: HustleLineKind
  category: string
  label: string
  amount: number
  date: string
  notes: string
  createdAt?: string
}

export interface Loan {
  id: string
  name: string
  owner: Owner
  category: string
  startBalance: number
  rate: number
  minPayment: number
  startDate: string
  notes: string
}

export interface LoanLine {
  id: string
  loanId: string
  kind: LoanLineKind
  amount: number
  date: string
  label: string
  notes: string
  createdAt?: string
}

export interface CardAccount {
  id: string
  name: string
  owner: Owner
  startBalance: number
  limit: number
  rate: number
  minPayment: number
  dueDay: number
  startDate: string
  notes: string
}

export interface CardLine {
  id: string
  cardId: string
  kind: LoanLineKind
  amount: number
  date: string
  label: string
  notes: string
  createdAt?: string
}

export interface CashAccount {
  id: string
  name: string
  owner: Owner
  startBalance: number
  startDate: string
  notes: string
  createdAt: string
}

export interface CashAdjust {
  id: string
  accountId: string
  amount: number
  date: string
  label: string
  createdAt?: string
}

export interface LifeEvent {
  id: string
  title: string
  date: string
  kind: EventKind
  estimatedCost: number
  notes: string
}

export interface BudgetPlan {
  goals: Record<BudgetCategory, number>
}

export interface LedgerState {
  profiles: {
    kaylie: ProfileMeta
    nefi: ProfileMeta
  }
  entries: MoneyEntry[]
  activity: Activity[]
  hustles: Hustle[]
  hustleLines: HustleLine[]
  loans: Loan[]
  loanLines: LoanLine[]
  cards: CardAccount[]
  cardLines: CardLine[]
  cashAccounts: CashAccount[]
  cashAdjusts: CashAdjust[]
  events: LifeEvent[]
  budgetPlan: BudgetPlan
}

export interface AdviceCard {
  id: string
  priority: 'now' | 'soon' | 'horizon'
  title: string
  body: string
  why: string
  action: string
}

export interface Session {
  persona: Persona
  view: View
}
