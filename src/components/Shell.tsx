import {
  Banknote,
  Briefcase,
  CalendarHeart,
  Coins,
  Compass,
  CreditCard,
  Download,
  History,
  Landmark,
  LayoutDashboard,
  Scale,
  LogOut,
  MoreHorizontal,
  PiggyBank,
  Sparkles,
  University,
  Upload,
  Wallet,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { Persona, View } from '../types.ts'
import { useLedger } from '../lib/store.tsx'
import { Button } from './ui.tsx'
import { Dashboard } from './Dashboard.tsx'
import { FlowView } from './FlowView.tsx'
import { EventsView } from './EventsView.tsx'
import { AdviceView } from './AdviceView.tsx'
import { PaycheckView } from './PaycheckView.tsx'
import { ActivityView } from './ActivityView.tsx'
import { HustleView } from './HustleView.tsx'
import { LoanView } from './LoanView.tsx'
import { CardView } from './CardView.tsx'
import { CashView } from './CashView.tsx'

const NAV_GROUPS: { label: string; items: { id: View; label: string; icon: typeof Wallet }[] }[] = [
  {
    label: 'Today',
    items: [
      { id: 'dashboard', label: 'Observatory', icon: LayoutDashboard },
      { id: 'cash', label: 'In the bank', icon: University },
      { id: 'paycheck', label: 'This check', icon: Banknote },
      { id: 'activity', label: 'Activity', icon: History },
    ],
  },
  {
    label: 'Money',
    items: [
      { id: 'income', label: 'Income', icon: Wallet },
      { id: 'spend', label: 'Needs', icon: Landmark },
      { id: 'fun', label: 'Fun', icon: Sparkles },
      { id: 'savings', label: 'Savings', icon: PiggyBank },
      { id: 'investments', label: 'Invest', icon: Coins },
      { id: 'hustle', label: 'Hustle', icon: Briefcase },
    ],
  },
  {
    label: 'Balances',
    items: [
      { id: 'loans', label: 'Loans', icon: Scale },
      { id: 'cards', label: 'Cards', icon: CreditCard },
    ],
  },
  {
    label: 'Ahead',
    items: [
      { id: 'events', label: 'Life', icon: CalendarHeart },
      { id: 'advice', label: 'Counsel', icon: Compass },
    ],
  },
]

const NAV = NAV_GROUPS.flatMap((g) => g.items)
const MOBILE_PRIMARY: View[] = ['dashboard', 'cash', 'paycheck', 'activity']

export function Shell() {
  const { session, setView, exit, state, loadDemo, reset, exportJson, importJson } = useLedger()
  const fileRef = useRef<HTMLInputElement>(null)
  const [moreOpen, setMoreOpen] = useState(false)
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

  function go(view: View) {
    setView(view)
    setMoreOpen(false)
  }

  return (
    <div className="aurora min-h-dvh">
      <div className="mx-auto flex max-w-[1400px] gap-0 md:gap-6 md:px-6 md:py-6">
        <aside className="glass sticky top-6 hidden h-[calc(100dvh-48px)] w-[252px] shrink-0 flex-col overflow-hidden rounded-[2rem] md:flex">
          <div className="shrink-0 border-b border-white/8 px-5 pb-4 pt-5">
            <p className="text-[11px] tracking-[0.3em] text-gold uppercase">Orbit</p>
            <h1 className="mt-2 font-display text-3xl font-light text-mist">{who}</h1>
            <p className="mt-1 text-xs text-mute">
              {persona === 'together'
                ? `${state.profiles.kaylie.age} & ${state.profiles.nefi.age}`
                : `${state.profiles[persona].age} · ${state.profiles[persona].tagline}`}
            </p>
            <button
              type="button"
              onClick={exit}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3 py-2 text-sm text-gold transition hover:bg-gold/20"
            >
              <LogOut size={14} />
              Change profile
            </button>
          </div>

          <nav className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="px-3 pb-1 pt-1 text-[10px] tracking-[0.22em] text-mute/80 uppercase">{group.label}</p>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const on = session.view === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setView(item.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-1.5 text-left text-[13px] transition ${
                        on ? 'bg-white/10 text-gold' : 'text-mute hover:bg-white/5 hover:text-mist'
                      }`}
                    >
                      <Icon size={15} />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className="shrink-0 space-y-2 border-t border-white/8 px-4 py-3">
            <div className="flex gap-2">
              <Button tone="ghost" className="flex-1 px-2 py-1.5 text-xs" onClick={download}>
                <span className="inline-flex items-center gap-1">
                  <Download size={13} /> Save
                </span>
              </Button>
              <Button tone="ghost" className="flex-1 px-2 py-1.5 text-xs" onClick={() => fileRef.current?.click()}>
                <span className="inline-flex items-center gap-1">
                  <Upload size={13} /> Load
                </span>
              </Button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={loadDemo} className="flex-1 text-left text-[11px] text-mute hover:text-mist">
                Sample
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Start over? This clears every logged number on this device.')) reset()
                }}
                className="text-[11px] text-mute hover:text-rose"
              >
                Start over
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 md:px-0 md:py-0">
          <header className="mb-5 flex items-center justify-between gap-3 md:hidden">
            <div>
              <p className="text-[10px] tracking-[0.3em] text-gold uppercase">Orbit</p>
              <p className="font-display text-2xl text-mist">{who}</p>
            </div>
            <button
              type="button"
              onClick={exit}
              className="rounded-full border border-gold/35 bg-gold/10 px-3 py-2 text-xs text-gold"
            >
              Change profile
            </button>
          </header>
          <ViewBody view={session.view} persona={persona} />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#07070c]/90 px-2 py-2 backdrop-blur md:hidden">
        <div className="flex">
          {NAV.filter((item) => MOBILE_PRIMARY.includes(item.id)).map((item) => {
            const Icon = item.icon
            const on = session.view === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1 text-[10px] ${on ? 'text-gold' : 'text-mute'}`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1 text-[10px] ${moreOpen ? 'text-gold' : 'text-mute'}`}
          >
            <MoreHorizontal size={16} />
            More
          </button>
        </div>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close menu" onClick={() => setMoreOpen(false)} />
          <div className="glass absolute inset-x-0 bottom-0 max-h-[70dvh] overflow-y-auto rounded-t-3xl p-5 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] tracking-[0.22em] text-gold uppercase">More</p>
              <button type="button" onClick={() => setMoreOpen(false)} className="text-sm text-mute">
                Close
              </button>
            </div>
            <button
              type="button"
              onClick={exit}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3 py-2.5 text-sm text-gold"
            >
              <LogOut size={14} />
              Change profile
            </button>
            {NAV.filter((item) => !MOBILE_PRIMARY.includes(item.id)).map((item) => {
              const Icon = item.icon
              const on = session.view === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                    on ? 'bg-white/10 text-gold' : 'text-mist'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

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
  if (view === 'cash') return <CashView persona={persona} />
  if (view === 'paycheck') return <PaycheckView persona={persona} />
  if (view === 'activity') return <ActivityView persona={persona} />
  if (view === 'hustle') return <HustleView persona={persona} />
  if (view === 'loans') return <LoanView persona={persona} />
  if (view === 'cards') return <CardView persona={persona} />
  if (view === 'income') return <FlowView persona={persona} kind="income" />
  if (view === 'spend') return <FlowView persona={persona} kind="spend" />
  if (view === 'fun') return <FlowView persona={persona} kind="fun" />
  if (view === 'savings') return <FlowView persona={persona} kind="savings" />
  if (view === 'investments') return <FlowView persona={persona} kind="investments" />
  if (view === 'events') return <EventsView />
  return <AdviceView persona={persona} />
}
