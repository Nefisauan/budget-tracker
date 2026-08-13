import { useState, type FormEvent } from 'react'
import type { FlowKind, MoneyEntry, Owner, Persona } from '../types.ts'
import { CATEGORIES, KIND_COPY, sumKind, visibleEntries } from '../lib/ledger.ts'
import { uid, usd } from '../lib/money.ts'
import { useLedger } from '../lib/store.tsx'
import { Button, Chip, Field, fieldClass, FormGrid, Panel } from './ui.tsx'
import { Pencil, Trash2 } from 'lucide-react'

export function FlowView({ persona, kind }: { persona: Persona; kind: FlowKind }) {
  const { state, upsertEntry, removeEntry } = useLedger()
  const copy = KIND_COPY[kind]
  const rows = visibleEntries(state, persona).filter((e) => e.kind === kind)
  const total = sumKind(rows, kind)
  const [editing, setEditing] = useState<MoneyEntry | null>(null)
  const defaultOwner: Owner = persona === 'together' ? (kind === 'income' ? 'kaylie' : 'shared') : persona

  return (
    <div className="space-y-5 pb-24 md:pb-4">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-gold uppercase">{copy.title}</p>
        <h2 className="mt-1 font-display text-4xl font-light text-mist">{copy.hint}</h2>
        <p className="mt-2 text-sm text-mute">
          Monthly total in this orbit: <span className="text-gold">{usd(total)}</span>
          {kind !== 'income' ? ` · ${usd(total * 12)} / year` : null}
        </p>
      </div>

      <Panel>
        <h3 className="mb-4 font-display text-xl text-mist">{editing ? 'Edit line' : copy.verb}</h3>
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
        <h3 className="mb-4 font-display text-xl text-mist">Ledger</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-mute">Nothing here yet. Add a line above — it saves instantly.</p>
        ) : (
          <ul className="divide-y divide-white/8">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-mist">{row.label}</p>
                  <p className="text-xs text-mute">
                    {row.category} · {row.owner}
                    {row.notes ? ` · ${row.notes}` : ''}
                  </p>
                </div>
                <p className="font-display text-lg text-gold">{usd(row.amount)}</p>
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
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[kind][0])
  const [owner, setOwner] = useState<Owner>(initial?.owner ?? defaultOwner)
  const [notes, setNotes] = useState(initial?.notes ?? '')

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
        <input className={fieldClass()} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Rent, Roth, date night…" required />
      </Field>
      <Field label="Monthly $">
        <input className={fieldClass()} type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
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
      <div className="sm:col-span-2 lg:col-span-3">
        <Field label="Notes">
          <input className={fieldClass()} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </Field>
      </div>
      <div className="flex items-end gap-2">
        <Button type="submit" tone="gold" className="w-full">
          {initial ? 'Save change' : 'Add to ledger'}
        </Button>
        {initial ? (
          <Button tone="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </FormGrid>
  )
}
