export type Persona = 'kaylie' | 'nefi' | 'together'
export type Owner = 'kaylie' | 'nefi' | 'shared'
export type FlowKind = 'income' | 'spend' | 'fun' | 'savings' | 'investments'
export type Cadence = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'yearly'
export type EventKind = 'wedding' | 'travel' | 'home' | 'career' | 'family' | 'celebration' | 'other'
export type View = 'dashboard' | 'paycheck' | 'activity' | 'income' | 'spend' | 'fun' | 'savings' | 'investments' | 'events' | 'advice'

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
}

export interface LifeEvent {
  id: string
  title: string
  date: string
  kind: EventKind
  estimatedCost: number
  notes: string
}

export interface LedgerState {
  profiles: {
    kaylie: ProfileMeta
    nefi: ProfileMeta
  }
  entries: MoneyEntry[]
  activity: Activity[]
  events: LifeEvent[]
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
