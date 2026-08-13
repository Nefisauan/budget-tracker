import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import type { CashAccount, Owner, Persona } from '../types.ts'
import { cashEventsFor, cashOnHand, liveBalance, ownerName, visibleCash } from '../lib/cash.ts'
import { isoDate, prettyDate, uid, usd } from '../lib/money.ts'
import { useLedger } from '../lib/store.tsx'
import { Button, Chip, Field, fieldClass, Panel } from './ui.tsx'

export function CashView({ persona }: { persona: Persona }) {
  const { state, upsertCash, removeCash, addCashAdjust, removeCashAdjust } = useLedger()
  const accounts = visibleCash(state, persona)
  const total = cashOnHand(state, persona)
  const [activeId, setActiveId] = useState<string | null>(accounts[0]?.id ?? null)
  const active = accounts.find((a) => a.id === activeId) ?? accounts[0] ?? null
  const events = active ? cashEventsFor(state, active) : []
  const live = active ? liveBalance(state, active) : 0
  const defaultOwner: Owner = persona === 'together' ? 'kaylie' : persona
  const adjusts = (state.cashAdjusts ?? []).filter((a) => a.accountId === active?.id)

  return (
    <div className="space-y-5 pb-24 md:pb-4">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-gold uppercase">In the bank</p>
        <h2 className="mt-1 font-display text-4xl font-light text-mist">What you have right now</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Set what’s in checking today. After that, the number only moves when you log something — paychecks in, spend and fun out, new savings and investments out, hustle sales in, hustle costs and loan or card payments out. Starting savings and investments stay where they are.
        </p>
      </div>

      <Panel>
        <p className="text-[11px] tracking-[0.2em] text-mute uppercase">In accounts right now</p>
        <p className={`mt-2 font-display text-5xl ${total < 0 ? 'text-rose' : 'text-teal'}`}>{usd(total)}</p>
        <p className="mt-2 text-sm text-mute">
          {accounts.length === 0
            ? 'Add a checking or cash account to start the running total.'
            : `${accounts.length} account${accounts.length === 1 ? '' : 's'} · updates on every log`}
        </p>
      </Panel>

      <Panel>
        <h3 className="mb-4 font-display text-xl text-mist">What’s in the account today</h3>
        <NewCashForm
          defaultOwner={defaultOwner}
          onSave={(account) => {
            upsertCash(account)
            setActiveId(account.id)
          }}
        />
      </Panel>

      {accounts.length === 0 ? (
        <Panel>
          <p className="text-sm text-mute">
            Add Kaylie’s checking, Nefi’s checking, or a joint account with the balance you see in the bank app right now.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {accounts.map((account) => {
            const bal = liveBalance(state, account)
            const on = active?.id === account.id
            return (
              <button
                key={account.id}
                type="button"
                onClick={() => setActiveId(account.id)}
                className={`rounded-2xl border p-4 text-left ${on ? 'border-gold/50 bg-gold/8' : 'border-white/8 bg-white/4'}`}
              >
                <p className="text-xs text-mute">{ownerName(account.owner, state)}</p>
                <h3 className="mt-1 font-display text-xl text-mist">{account.name}</h3>
                <p className={`mt-2 font-display text-2xl ${bal < 0 ? 'text-rose' : 'text-teal'}`}>{usd(bal)}</p>
                <p className="mt-1 text-xs text-mute">Started at {usd(account.startBalance)} on {prettyDate(account.startDate)}</p>
              </button>
            )
          })}
        </div>
      )}

      {active ? (
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Running balance</p>
              <h3 className="font-display text-3xl text-mist">{active.name}</h3>
              <p className={`mt-2 font-display text-4xl ${live < 0 ? 'text-rose' : 'text-teal'}`}>{usd(live)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remove ${active.name}?`)) {
                  removeCash(active.id)
                  setActiveId(null)
                }
              }}
              className="text-rose"
              aria-label="Remove account"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <h4 className="mt-8 mb-3 font-display text-lg text-mist">Correction (transfer, ATM, leftover)</h4>
          <AdjustForm
            accountId={active.id}
            onSave={(row) => addCashAdjust(row)}
          />

          <h4 className="mt-8 mb-3 font-display text-lg text-mist">How this number moved</h4>
          {events.length === 0 ? (
            <p className="text-sm text-mute">No logs on or after {prettyDate(active.startDate)} yet. The balance is still the starting amount.</p>
          ) : (
            <ul className="divide-y divide-white/8">
              {events.map((ev, i) => {
                const adj = adjusts.find((a) => a.date === ev.date && a.amount === ev.amount && a.label === ev.label)
                return (
                  <li key={`${ev.date}-${ev.label}-${i}`} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm text-mist">{ev.label}</p>
                      <p className="text-xs text-mute">{prettyDate(ev.date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={`text-sm ${ev.amount >= 0 ? 'text-teal' : 'text-rose'}`}>
                        {ev.amount >= 0 ? '+' : '−'}
                        {usd(Math.abs(ev.amount))}
                      </p>
                      {adj ? (
                        <button type="button" onClick={() => removeCashAdjust(adj.id)} className="text-rose" aria-label="Remove correction">
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  </li>
                )
              })}
              <li className="flex items-center justify-between py-3 text-sm text-mute">
                <span>Starting balance · {prettyDate(active.startDate)}</span>
                <span>{usd(active.startBalance)}</span>
              </li>
            </ul>
          )}
        </Panel>
      ) : null}
    </div>
  )
}

function NewCashForm({
  defaultOwner,
  onSave,
}: {
  defaultOwner: Owner
  onSave: (account: CashAccount) => void
}) {
  const [name, setName] = useState('Checking')
  const [owner, setOwner] = useState<Owner>(defaultOwner)
  const [startBalance, setStartBalance] = useState('')
  const [startDate, setStartDate] = useState(isoDate())

  function submit(e: FormEvent) {
    e.preventDefault()
    const bal = Number(startBalance)
    if (!name.trim() || !Number.isFinite(bal)) return
    onSave({
      id: uid(),
      name: name.trim(),
      owner,
      startBalance: bal,
      startDate,
      notes: '',
    })
    setStartBalance('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Account name">
        <input className={fieldClass()} value={name} onChange={(e) => setName(e.target.value)} placeholder="Checking, joint, cash…" required />
      </Field>
      <Field label="In the account right now">
        <input className={fieldClass()} type="number" step="1" value={startBalance} onChange={(e) => setStartBalance(e.target.value)} required />
      </Field>
      <Field label="As of">
        <input className={fieldClass()} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
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
      <div className="flex items-end lg:col-span-4">
        <Button type="submit">Set starting balance</Button>
      </div>
    </form>
  )
}

function AdjustForm({
  accountId,
  onSave,
}: {
  accountId: string
  onSave: (row: { id: string; accountId: string; amount: number; date: string; label: string }) => void
}) {
  const [dir, setDir] = useState<'in' | 'out'>('in')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(isoDate())
  const [label, setLabel] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return
    onSave({
      id: uid(),
      accountId,
      amount: dir === 'in' ? n : -n,
      date,
      label: label.trim() || (dir === 'in' ? 'Deposit' : 'Withdrawal'),
    })
    setAmount('')
    setLabel('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Type">
        <div className="flex flex-wrap gap-2 pt-1">
          <Chip active={dir === 'in'} onClick={() => setDir('in')}>
            Money in
          </Chip>
          <Chip active={dir === 'out'} onClick={() => setDir('out')}>
            Money out
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
        <input className={fieldClass()} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ATM, Venmo, leftover…" />
      </Field>
      <div className="flex items-end lg:col-span-4">
        <Button type="submit">Log correction</Button>
      </div>
    </form>
  )
}
