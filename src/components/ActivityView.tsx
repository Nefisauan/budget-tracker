import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import type { Activity, FlowKind, Owner, Persona } from '../types.ts'
import { CATEGORIES, KIND_COPY } from '../lib/ledger.ts'
import { groupWeeks, sumActivity, thisMonth, visibleActivity, weekChart } from '../lib/activity.ts'
import { isoDate, prettyDate, uid, usd } from '../lib/money.ts'
import { useLedger } from '../lib/store.tsx'
import { WeekBars } from './Charts.tsx'
import { Button, Chip, Field, fieldClass, Panel } from './ui.tsx'

const KINDS: FlowKind[] = ['income', 'spend', 'fun', 'savings', 'investments']

export function ActivityView({ persona }: { persona: Persona }) {
  const { state, addActivity, removeActivity } = useLedger()
  const rows = visibleActivity(state, persona)
  const weeks = groupWeeks(rows)
  const invested = sumActivity(rows, 'investments')
  const saved = sumActivity(rows, 'savings')
  const investedMonth = thisMonth(rows.filter((a) => a.kind === 'investments'))
  const defaultOwner: Owner = persona === 'together' ? 'kaylie' : persona

  return (
    <div className="space-y-5 pb-24 md:pb-4">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-gold uppercase">Activity</p>
        <h2 className="mt-1 font-display text-4xl font-light text-mist">What actually happened</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Recurring lines are the plan. This log is real deposits — this week, last week, three weeks ago — and they add up.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Invested all time</p>
          <p className="mt-2 font-display text-3xl text-gold">{usd(invested)}</p>
          <p className="mt-1 text-xs text-mute">{usd(investedMonth)} this month</p>
        </Panel>
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Saved all time</p>
          <p className="mt-2 font-display text-3xl text-teal">{usd(saved)}</p>
          <p className="mt-1 text-xs text-mute">Wedding + emergency + the rest</p>
        </Panel>
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Logged moves</p>
          <p className="mt-2 font-display text-3xl text-mist">{rows.length}</p>
          <p className="mt-1 text-xs text-mute">{weeks.length} weeks on record</p>
        </Panel>
      </div>

      <Panel>
        <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Last 8 weeks</p>
        <h3 className="mb-4 font-display text-2xl text-mist">Saved + invested</h3>
        <WeekBars data={weekChart(rows)} />
      </Panel>

      <Panel>
        <h3 className="mb-4 font-display text-xl text-mist">Log something that happened</h3>
        <LogForm
          defaultOwner={defaultOwner}
          onSave={(row) => addActivity(row)}
        />
      </Panel>

      {weeks.length === 0 ? (
        <Panel>
          <p className="text-sm text-mute">
            Nothing dated yet. Log a paycheck split from This check, or add a line above — “invested $200 last Tuesday.”
          </p>
        </Panel>
      ) : (
        weeks.map((week) => (
          <Panel key={week.start}>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[11px] tracking-[0.2em] text-gold uppercase">{week.label}</p>
                <h3 className="font-display text-2xl text-mist">{week.range}</h3>
              </div>
              <p className="text-sm text-mute">
                Invested {usd(week.investments)} · saved {usd(week.savings)}
              </p>
            </div>
            <ul className="mt-4 divide-y divide-white/8">
              {week.rows.map((row) => (
                <li key={row.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-mist">{row.label}</p>
                    <p className="text-xs text-mute">
                      {prettyDate(row.date)} · {KIND_COPY[row.kind].title} · {row.category} · {row.owner}
                    </p>
                  </div>
                  <p className="font-display text-lg text-gold">{usd(row.amount)}</p>
                  <button type="button" className="text-mute hover:text-rose" onClick={() => removeActivity(row.id)} aria-label="Delete">
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        ))
      )}
    </div>
  )
}

function LogForm({
  defaultOwner,
  onSave,
}: {
  defaultOwner: Owner
  onSave: (row: Activity) => void
}) {
  const [date, setDate] = useState(isoDate())
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<FlowKind>('investments')
  const [category, setCategory] = useState(CATEGORIES.investments[0])
  const [owner, setOwner] = useState<Owner>(defaultOwner)
  const [label, setLabel] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0 || !date) return
    onSave(buildRow(date, owner, kind, category, label, n))
    setAmount('')
    setLabel('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="When">
        <input className={fieldClass()} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </Field>
      <Field label="Amount">
        <input className={fieldClass()} type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </Field>
      <Field label="What">
        <select
          className={fieldClass()}
          value={kind}
          onChange={(e) => {
            const next = e.target.value as FlowKind
            setKind(next)
            setCategory(CATEGORIES[next][0])
          }}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_COPY[k].title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Category">
        <select className={fieldClass()} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES[kind].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
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
      <Field label="Label">
        <input className={fieldClass()} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Roth, wedding HYSA…" />
      </Field>
      <div className="flex items-end">
        <Button type="submit" className="w-full">
          Add to history
        </Button>
      </div>
    </form>
  )
}

function buildRow(date: string, owner: Owner, kind: FlowKind, category: string, label: string, amount: number) {
  return {
    id: uid(),
    date,
    owner,
    kind,
    category,
    label: label.trim() || `${KIND_COPY[kind].title} · ${prettyDate(date)}`,
    amount,
    notes: '',
  }
}
