import { useState, type FormEvent } from 'react'
import type { Cadence, FlowKind, MoneyEntry, Owner, Persona } from '../types.ts'
import { sumActivity, visibleActivity } from '../lib/activity.ts'
import { CATEGORIES, KIND_COPY, sumKind, visibleEntries } from '../lib/ledger.ts'
import { CADENCES, cadenceLabel, isoDate, monthlyAmount, prettyDate, uid, usd } from '../lib/money.ts'
import { useLedger } from '../lib/store.tsx'
import { Button, Chip, Field, fieldClass, FormGrid, Panel } from './ui.tsx'
import { Pencil, Trash2 } from 'lucide-react'

export function FlowView({ persona, kind }: { persona: Persona; kind: FlowKind }) {
  const { state, upsertEntry, removeEntry, addActivity, removeActivity } = useLedger()
  const copy = KIND_COPY[kind]
  const rows = visibleEntries(state, persona).filter((e) => e.kind === kind)
  const held = visibleActivity(state, persona).filter((a) => a.kind === kind)
  const total = sumKind(rows, kind)
  const alreadyHave = sumActivity(held)
  const [editing, setEditing] = useState<MoneyEntry | null>(null)
  const defaultOwner: Owner = persona === 'together' ? (kind === 'income' ? 'kaylie' : 'shared') : persona
  const showBalance = kind === 'savings' || kind === 'investments'

  return (
    <div className="space-y-5 pb-24 md:pb-4">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-gold uppercase">{copy.title}</p>
        <h2 className="mt-1 font-display text-4xl font-light text-mist">{copy.hint}</h2>
        {showBalance ? (
          <p className="mt-2 text-sm text-mute">
            Already have <span className="text-gold">{usd(alreadyHave)}</span>
            {total > 0 ? ` · adding ${usd(total)} / month going forward` : ''}
          </p>
        ) : (
          <p className="mt-2 text-sm text-mute">
            Monthly run-rate in this orbit: <span className="text-gold">{usd(total)}</span>
            {` · ${usd(total * 12)} / year`}
          </p>
        )}
      </div>

      {showBalance ? (
        <Panel>
          <h3 className="mb-1 font-display text-xl text-mist">What you already have</h3>
          <p className="mb-4 text-sm text-mute">
            Roth, brokerage, HYSA, cash under the mattress — the balance sitting there today. This is a one-time log, not a monthly amount.
          </p>
          <BalanceForm kind={kind} defaultOwner={defaultOwner} onSave={(row) => addActivity(row)} />
          {held.length === 0 ? (
            <p className="mt-5 text-sm text-mute">Nothing logged yet. Example: “$4,200 in Kaylie’s Roth.”</p>
          ) : (
            <ul className="mt-5 divide-y divide-white/8">
              {held.map((row) => (
                <li key={row.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-mist">{row.label}</p>
                    <p className="text-xs text-mute">
                      {prettyDate(row.date)} · {row.category} · {row.owner}
                    </p>
                  </div>
                  <p className="font-display text-lg text-gold">{usd(row.amount)}</p>
                  <button type="button" className="text-mute hover:text-rose" onClick={() => removeActivity(row.id)} aria-label="Delete">
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}

      <Panel>
        <h3 className="mb-1 font-display text-xl text-mist">
          {showBalance ? (editing ? 'Edit recurring addition' : 'What you add on a schedule') : editing ? 'Edit line' : copy.verb}
        </h3>
        {showBalance ? (
          <p className="mb-4 text-sm text-mute">Only if you contribute every week / paycheck / month from here on.</p>
        ) : null}
        <EntryForm
          key={editing?.id ?? 'new'}
          kind={kind}
          defaultOwner={editing?.owner ?? defaultOwner}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(entry) => {
            upsertEntry(entry)
            setEditing(null)
          }}
        />
      </Panel>

      <Panel>
        <h3 className="mb-4 font-display text-xl text-mist">{showBalance ? 'Recurring ledger' : 'Ledger'}</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-mute">
            {showBalance ? 'No recurring additions yet. That’s fine — you can only log what you already have.' : 'Nothing here yet. Add a line above — it saves instantly.'}
          </p>
        ) : (
          <ul className="divide-y divide-white/8">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-mist">{row.label}</p>
                  <p className="text-xs text-mute">
                    {usd(row.amount)} {cadenceLabel(row.cadence).toLowerCase()} · {row.category} · {row.owner}
                    {row.notes ? ` · ${row.notes}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg text-gold">{usd(monthlyAmount(row))}</p>
                  <p className="text-[10px] tracking-wide text-mute uppercase">per month</p>
                </div>
                <button type="button" className="text-mute hover:text-mist" onClick={() => setEditing(row)} aria-label="Edit">
                  <Pencil size={15} />
                </button>
                <button type="button" className="text-mute hover:text-rose" onClick={() => removeEntry(row.id)} aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function BalanceForm({
  kind,
  defaultOwner,
  onSave,
}: {
  kind: FlowKind
  defaultOwner: Owner
  onSave: (row: {
    id: string
    date: string
    owner: Owner
    kind: FlowKind
    category: string
    label: string
    amount: number
    notes: string
  }) => void
}) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(isoDate())
  const [category, setCategory] = useState(CATEGORIES[kind][0])
  const [owner, setOwner] = useState<Owner>(defaultOwner)

  function submit(e: FormEvent) {
    e.preventDefault()
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return
    onSave({
      id: uid(),
      date,
      owner,
      kind,
      category,
      label: label.trim() || `Already have · ${CATEGORIES[kind][0]}`,
      amount: n,
      notes: 'Starting balance',
    })
    setLabel('')
    setAmount('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Where is it">
        <input
          className={fieldClass()}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={kind === 'investments' ? 'Roth IRA, brokerage…' : 'HYSA, wedding fund, emergency…'}
        />
      </Field>
      <Field label="How much is in there now">
        <input className={fieldClass()} type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </Field>
      <Field label="As of">
        <input className={fieldClass()} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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
      <div className="flex items-end">
        <Button type="submit" className="w-full">
          Log what I already have
        </Button>
      </div>
    </form>
  )
}

function EntryForm({
  kind,
  defaultOwner,
  initial,
  onSave,
  onCancel,
}: {
  kind: FlowKind
  defaultOwner: Owner
  initial: MoneyEntry | null
  onSave: (entry: MoneyEntry) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [cadence, setCadence] = useState<Cadence>(initial?.cadence ?? 'monthly')
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[kind][0])
  const [owner, setOwner] = useState<Owner>(initial?.owner ?? defaultOwner)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const preview = Number(amount)
  const monthly = Number.isFinite(preview) && preview >= 0 ? monthlyAmount({ amount: preview, cadence }) : 0

  function submit(e: FormEvent) {
    e.preventDefault()
    const n = Number(amount)
    if (!label.trim() || !Number.isFinite(n) || n < 0) return
    onSave({
      id: initial?.id ?? uid(),
      owner,
      kind,
      category,
      label: label.trim(),
      amount: n,
      cadence,
      notes: notes.trim(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    if (!initial) {
      setLabel('')
      setAmount('')
      setNotes('')
    }
  }

  return (
    <FormGrid onSubmit={submit}>
      <Field label="Label">
        <input
          className={fieldClass()}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={kind === 'income' ? 'Day job, side hustle…' : 'Rent, Roth, date night…'}
          required
        />
      </Field>
      <Field label={kind === 'income' ? 'How much' : 'Amount $'}>
        <input className={fieldClass()} type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </Field>
      <div className="sm:col-span-2">
        <Field label="How often">
          <div className="flex flex-wrap gap-2 pt-1">
            {CADENCES.map((c) => (
              <Chip key={c.id} active={cadence === c.id} onClick={() => setCadence(c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </Field>
      </div>
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
      <div className="sm:col-span-2 lg:col-span-2">
        <Field label="Notes">
          <input className={fieldClass()} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </Field>
      </div>
      <div className="flex flex-col justify-end gap-2 sm:col-span-2 lg:col-span-2">
        {amount ? (
          <p className="text-xs text-mute">
            {usd(preview)} {cadenceLabel(cadence).toLowerCase()} → <span className="text-gold">{usd(monthly)} / month</span>
            {` · ${usd(monthly * 12)} / year`}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" tone="gold" className="w-full">
            {initial ? 'Save change' : 'Add recurring'}
          </Button>
          {initial ? (
            <Button tone="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </FormGrid>
  )
}
