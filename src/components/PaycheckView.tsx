import { useState } from 'react'
import type { Owner, Persona } from '../types.ts'
import { sliceToActivity } from '../lib/activity.ts'
import { recommendPaycheckSplit } from '../lib/paycheck.ts'
import { isoDate, pct, uid, usd } from '../lib/money.ts'
import { useLedger } from '../lib/store.tsx'
import { SplitPie } from './Charts.tsx'
import { Button, Chip, Field, fieldClass, Panel } from './ui.tsx'

export function PaycheckView({ persona }: { persona: Persona }) {
  const { state, addActivity, setView } = useLedger()
  const defaultOwner: Owner = persona === 'together' ? 'kaylie' : persona
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(isoDate())
  const [owner, setOwner] = useState<Owner>(defaultOwner)
  const [saved, setSaved] = useState(false)
  const [loggedSlice, setLoggedSlice] = useState<string | null>(null)
  const check = Number(amount)
  const ready = Number.isFinite(check) && check > 0
  const plan = ready ? recommendPaycheckSplit(check, owner, state) : null

  function logPaycheck() {
    if (!ready) return
    addActivity({
      id: uid(),
      date,
      owner,
      kind: 'income',
      category: 'Salary',
      label: 'Paycheck',
      amount: Math.round(check),
      notes: '',
    })
    setSaved(true)
  }

  return (
    <div className="space-y-5 pb-24 md:pb-4">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-gold uppercase">This check</p>
        <h2 className="mt-1 font-display text-4xl font-light text-mist">Got paid?</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Log what landed. That is the only number that gets added. Investments you already logged stay put — nothing is recalculated.
        </p>
      </div>

      <Panel>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="How much landed">
            <input
              className={fieldClass()}
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setSaved(false)
              }}
              placeholder="2400"
            />
          </Field>
          <Field label="When">
            <input className={fieldClass()} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Whose check">
            <div className="flex flex-wrap gap-2 pt-1">
              {(['kaylie', 'nefi', 'shared'] as Owner[]).map((o) => (
                <Chip key={o} active={owner === o} onClick={() => setOwner(o)}>
                  {o}
                </Chip>
              ))}
            </div>
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={logPaycheck} className={!ready ? 'pointer-events-none opacity-40' : ''}>
            {saved ? 'Paycheck logged' : 'Log this paycheck'}
          </Button>
          {saved ? (
            <Button tone="ghost" onClick={() => setView('activity')}>
              See the log →
            </Button>
          ) : null}
        </div>
      </Panel>

      {plan ? (
        <>
          <Panel>
            <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Suggestion only</p>
            <h3 className="font-display text-2xl text-mist">{plan.headline}</h3>
            <p className="mt-2 text-sm text-mute">{plan.sub}</p>
            <div className="mt-6">
              <SplitPie
                data={plan.slices.map((s) => ({
                  key: s.key,
                  label: s.label,
                  value: s.amount,
                  color: s.color,
                }))}
              />
            </div>
          </Panel>

          <div className="grid gap-3">
            {plan.slices.map((s) => (
              <article key={s.key} className="glass flex flex-wrap items-start justify-between gap-3 rounded-3xl p-5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-mist">
                    <i className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    {s.label}
                    <span className="text-xs text-mute">{pct(s.pct)}</span>
                  </p>
                  <p className="mt-2 max-w-2xl text-sm text-mute">{s.why}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl text-gold">{usd(s.amount)}</p>
                  <Button
                    tone="ghost"
                    className="mt-2"
                    onClick={() => {
                      const row = sliceToActivity(date, owner, s.key, s.label, s.amount)
                      if (!row) return
                      addActivity({ id: uid(), ...row, notes: '' })
                      setLoggedSlice(s.key)
                    }}
                  >
                    {loggedSlice === s.key ? 'Logged' : 'Log this piece'}
                  </Button>
                </div>
              </article>
            ))}
          </div>

          {plan.notes.length > 0 ? (
            <Panel>
              <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Why this split</p>
              <ul className="mt-3 space-y-2 text-sm text-mute">
                {plan.notes.map((n) => (
                  <li key={n}>· {n}</li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
