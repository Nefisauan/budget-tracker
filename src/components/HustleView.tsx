import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import type { Hustle, HustleLineKind, Owner, Persona } from '../types.ts'
import { costSplit, hustleTotals, HUSTLE_CATEGORIES, linesFor, visibleHustleLines, visibleHustles } from '../lib/hustle.ts'
import { isoDate, pct, prettyDate, uid, usd } from '../lib/money.ts'
import { useLedger } from '../lib/store.tsx'
import { CategoryBars, SplitPie } from './Charts.tsx'
import { Button, Chip, Field, fieldClass, Panel } from './ui.tsx'

export function HustleView({ persona }: { persona: Persona }) {
  const { state, upsertHustle, removeHustle, addHustleLine, removeHustleLine } = useLedger()
  const hustles = visibleHustles(state, persona)
  const allLines = visibleHustleLines(state, persona)
  const grand = hustleTotals(allLines)
  const [activeId, setActiveId] = useState<string | null>(hustles[0]?.id ?? null)
  const active = hustles.find((h) => h.id === activeId) ?? hustles[0] ?? null
  const activeLines = active ? linesFor(state, active.id) : []
  const activeTot = hustleTotals(activeLines)
  const defaultOwner: Owner = persona === 'together' ? 'kaylie' : persona

  return (
    <div className="space-y-5 pb-24 md:pb-4">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-gold uppercase">Side hustle</p>
        <h2 className="mt-1 font-display text-4xl font-light text-mist">Costs and profits</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Name the gig, log what came in and what it cost. Profit is revenue minus costs — all time and this month — and it saves with the rest of the ledger.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Revenue</p>
          <p className="mt-2 font-display text-3xl text-teal">{usd(grand.revenue)}</p>
          <p className="mt-1 text-xs text-mute">{usd(grand.monthRevenue)} this month</p>
        </Panel>
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Costs</p>
          <p className="mt-2 font-display text-3xl text-rose">{usd(grand.cost)}</p>
          <p className="mt-1 text-xs text-mute">{usd(grand.monthCost)} this month</p>
        </Panel>
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Profit</p>
          <p className="mt-2 font-display text-3xl" style={{ color: grand.profit >= 0 ? '#e4c37a' : '#c56b86' }}>
            {usd(grand.profit)}
          </p>
          <p className="mt-1 text-xs text-mute">{usd(grand.monthProfit)} this month</p>
        </Panel>
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Margin</p>
          <p className="mt-2 font-display text-3xl text-mist">{pct(grand.margin)}</p>
          <p className="mt-1 text-xs text-mute">Profit ÷ revenue</p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Mix</p>
          <h3 className="mb-4 font-display text-2xl text-mist">In vs out</h3>
          <SplitPie
            data={[
              { key: 'rev', label: 'Revenue', value: grand.revenue, color: '#7ee7d6' },
              { key: 'cost', label: 'Costs', value: grand.cost, color: '#c56b86' },
            ].filter((d) => d.value > 0)}
          />
        </Panel>
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Where money leaves</p>
          <h3 className="mb-4 font-display text-2xl text-mist">Cost categories</h3>
          <CategoryBars data={costSplit(allLines)} />
        </Panel>
      </div>

      <Panel>
        <h3 className="mb-4 font-display text-xl text-mist">New hustle</h3>
        <HustleForm
          defaultOwner={defaultOwner}
          onSave={(h) => {
            upsertHustle(h)
            setActiveId(h.id)
          }}
        />
      </Panel>

      {hustles.length === 0 ? (
        <Panel>
          <p className="text-sm text-mute">No gigs yet. Add one above — freelance, resale, rides, whatever — then log sales and costs.</p>
        </Panel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {hustles.map((h) => {
            const t = hustleTotals(linesFor(state, h.id))
            const on = active?.id === h.id
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setActiveId(h.id)}
                className={`glass rounded-3xl p-5 text-left transition ${on ? 'border-gold/40' : ''}`}
              >
                <p className="text-[11px] tracking-[0.2em] text-mute uppercase">{h.owner}</p>
                <h3 className="mt-1 font-display text-2xl text-mist">{h.name}</h3>
                <p className="mt-3 text-sm text-mute">
                  In {usd(t.revenue)} · out {usd(t.cost)}
                </p>
                <p className="mt-1 font-display text-xl" style={{ color: t.profit >= 0 ? '#e4c37a' : '#c56b86' }}>
                  {usd(t.profit)} profit
                </p>
              </button>
            )
          })}
        </div>
      )}

      {active ? (
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] tracking-[0.2em] text-gold uppercase">{active.owner}</p>
              <h3 className="font-display text-2xl text-mist">{active.name}</h3>
              <p className="mt-1 text-sm text-mute">
                {usd(activeTot.revenue)} in · {usd(activeTot.cost)} out · {usd(activeTot.profit)} profit
                {activeTot.revenue > 0 ? ` · ${pct(activeTot.margin)} margin` : ''}
              </p>
            </div>
            <Button
              tone="ghost"
              onClick={() => {
                if (confirm(`Remove ${active.name} and its lines?`)) {
                  removeHustle(active.id)
                  setActiveId(null)
                }
              }}
            >
              Delete hustle
            </Button>
          </div>

          <h4 className="mt-6 mb-3 font-display text-xl text-mist">Log revenue or a cost</h4>
          <LineForm
            key={active.id}
            hustleId={active.id}
            onSave={(line) => addHustleLine(line)}
          />

          {activeLines.length === 0 ? (
            <p className="mt-6 text-sm text-mute">No lines yet. A sale, a supply run, a software bill — each one updates profit.</p>
          ) : (
            <ul className="mt-6 divide-y divide-white/8">
              {[...activeLines]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((line) => (
                  <li key={line.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-mist">{line.label}</p>
                      <p className="text-xs text-mute">
                        {prettyDate(line.date)} · {line.kind} · {line.category}
                      </p>
                    </div>
                    <p className="font-display text-lg" style={{ color: line.kind === 'revenue' ? '#7ee7d6' : '#c56b86' }}>
                      {line.kind === 'revenue' ? '+' : '−'}
                      {usd(line.amount)}
                    </p>
                    <button type="button" className="text-mute hover:text-rose" onClick={() => removeHustleLine(line.id)} aria-label="Delete">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      ) : null}
    </div>
  )
}

function HustleForm({
  defaultOwner,
  onSave,
}: {
  defaultOwner: Owner
  onSave: (hustle: Hustle) => void
}) {
  const [name, setName] = useState('')
  const [owner, setOwner] = useState<Owner>(defaultOwner)
  const [notes, setNotes] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ id: uid(), name: name.trim(), owner, notes: notes.trim() })
    setName('')
    setNotes('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Name">
        <input className={fieldClass()} value={name} onChange={(e) => setName(e.target.value)} placeholder="Freelance, resale, Uber…" required />
      </Field>
      <Field label="Whose">
        <div className="flex flex-wrap gap-2 pt-1">
          {(['kaylie', 'nefi', 'shared'] as Owner[]).map((o) => (
            <Chip key={o} active={owner === o} onClick={() => setOwner(o)}>
              {o}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Notes">
        <input className={fieldClass()} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </Field>
      <div className="flex items-end">
        <Button type="submit" className="w-full">
          Add hustle
        </Button>
      </div>
    </form>
  )
}

function LineForm({
  hustleId,
  onSave,
}: {
  hustleId: string
  onSave: (line: { id: string; hustleId: string; kind: HustleLineKind; category: string; label: string; amount: number; date: string; notes: string }) => void
}) {
  const [kind, setKind] = useState<HustleLineKind>('revenue')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(isoDate())
  const [category, setCategory] = useState<string>(HUSTLE_CATEGORIES.revenue[0])

  function submit(e: FormEvent) {
    e.preventDefault()
    const n = Number(amount)
    if (!label.trim() || !Number.isFinite(n) || n <= 0) return
    onSave({
      id: uid(),
      hustleId,
      kind,
      category,
      label: label.trim(),
      amount: n,
      date,
      notes: '',
    })
    setLabel('')
    setAmount('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Field label="Type">
        <div className="flex flex-wrap gap-2 pt-1">
          <Chip
            active={kind === 'revenue'}
            onClick={() => {
              setKind('revenue')
              setCategory(HUSTLE_CATEGORIES.revenue[0])
            }}
          >
            Revenue
          </Chip>
          <Chip
            active={kind === 'cost'}
            onClick={() => {
              setKind('cost')
              setCategory(HUSTLE_CATEGORIES.cost[0])
            }}
          >
            Cost
          </Chip>
        </div>
      </Field>
      <Field label="Label">
        <input className={fieldClass()} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={kind === 'revenue' ? 'Sold a print, paid gig…' : 'Supplies, ads, gas…'} required />
      </Field>
      <Field label="Amount">
        <input className={fieldClass()} type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </Field>
      <Field label="Date">
        <input className={fieldClass()} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </Field>
      <Field label="Category">
        <select className={fieldClass()} value={category} onChange={(e) => setCategory(e.target.value)}>
          {HUSTLE_CATEGORIES[kind].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex items-end lg:col-span-5">
        <Button type="submit">{kind === 'revenue' ? 'Log revenue' : 'Log cost'}</Button>
      </div>
    </form>
  )
}
