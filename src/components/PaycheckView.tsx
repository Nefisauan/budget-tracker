import { useState } from 'react'
import type { Owner, Persona } from '../types.ts'
import { visibleEntries } from '../lib/ledger.ts'
import { recommendPaycheckSplit } from '../lib/paycheck.ts'
import { pct, usd } from '../lib/money.ts'
import { useLedger } from '../lib/store.tsx'
import { SplitPie } from './Charts.tsx'
import { Button, Chip, Field, fieldClass, Panel } from './ui.tsx'

export function PaycheckView({ persona }: { persona: Persona }) {
  const { state } = useLedger()
  const defaultOwner: Owner = persona === 'together' ? 'kaylie' : persona
  const [amount, setAmount] = useState('')
  const [owner, setOwner] = useState<Owner>(defaultOwner)
  const check = Number(amount)
  const ready = Number.isFinite(check) && check > 0
  const plan = ready ? recommendPaycheckSplit(check, owner, state, visibleEntries(state, 'together')) : null

  return (
    <div className="space-y-5 pb-24 md:pb-4">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-gold uppercase">This check</p>
        <h2 className="mt-1 font-display text-4xl font-light text-mist">Got paid today?</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Drop in what hit the account. Orbit splits it for needs, fun, the wedding, emergency cash, and investing — using your ages and what’s on the calendar.
        </p>
      </div>

      <Panel>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <Field label="How much landed">
            <input
              className={fieldClass()}
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="2400"
            />
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
        <p className="mt-4 text-xs text-mute">Direct deposit, cash, Venmo from a gig — whatever. One number is enough.</p>
      </Panel>

      {!ready ? (
        <Panel>
          <p className="text-sm text-mute">Enter the amount and the split appears here — dollars, percents, and why.</p>
        </Panel>
      ) : plan ? (
        <>
          <Panel>
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
                <p className="font-display text-3xl text-gold">{usd(s.amount)}</p>
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
              <div className="mt-5 flex flex-wrap gap-2">
                <Button tone="ghost" onClick={() => navigator.clipboard.writeText(copyPlan(plan.headline, plan.slices))}>
                  Copy the split
                </Button>
              </div>
            </Panel>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function copyPlan(headline: string, slices: { label: string; amount: number; pct: number }[]): string {
  const lines = [
    headline,
    ...slices.map((s) => `${s.label}: ${usd(s.amount)} (${pct(s.pct)})`),
  ]
  return lines.join('\n')
}
