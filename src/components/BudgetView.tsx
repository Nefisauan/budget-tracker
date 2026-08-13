import { Calculator } from 'lucide-react'
import type { BudgetCategory, BudgetPlan } from '../types.ts'
import { pct, usd } from '../lib/money.ts'
import { useLedger } from '../lib/store.tsx'
import { SplitPie } from './Charts.tsx'
import { Button, Field, Panel, fieldClass } from './ui.tsx'

const CATEGORIES: {
  key: BudgetCategory
  label: string
  hint: string
  color: string
}[] = [
  { key: 'needs', label: 'Needs', hint: 'Housing, food, utilities', color: '#c56b86' },
  { key: 'fun', label: 'Fun', hint: 'Dates, hobbies, travel', color: '#e4c37a' },
  { key: 'business', label: 'Business', hint: 'Tools, inventory, growth', color: '#a78bfa' },
  { key: 'extra', label: 'Extra cash', hint: 'Flexible or unplanned', color: '#f59e0b' },
  { key: 'investing', label: 'Investing', hint: 'Retirement and brokerage', color: '#8b9cff' },
  { key: 'savings', label: 'Savings', hint: 'Emergency and future goals', color: '#7ee7d6' },
]

function positive(value: string): number {
  return Math.max(0, Number(value) || 0)
}

export function BudgetView() {
  const { state, setBudgetPlan } = useLedger()
  const plan = state.budgetPlan
  const allocated = CATEGORIES.reduce((sum, category) => sum + plan.allocations[category.key], 0)
  const remaining = plan.income - allocated
  const goalTotal = CATEGORIES.reduce((sum, category) => sum + plan.goals[category.key], 0)
  const slices = CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
    value: plan.allocations[category.key],
    color: category.color,
  })).filter((slice) => slice.value > 0)

  function save(changes: Partial<BudgetPlan>) {
    setBudgetPlan({ ...plan, ...changes })
  }

  function buildFromGoals() {
    if (plan.income <= 0 || goalTotal <= 0) return
    const allocations = { ...plan.allocations }
    for (const category of CATEGORIES) {
      allocations[category.key] = Math.round((plan.income * plan.goals[category.key]) / goalTotal)
    }
    save({ allocations })
  }

  return (
    <div className="space-y-5 pb-24 md:pb-4">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-gold uppercase">Budget planner</p>
        <h2 className="mt-1 font-display text-4xl font-light text-mist">Give every dollar a purpose</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Enter your monthly take-home income, divide it across the six categories, and compare the plan with your goal.
          Changes save automatically on this device.
        </p>
      </div>

      <Panel>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <Field label="Monthly take-home income">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-mute">$</span>
              <input
                className={`${fieldClass()} pl-7`}
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                value={plan.income || ''}
                placeholder="0"
                onChange={(event) => save({ income: positive(event.target.value) })}
              />
            </div>
          </Field>
          <Button onClick={buildFromGoals} className="inline-flex items-center justify-center gap-2">
            <Calculator size={16} />
            Calculate from our goal
          </Button>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Your monthly inputs</p>
          <h3 className="font-display text-2xl text-mist">Planned budget</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {CATEGORIES.map((category) => (
              <Field key={category.key} label={category.label}>
                <div>
                  <div className="relative">
                    <i
                      className="pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                      style={{ background: category.color }}
                    />
                    <input
                      className={`${fieldClass()} pl-8`}
                      type="number"
                      min="0"
                      step="1"
                      inputMode="decimal"
                      value={plan.allocations[category.key] || ''}
                      placeholder="0"
                      onChange={(event) =>
                        save({
                          allocations: {
                            ...plan.allocations,
                            [category.key]: positive(event.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-mute">{category.hint}</p>
                </div>
              </Field>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Calculated split</p>
              <h3 className="font-display text-2xl text-mist">Where the money goes</h3>
            </div>
            <div className="text-right">
              <p className={`font-display text-2xl ${remaining < 0 ? 'text-rose' : 'text-teal'}`}>
                {remaining < 0 ? `${usd(Math.abs(remaining))} over` : `${usd(remaining)} left`}
              </p>
              <p className="text-xs text-mute">{usd(allocated)} allocated</p>
            </div>
          </div>
          <div className="mt-2">
            <SplitPie data={slices} />
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Our goal</p>
            <h3 className="font-display text-2xl text-mist">Target budget</h3>
            <p className="mt-1 text-sm text-mute">Set the percentage you want each category to receive.</p>
          </div>
          <p className={`text-sm ${goalTotal === 100 ? 'text-teal' : 'text-rose'}`}>
            Goal total: {goalTotal}% {goalTotal === 100 ? '· ready to calculate' : '· should equal 100%'}
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category) => {
            const target = plan.income * (plan.goals[category.key] / 100)
            const actual = plan.allocations[category.key]
            return (
              <div key={category.key} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-mist">
                    <i className="h-2.5 w-2.5 rounded-full" style={{ background: category.color }} />
                    {category.label}
                  </span>
                  <div className="relative w-20">
                    <input
                      className={`${fieldClass()} pr-7 text-right`}
                      type="number"
                      min="0"
                      step="1"
                      value={plan.goals[category.key]}
                      onChange={(event) =>
                        save({
                          goals: {
                            ...plan.goals,
                            [category.key]: positive(event.target.value),
                          },
                        })
                      }
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-mute">%</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-mute">Target {usd(target)}</span>
                  <span className={actual >= target ? 'text-teal' : 'text-mute'}>
                    {plan.income > 0 ? pct(actual / plan.income) : '0%'} planned
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}
