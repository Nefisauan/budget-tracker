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
  Hustle,
  HustleLine,
  LedgerState,
  LifeEvent,
  MoneyEntry,
  Persona,
  Session,
  View,
} from '../types.ts'
import { demoLedger, emptyLedger } from './ledger.ts'

const LEDGER_KEY = 'orbit-ledger-v1'
const SESSION_KEY = 'orbit-session-v1'

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
      events: Array.isArray(parsed.events)
        ? parsed.events.map((e) =>
            e.kind === 'wedding' && e.estimatedCost === 25000 ? { ...e, estimatedCost: 20000 } : e,
          )
        : [],
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
      addActivity: (row) => setState((s) => ({ ...s, activity: [row, ...s.activity] })),
      addActivities: (rows) =>
        setState((s) => ({ ...s, activity: [...rows, ...s.activity] })),
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
      addHustleLine: (line) => setState((s) => ({ ...s, hustleLines: [line, ...s.hustleLines] })),
      removeHustleLine: (id) =>
        setState((s) => ({ ...s, hustleLines: s.hustleLines.filter((l) => l.id !== id) })),
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
          events: (parsed.events ?? []).map((e) =>
            e.kind === 'wedding' && e.estimatedCost === 25000 ? { ...e, estimatedCost: 20000 } : e,
          ),
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
