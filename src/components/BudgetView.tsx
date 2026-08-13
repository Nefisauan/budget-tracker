import type { BudgetCategory, Persona } from '../types.ts'
import { sumActivity, visibleActivity } from '../lib/activity.ts'
import { visibleHustleLines } from '../lib/hustle.ts'
import { isoDate, pct, usd } from '../lib/money.ts'
import { useLedger } from '../lib/store.tsx'
import { SplitPie } from './Charts.tsx'
import { Panel, fieldClass } from './ui.tsx'

const CATEGORIES: {
  key: BudgetCategory
  label: string
  hint: string
  color: string
}[] = [
  { key: 'needs', label: 'Needs', hint: 'Needs logged in Activity', color: '#c56b86' },
  { key: 'fun', label: 'Fun', hint: 'Fun logged in Activity', color: '#e4c37a' },
  { key: 'business', label: 'Business', hint: 'Costs logged under Hustle', color: '#a78bfa' },
  { key: 'extra', label: 'Extra cash', hint: 'Income left after every category', color: '#f59e0b' },
  { key: 'investing', label: 'Investing', hint: 'Investments logged in Activity', color: '#8b9cff' },
  { key: 'savings', label: 'Savings', hint: 'Savings logged in Activity', color: '#7ee7d6' },
]

function positive(value: string): number {
  return Math.max(0, Number(value) || 0)
}

export function BudgetView({ persona }: { persona: Persona }) {
  const { state, setBudgetPlan } = useLedger()
  const month = isoDate().slice(0, 7)
  const activity = visibleActivity(state, persona).filter((row) => row.date.startsWith(month))
  const hustle = visibleHustleLines(state, persona).filter((row) => row.date.startsWith(month))
  const activityIncome = sumActivity(activity, 'income')
  const businessRevenue = hustle
    .filter((row) => row.kind === 'revenue')
    .reduce((sum, row) => sum + row.amount, 0)
  const income = activityIncome + businessRevenue
  const spent = {
    needs: sumActivity(activity, 'spend'),
    fun: sumActivity(activity, 'fun'),
    business: hustle.filter((row) => row.kind === 'cost').reduce((sum, row) => sum + row.amount, 0),
    investing: sumActivity(activity, 'investments'),
    savings: sumActivity(activity, 'savings'),
  }
  const assigned = spent.needs + spent.fun + spent.business + spent.investing + spent.savings
  const remaining = income - assigned
  const actual: Record<BudgetCategory, number> = {
    ...spent,
    extra: Math.max(0, remaining),
  }
  const plan = state.budgetPlan
  const goalTotal = CATEGORIES.reduce((sum, category) => sum + plan.goals[category.key], 0)
  const slices = CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
    value: actual[category.key],
    color: category.color,
  })).filter((slice) => slice.value > 0)

  function saveGoal(category: BudgetCategory, value: string) {
    const goals = { ...plan.goals, [category]: positive(value) }
    setBudgetPlan({ goals })
  }

  return (
    <div className="space-y-5 pb-24 md:pb-4">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-gold uppercase">Budget tracker</p>
        <h2 className="mt-1 font-display text-4xl font-light text-mist">Your month, calculated live</h2>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Every income, expense, hustle cost, investment, and savings entry you log updates this month automatically.
          The dollar goals below are the only numbers you set here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Logged income</p>
          <p className="mt-2 font-display text-3xl text-gold">{usd(income)}</p>
          <p className="mt-1 text-xs text-mute">Paychecks + hustle revenue this month</p>
        </Panel>
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Assigned</p>
          <p className="mt-2 font-display text-3xl text-mist">{usd(assigned)}</p>
          <p className="mt-1 text-xs text-mute">Everything logged outside income</p>
        </Panel>
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">{remaining < 0 ? 'Over income' : 'Extra cash'}</p>
          <p className={`mt-2 font-display text-3xl ${remaining < 0 ? 'text-rose' : 'text-teal'}`}>
            {usd(Math.abs(remaining))}
          </p>
          <p className="mt-1 text-xs text-mute">Recalculates after every log</p>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Live split</p>
          <h3 className="font-display text-2xl text-mist">Where this month went</h3>
          <div className="mt-2">
            <SplitPie data={slices} />
          </div>
        </Panel>

        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Current totals</p>
          <h3 className="font-display text-2xl text-mist">Calculated from your logs</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {CATEGORIES.map((category) => (
              <div key={category.key} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-mist">
                    <i className="h-2.5 w-2.5 rounded-full" style={{ background: category.color }} />
                    {category.label}
                  </span>
                  <span className="font-display text-xl text-gold">{usd(actual[category.key])}</span>
                </div>
                <p className="mt-1 text-[11px] text-mute">
                  {category.hint}
                  {income > 0 ? ` · ${pct(actual[category.key] / income)}` : ''}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Our goal</p>
            <h3 className="font-display text-2xl text-mist">Monthly dollar targets</h3>
            <p className="mt-1 text-sm text-mute">Enter how many dollars you want in each category every month.</p>
          </div>
          <p className="text-sm text-gold">{usd(goalTotal)} total goal</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category) => {
            const goal = plan.goals[category.key]
            const current = actual[category.key]
            const progress = goal > 0 ? Math.min(1, current / goal) : 0
            return (
              <div key={category.key} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-mist">
                    <i className="h-2.5 w-2.5 rounded-full" style={{ background: category.color }} />
                    {category.label}
                  </span>
                  <div className="relative w-28">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-mute">$</span>
                    <input
                      className={`${fieldClass()} pl-7 text-right`}
                      type="number"
                      min="0"
                      step="1"
                      inputMode="decimal"
                      value={goal || ''}
                      placeholder="0"
                      onChange={(event) => saveGoal(category.key, event.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress * 100}%`, background: category.color }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-mute">{usd(current)} current</span>
                  <span className={goal > 0 && current >= goal ? 'text-teal' : 'text-mute'}>
                    {goal > 0 ? `${Math.round((current / goal) * 100)}% of goal` : 'Set a goal'}
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
