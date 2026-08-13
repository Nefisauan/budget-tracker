import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import type { Loan, LoanLineKind, Owner, Persona } from '../types.ts'
import { debtSummary, linesForLoan, loanTotals, LOAN_CATEGORIES, visibleLoans } from '../lib/loan.ts'
import { isoDate, prettyDate, uid, usd } from '../lib/money.ts'
import { useLedger } from '../lib/store.tsx'
import { Button, Chip, Field, fieldClass, Panel } from './ui.tsx'

export function LoanView({ persona }: { persona: Persona }) {
  const { state, upsertLoan, removeLoan, addLoanLine, removeLoanLine } = useLedger()
  const loans = visibleLoans(state, persona)
  const summary = debtSummary(state, persona)
  const [activeId, setActiveId] = useState<string | null>(loans[0]?.id ?? null)
  const active = loans.find((l) => l.id === activeId) ?? loans[0] ?? null
  const activeLines = active ? linesForLoan(state, active.id) : []
  const activeTot = active ? loanTotals(active, activeLines) : null
  const defaultOwner: Owner = persona === 'together' ? 'kaylie' : persona

  return (
    <div className="space-y-5 pb-24 md:pb-4">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-gold uppercase">Loans</p>
        <h2 className="mt-1 font-display text-4xl font-light text-mist">What you owe, and what you pay</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Add the balance you already owe. Then log each payment. The remaining amount only moves when you log a payment or a charge — nothing is recalculated.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Still owed</p>
          <p className="mt-2 font-display text-3xl text-rose">{usd(summary.remaining)}</p>
        </Panel>
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Paid down</p>
          <p className="mt-2 font-display text-3xl text-teal">{usd(summary.paid)}</p>
          <p className="mt-1 text-xs text-mute">{usd(summary.paidThisMonth)} this month</p>
        </Panel>
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Started at</p>
          <p className="mt-2 font-display text-3xl text-mist">{usd(summary.start)}</p>
        </Panel>
      </div>

      <Panel>
        <h3 className="mb-4 font-display text-xl text-mist">Add a loan you already have</h3>
        <LoanForm
          defaultOwner={defaultOwner}
          onSave={(loan) => {
            upsertLoan(loan)
            setActiveId(loan.id)
          }}
        />
      </Panel>

      {loans.length === 0 ? (
        <Panel>
          <p className="text-sm text-mute">No loans yet. Student, car, card, personal — add the current balance, then log payments as you make them.</p>
        </Panel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {loans.map((loan) => {
            const t = loanTotals(loan, linesForLoan(state, loan.id))
            const on = active?.id === loan.id
            return (
              <button
                key={loan.id}
                type="button"
                onClick={() => setActiveId(loan.id)}
                className={`glass rounded-3xl p-5 text-left transition ${on ? 'border-gold/40' : ''}`}
              >
                <p className="text-[11px] tracking-[0.2em] text-mute uppercase">
                  {loan.category} · {loan.owner}
                </p>
                <h3 className="mt-1 font-display text-2xl text-mist">{loan.name}</h3>
                <p className="mt-3 font-display text-xl text-rose">{usd(t.remaining)} left</p>
                <p className="mt-1 text-sm text-mute">
                  Paid {usd(t.paid)} of {usd(t.start + t.charged)}
                  {loan.rate > 0 ? ` · ${loan.rate}% APR` : ''}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {active && activeTot ? (
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] tracking-[0.2em] text-gold uppercase">
                {active.category} · {active.owner}
              </p>
              <h3 className="font-display text-2xl text-mist">{active.name}</h3>
              <p className="mt-1 text-sm text-mute">
                {usd(activeTot.remaining)} remaining · started at {usd(activeTot.start)}
                {active.rate > 0 ? ` · ${active.rate}% APR` : ''}
                {active.minPayment > 0 ? ` · min ${usd(active.minPayment)}/mo` : ''}
              </p>
            </div>
            <Button
              tone="ghost"
              onClick={() => {
                if (confirm(`Remove ${active.name} and its payments?`)) {
                  removeLoan(active.id)
                  setActiveId(null)
                }
              }}
            >
              Delete loan
            </Button>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-teal"
              style={{
                width: `${Math.min(100, ((activeTot.paid) / Math.max(1, activeTot.start + activeTot.charged)) * 100)}%`,
              }}
            />
          </div>

          <h4 className="mt-6 mb-3 font-display text-xl text-mist">Log a payment or extra charge</h4>
          <LineForm key={active.id} loanId={active.id} onSave={(line) => addLoanLine(line)} />

          {activeLines.length === 0 ? (
            <p className="mt-6 text-sm text-mute">No payments yet. When you send money, log it here and the remaining balance drops.</p>
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
                    <button type="button" className="text-mute hover:text-rose" onClick={() => removeLoanLine(line.id)} aria-label="Delete">
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

function LoanForm({
  defaultOwner,
  onSave,
}: {
  defaultOwner: Owner
  onSave: (loan: Loan) => void
}) {
  const [name, setName] = useState('')
  const [owner, setOwner] = useState<Owner>(defaultOwner)
  const [category, setCategory] = useState<string>(LOAN_CATEGORIES[0])
  const [startBalance, setStartBalance] = useState('')
  const [rate, setRate] = useState('')
  const [minPayment, setMinPayment] = useState('')
  const [startDate, setStartDate] = useState(isoDate())
  const [notes, setNotes] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const bal = Number(startBalance)
    if (!name.trim() || !Number.isFinite(bal) || bal <= 0) return
    onSave({
      id: uid(),
      name: name.trim(),
      owner,
      category,
      startBalance: bal,
      rate: Number(rate) || 0,
      minPayment: Number(minPayment) || 0,
      startDate,
      notes: notes.trim(),
    })
    setName('')
    setStartBalance('')
    setRate('')
    setMinPayment('')
    setNotes('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Name">
        <input className={fieldClass()} value={name} onChange={(e) => setName(e.target.value)} placeholder="Student loan, car, card…" required />
      </Field>
      <Field label="What I owe now">
        <input className={fieldClass()} type="number" min="1" step="1" value={startBalance} onChange={(e) => setStartBalance(e.target.value)} required />
      </Field>
      <Field label="As of">
        <input className={fieldClass()} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </Field>
      <Field label="Type">
        <select className={fieldClass()} value={category} onChange={(e) => setCategory(e.target.value)}>
          {LOAN_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field label="APR %">
        <input className={fieldClass()} type="number" min="0" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0 if unknown" />
      </Field>
      <Field label="Min payment / mo">
        <input className={fieldClass()} type="number" min="0" step="1" value={minPayment} onChange={(e) => setMinPayment(e.target.value)} placeholder="Optional" />
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
          Add loan
        </Button>
      </div>
    </form>
  )
}

function LineForm({
  loanId,
  onSave,
}: {
  loanId: string
  onSave: (line: {
    id: string
    loanId: string
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
      loanId,
      kind,
      amount: n,
      date,
      label: label.trim() || (kind === 'payment' ? 'Payment' : 'Interest / charge'),
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
            Interest / extra owed
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
