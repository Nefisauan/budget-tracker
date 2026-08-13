import {
  Banknote,
  CalendarHeart,
  Coins,
  Compass,
  Download,
  Landmark,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Sparkles,
  Upload,
  Wallet,
} from 'lucide-react'
import { useRef } from 'react'
import type { Persona, View } from '../types.ts'
import { useLedger } from '../lib/store.tsx'
import { Button } from './ui.tsx'
import { Dashboard } from './Dashboard.tsx'
import { FlowView } from './FlowView.tsx'
import { EventsView } from './EventsView.tsx'
import { AdviceView } from './AdviceView.tsx'
import { PaycheckView } from './PaycheckView.tsx'

const NAV: { id: View; label: string; icon: typeof Wallet }[] = [
  { id: 'dashboard', label: 'Observatory', icon: LayoutDashboard },
  { id: 'paycheck', label: 'This check', icon: Banknote },
  { id: 'income', label: 'Income', icon: Wallet },
  { id: 'spend', label: 'Needs', icon: Landmark },
  { id: 'fun', label: 'Fun', icon: Sparkles },
  { id: 'savings', label: 'Savings', icon: PiggyBank },
  { id: 'investments', label: 'Invest', icon: Coins },
  { id: 'events', label: 'Life', icon: CalendarHeart },
  { id: 'advice', label: 'Counsel', icon: Compass },
]

export function Shell() {
  const { session, setView, exit, state, loadDemo, exportJson, importJson } = useLedger()
  const fileRef = useRef<HTMLInputElement>(null)
  if (!session) return null
  const persona = session.persona
  const who =
    persona === 'together'
      ? 'Together'
      : persona === 'kaylie'
        ? state.profiles.kaylie.name
        : state.profiles.nefi.name

  function download() {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'orbit-ledger.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="aurora min-h-dvh">
      <div className="mx-auto flex max-w-[1400px] gap-0 md:gap-6 md:px-6 md:py-6">
        <aside className="glass sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col rounded-none p-5 md:flex md:h-[calc(100dvh-48px)] md:rounded-[2rem]">
          <p className="text-[11px] tracking-[0.3em] text-gold uppercase">Orbit</p>
          <h1 className="mt-2 font-display text-3xl font-light text-mist">{who}</h1>
          <p className="mt-1 text-xs text-mute">
            {persona === 'together'
              ? `${state.profiles.kaylie.age} & ${state.profiles.nefi.age}`
              : `${state.profiles[persona].age} · ${state.profiles[persona].tagline}`}
          </p>
          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {NAV.map((item) => {
              const Icon = item.icon
              const on = session.view === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                    on ? 'bg-white/10 text-gold' : 'text-mute hover:bg-white/5 hover:text-mist'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              )
            })}
          </nav>
          <div className="space-y-2">
            <Button tone="ghost" className="w-full" onClick={loadDemo}>
              Load sample numbers
            </Button>
            <div className="flex gap-2">
              <Button tone="ghost" className="flex-1" onClick={download}>
                <span className="inline-flex items-center gap-1">
                  <Download size={14} /> Save
                </span>
              </Button>
              <Button tone="ghost" className="flex-1" onClick={() => fileRef.current?.click()}>
                <span className="inline-flex items-center gap-1">
                  <Upload size={14} /> Load
                </span>
              </Button>
            </div>
            <button type="button" onClick={exit} className="flex w-full items-center justify-center gap-2 pt-2 text-xs text-mute hover:text-mist">
              <LogOut size={12} /> Switch profile
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 md:px-0 md:py-0">
          <header className="mb-5 flex items-center justify-between md:hidden">
            <div>
              <p className="text-[10px] tracking-[0.3em] text-gold uppercase">Orbit</p>
              <p className="font-display text-2xl text-mist">{who}</p>
            </div>
            <button type="button" onClick={exit} className="text-xs text-mute">
              Switch
            </button>
          </header>
          <ViewBody view={session.view} persona={persona} />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-white/10 bg-[#07070c]/90 px-2 py-2 backdrop-blur md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon
          const on = session.view === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`flex min-w-[72px] flex-1 flex-col items-center gap-1 px-1 py-1 text-[10px] ${on ? 'text-gold' : 'text-mute'}`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          void file.text().then((t) => importJson(t))
          e.target.value = ''
        }}
      />
    </div>
  )
}

function ViewBody({ view, persona }: { view: View; persona: Persona }) {
  if (view === 'dashboard') return <Dashboard persona={persona} />
  if (view === 'paycheck') return <PaycheckView persona={persona} />
  if (view === 'income') return <FlowView persona={persona} kind="income" />
  if (view === 'spend') return <FlowView persona={persona} kind="spend" />
  if (view === 'fun') return <FlowView persona={persona} kind="fun" />
  if (view === 'savings') return <FlowView persona={persona} kind="savings" />
  if (view === 'investments') return <FlowView persona={persona} kind="investments" />
  if (view === 'events') return <EventsView />
  return <AdviceView persona={persona} />
}
