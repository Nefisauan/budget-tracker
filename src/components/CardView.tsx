import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import type { CardAccount, LoanLineKind, Owner, Persona } from '../types.ts'
import { cardSummary, cardTotals, linesForCard, visibleCards } from '../lib/card.ts'
import { isoDate, pct, prettyDate, uid, usd } from '../lib/money.ts'
import { useLedger } from '../lib/store.tsx'
import { Button, Chip, Field, fieldClass, Panel } from './ui.tsx'

export function CardView({ persona }: { persona: Persona }) {
  const { state, upsertCard, removeCard, addCardLine, removeCardLine } = useLedger()
  const cards = visibleCards(state, persona)
  const summary = cardSummary(state, persona)
  const [activeId, setActiveId] = useState<string | null>(cards[0]?.id ?? null)
  const active = cards.find((c) => c.id === activeId) ?? cards[0] ?? null
  const activeLines = active ? linesForCard(state, active.id) : []
  const tot = active ? cardTotals(active, activeLines) : null
  const defaultOwner: Owner = persona === 'together' ? 'kaylie' : persona

  function pay(amount: number, label: string) {
    if (!active || amount <= 0) return
    addCardLine({
      id: uid(),
      cardId: active.id,
      kind: 'payment',
      amount: Math.round(amount),
      date: isoDate(),
      label,
      notes: '',
    })
  }

  return (
    <div className="space-y-5 pb-24 md:pb-4">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-gold uppercase">Credit cards</p>
        <h2 className="mt-1 font-display text-4xl font-light text-mist">Balances and payments</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Add what you already owe on a card. Then log each payment. Pay in full, pay the minimum, or type an amount — the balance only moves when you log it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Card balances</p>
          <p className="mt-2 font-display text-3xl text-rose">{usd(summary.remaining)}</p>
        </Panel>
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Paid this month</p>
          <p className="mt-2 font-display text-3xl text-teal">{usd(summary.paidThisMonth)}</p>
        </Panel>
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Paid all time</p>
          <p className="mt-2 font-display text-3xl text-mist">{usd(summary.paid)}</p>
        </Panel>
      </div>

      <Panel>
        <h3 className="mb-4 font-display text-xl text-mist">Add a card you already have</h3>
        <NewCardForm
          defaultOwner={defaultOwner}
          onSave={(card) => {
            upsertCard(card)
            setActiveId(card.id)
          }}
        />
      </Panel>

      {cards.length === 0 ? (
        <Panel>
          <p className="text-sm text-mute">No cards yet. Add the current statement balance, then log payments as you make them.</p>
        </Panel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {cards.map((card) => {
            const t = cardTotals(card, linesForCard(state, card.id))
            const on = active?.id === card.id
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveId(card.id)}
                className={`glass rounded-3xl p-5 text-left transition ${on ? 'border-gold/40' : ''}`}
              >
                <p className="text-[11px] tracking-[0.2em] text-mute uppercase">{card.owner}</p>
                <h3 className="mt-1 font-display text-2xl text-mist">{card.name}</h3>
                <p className="mt-3 font-display text-xl text-rose">{usd(t.remaining)} owed</p>
                <p className="mt-1 text-sm text-mute">
                  {card.limit > 0 ? `${pct(t.utilization)} of ${usd(card.limit)} limit` : `Paid ${usd(t.paid)}`}
                  {card.dueDay > 0 ? ` · due the ${card.dueDay}` : ''}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {active && tot ? (
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] tracking-[0.2em] text-gold uppercase">{active.owner}</p>
              <h3 className="font-display text-2xl text-mist">{active.name}</h3>
              <p className="mt-1 text-sm text-mute">
                {usd(tot.remaining)} remaining
                {active.rate > 0 ? ` · ${active.rate}% APR` : ''}
                {active.minPayment > 0 ? ` · min ${usd(active.minPayment)}` : ''}
                {active.dueDay > 0 ? ` · due day ${active.dueDay}` : ''}
              </p>
            </div>
            <Button
              tone="ghost"
              onClick={() => {
                if (confirm(`Remove ${active.name}?`)) {
                  removeCard(active.id)
                  setActiveId(null)
                }
              }}
            >
              Delete card
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={() => pay(tot.remaining, 'Paid in full')}
              className={tot.remaining <= 0 ? 'pointer-events-none opacity-40' : ''}
            >
              Pay in full · {usd(tot.remaining)}
            </Button>
            {active.minPayment > 0 ? (
              <Button tone="ghost" onClick={() => pay(Math.min(active.minPayment, tot.remaining), 'Minimum payment')}>
                Pay minimum · {usd(active.minPayment)}
              </Button>
            ) : null}
          </div>

          <h4 className="mt-6 mb-3 font-display text-xl text-mist">Log a payment or new charge</h4>
          <CardLineForm key={active.id} cardId={active.id} onSave={(line) => addCardLine(line)} />

          {activeLines.length === 0 ? (
            <p className="mt-6 text-sm text-mute">No payments yet. When you pay the card, log it here.</p>
          ) : (
            <ul className="mt-6 divide-y divide-white/8">
              {[...activeLines]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((line) => (
                  <li key={line.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-mist">{line.label}</p>
                      <p className="text-xs text-mute">
                        {prettyDate(line.date)} · {line.kind}
                      </p>
                    </div>
                    <p className="font-display text-lg" style={{ color: line.kind === 'payment' ? '#7ee7d6' : '#c56b86' }}>
                      {line.kind === 'payment' ? '−' : '+'}
                      {usd(line.amount)}
                    </p>
                    <button type="button" className="text-mute hover:text-rose" onClick={() => removeCardLine(line.id)} aria-label="Delete">
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

function NewCardForm({
  defaultOwner,
  onSave,
}: {
  defaultOwner: Owner
  onSave: (card: CardAccount) => void
}) {
  const [name, setName] = useState('')
  const [owner, setOwner] = useState<Owner>(defaultOwner)
  const [startBalance, setStartBalance] = useState('')
  const [limit, setLimit] = useState('')
  const [rate, setRate] = useState('')
  const [minPayment, setMinPayment] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [startDate, setStartDate] = useState(isoDate())

  function submit(e: FormEvent) {
    e.preventDefault()
    const bal = Number(startBalance)
    if (!name.trim() || !Number.isFinite(bal) || bal < 0) return
    onSave({
      id: uid(),
      name: name.trim(),
      owner,
      startBalance: bal,
      limit: Number(limit) || 0,
      rate: Number(rate) || 0,
      minPayment: Number(minPayment) || 0,
      dueDay: Number(dueDay) || 0,
      startDate,
      notes: '',
    })
    setName('')
    setStartBalance('')
    setLimit('')
    setRate('')
    setMinPayment('')
    setDueDay('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Card name">
        <input className={fieldClass()} value={name} onChange={(e) => setName(e.target.value)} placeholder="Chase, Amex, Apple Card…" required />
      </Field>
      <Field label="What I owe now">
        <input className={fieldClass()} type="number" min="0" step="1" value={startBalance} onChange={(e) => setStartBalance(e.target.value)} required />
      </Field>
      <Field label="As of">
        <input className={fieldClass()} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </Field>
      <Field label="Credit limit">
        <input className={fieldClass()} type="number" min="0" step="1" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="Optional" />
      </Field>
      <Field label="APR %">
        <input className={fieldClass()} type="number" min="0" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Optional" />
      </Field>
      <Field label="Min payment">
        <input className={fieldClass()} type="number" min="0" step="1" value={minPayment} onChange={(e) => setMinPayment(e.target.value)} placeholder="Optional" />
      </Field>
      <Field label="Due day (1–28)">
        <input className={fieldClass()} type="number" min="1" max="28" value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="Optional" />
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
          Add card
        </Button>
      </div>
    </form>
  )
}

function CardLineForm({
  cardId,
  onSave,
}: {
  cardId: string
  onSave: (line: {
    id: string
    cardId: string
    kind: LoanLineKind
    amount: number
    date: string
    label: string
    notes: string
  }) => void
}) {
  const [kind, setKind] = useState<LoanLineKind>('payment')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(isoDate())
  const [label, setLabel] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return
    onSave({
      id: uid(),
      cardId,
      kind,
      amount: n,
      date,
      label: label.trim() || (kind === 'payment' ? 'Card payment' : 'New charge'),
      notes: '',
    })
    setAmount('')
    setLabel('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Type">
        <div className="flex flex-wrap gap-2 pt-1">
          <Chip active={kind === 'payment'} onClick={() => setKind('payment')}>
            Payment
          </Chip>
          <Chip active={kind === 'charge'} onClick={() => setKind('charge')}>
            New charge
          </Chip>
        </div>
      </Field>
      <Field label="Amount">
        <input className={fieldClass()} type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </Field>
      <Field label="When">
        <input className={fieldClass()} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </Field>
      <Field label="Label">
        <input className={fieldClass()} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Optional" />
      </Field>
      <div className="flex items-end lg:col-span-4">
        <Button type="submit">{kind === 'payment' ? 'Log payment' : 'Log charge'}</Button>
      </div>
    </form>
  )
}
