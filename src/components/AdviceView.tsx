import type { Persona } from '../types.ts'
import { visibleEntries } from '../lib/ledger.ts'
import { buildAdvice } from '../lib/recommendations.ts'
import { useLedger } from '../lib/store.tsx'
import { Panel } from './ui.tsx'

export function AdviceView({ persona }: { persona: Persona }) {
  const { state, setView } = useLedger()
  const cards = buildAdvice(state, visibleEntries(state, persona))
  const groups = {
    now: cards.filter((c) => c.priority === 'now'),
    soon: cards.filter((c) => c.priority === 'soon'),
    horizon: cards.filter((c) => c.priority === 'horizon'),
  }

  return (
    <div className="space-y-5 pb-24 md:pb-4">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-gold uppercase">Counsel</p>
        <h2 className="mt-1 font-display text-4xl font-light text-mist">What to do next</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Written for {state.profiles.kaylie.name} ({state.profiles.kaylie.age}) and {state.profiles.nefi.name} (
          {state.profiles.nefi.age}). It rewrites itself when you change money, ages, or events.
        </p>
      </div>

      <Group title="Do now" items={groups.now} onJump={setView} />
      <Group title="This season" items={groups.soon} onJump={setView} />
      <Group title="The long game" items={groups.horizon} onJump={setView} />
    </div>
  )
}

function Group({
  title,
  items,
  onJump,
}: {
  title: string
  items: ReturnType<typeof buildAdvice>
  onJump: (view: 'income' | 'events' | 'savings' | 'investments' | 'fun' | 'hustle' | 'loans' | 'cards' | 'cash') => void
}) {
  if (items.length === 0) return null
  return (
    <div className="space-y-3">
      <h3 className="font-display text-2xl text-mist">{title}</h3>
      {items.map((card) => (
        <Panel key={card.id}>
          <p className="text-[10px] tracking-[0.22em] text-gold uppercase">{card.priority}</p>
          <h4 className="mt-2 font-display text-2xl text-mist">{card.title}</h4>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-mute">{card.body}</p>
          <p className="mt-3 text-sm text-mist">
            <span className="text-gold">Why · </span>
            {card.why}
          </p>
          <p className="mt-2 text-sm text-mist">
            <span className="text-gold">Move · </span>
            {card.action}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Jump label="Income" onClick={() => onJump('income')} />
            <Jump label="Savings" onClick={() => onJump('savings')} />
            <Jump label="Invest" onClick={() => onJump('investments')} />
            <Jump label="Fun" onClick={() => onJump('fun')} />
            <Jump label="Hustle" onClick={() => onJump('hustle')} />
            <Jump label="Loans" onClick={() => onJump('loans')} />
            <Jump label="Cards" onClick={() => onJump('cards')} />
            <Jump label="In the bank" onClick={() => onJump('cash')} />
            <Jump label="Life" onClick={() => onJump('events')} />
          </div>
        </Panel>
      ))}
    </div>
  )
}

function Jump({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full border border-white/12 px-3 py-1 text-xs text-mute hover:text-mist">
      {label}
    </button>
  )
}
