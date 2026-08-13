import { useState, type FormEvent } from 'react'
import type { EventKind, LifeEvent } from '../types.ts'
import { riskPosture } from '../lib/ledger.ts'
import { monthsUntil, prettyDate, uid, usd } from '../lib/money.ts'
import { useLedger } from '../lib/store.tsx'
import { Button, Field, fieldClass, Panel } from './ui.tsx'

const KINDS: EventKind[] = ['wedding', 'travel', 'home', 'career', 'family', 'celebration', 'other']

export function EventsView() {
  const { state, setAge, setTagline, upsertEvent, removeEvent, reset } = useLedger()
  const [editing, setEditing] = useState<LifeEvent | null>(null)
  const age = Math.min(state.profiles.kaylie.age, state.profiles.nefi.age)
  const risk = riskPosture(age)
  const events = [...state.events].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-5 pb-24 md:pb-4">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-gold uppercase">Life</p>
        <h2 className="mt-1 font-display text-4xl font-light text-mist">Ages, events, risk</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Counsel reads this page. Younger money can take more heat. A wedding next year cannot.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AgeCard
          name={state.profiles.kaylie.name}
          age={state.profiles.kaylie.age}
          tagline={state.profiles.kaylie.tagline}
          accent="#f0b7c8"
          onAge={(n) => setAge('kaylie', n)}
          onTagline={(t) => setTagline('kaylie', t)}
        />
        <AgeCard
          name={state.profiles.nefi.name}
          age={state.profiles.nefi.age}
          tagline={state.profiles.nefi.tagline}
          accent="#7ee7d6"
          onAge={(n) => setAge('nefi', n)}
          onTagline={(t) => setTagline('nefi', t)}
        />
      </div>

      <Panel>
        <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Derived posture</p>
        <h3 className="mt-1 font-display text-3xl text-gold">{risk.label}</h3>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          ~{risk.equity}% equities for long-horizon dollars. {risk.blurb}
        </p>
      </Panel>

      <Panel>
        <h3 className="mb-4 font-display text-xl text-mist">{editing ? 'Edit event' : 'Add an event'}</h3>
        <EventForm
          key={editing?.id ?? 'new'}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(event) => {
            upsertEvent(event)
            setEditing(null)
          }}
        />
      </Panel>

      <Panel>
        <h3 className="mb-4 font-display text-xl text-mist">Timeline</h3>
        {events.length === 0 ? (
          <p className="text-sm text-mute">No events yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-gold/30 pl-6">
            {events.map((event) => {
              const m = monthsUntil(event.date)
              return (
                <li key={event.id}>
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-gold" />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-mist">
                        {event.title}{' '}
                        <span className="text-xs tracking-[0.16em] text-mute uppercase">{event.kind}</span>
                      </p>
                      <p className="text-sm text-mute">
                        {prettyDate(event.date)}
                        {m > 0 ? ` · ${Math.max(1, Math.round(m))} months` : ' · date has passed'}
                        {event.estimatedCost > 0 ? ` · ${usd(event.estimatedCost)}` : ''}
                      </p>
                      {event.notes ? <p className="mt-1 text-sm text-mute">{event.notes}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button tone="ghost" onClick={() => setEditing(event)}>
                        Edit
                      </Button>
                      <Button tone="ghost" onClick={() => removeEvent(event.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Panel>

      <Panel>
        <h3 className="font-display text-xl text-mist">Reset</h3>
        <p className="mt-2 text-sm text-mute">Clears money lines and restores the starter wedding event. Export a backup first if you care.</p>
        <Button
          tone="ghost"
          className="mt-4"
          onClick={() => {
            if (confirm('Reset the ledger on this device?')) reset()
          }}
        >
          Reset ledger
        </Button>
      </Panel>
    </div>
  )
}

function AgeCard({
  name,
  age,
  tagline,
  accent,
  onAge,
  onTagline,
}: {
  name: string
  age: number
  tagline: string
  accent: string
  onAge: (n: number) => void
  onTagline: (t: string) => void
}) {
  return (
    <Panel>
      <p className="text-[11px] tracking-[0.2em] uppercase" style={{ color: accent }}>
        {name}
      </p>
      <Field label="Age">
        <input
          className={fieldClass()}
          type="number"
          min={16}
          max={100}
          value={age}
          onChange={(e) => onAge(Number(e.target.value) || age)}
        />
      </Field>
      <div className="mt-3">
        <Field label="Tagline">
          <input className={fieldClass()} value={tagline} onChange={(e) => onTagline(e.target.value)} />
        </Field>
      </div>
    </Panel>
  )
}

function EventForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: LifeEvent | null
  onSave: (event: LifeEvent) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [date, setDate] = useState(initial?.date ?? '')
  const [kind, setKind] = useState<EventKind>(initial?.kind ?? 'wedding')
  const [cost, setCost] = useState(initial ? String(initial.estimatedCost) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    onSave({
      id: initial?.id ?? uid(),
      title: title.trim(),
      date,
      kind,
      estimatedCost: Number(cost) || 0,
      notes: notes.trim(),
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
      <Field label="Title">
        <input className={fieldClass()} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Our wedding" required />
      </Field>
      <Field label="Date">
        <input className={fieldClass()} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </Field>
      <Field label="Kind">
        <select className={fieldClass()} value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Estimated cost">
        <input className={fieldClass()} type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
      </Field>
      <div className="md:col-span-2">
        <Field label="Notes">
          <input className={fieldClass()} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit">{initial ? 'Save event' : 'Add event'}</Button>
        {initial ? (
          <Button tone="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}
