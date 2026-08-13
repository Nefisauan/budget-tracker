import { lazy, Suspense } from 'react'
import type { Persona } from '../types.ts'
import {
  allocationFromActivity,
  byCategoryActivity,
  groupWeeks,
  splitByOwnerActivity,
  sumActivity,
  thisMonth,
  visibleActivity,
  weekChart,
} from '../lib/activity.ts'
import { hustleTotals, visibleHustleLines } from '../lib/hustle.ts'
import { debtSummary } from '../lib/loan.ts'
import { cardSummary } from '../lib/card.ts'
import { visibleEntries } from '../lib/ledger.ts'
import { buildAdvice } from '../lib/recommendations.ts'
import { monthsUntil, prettyDate, usd } from '../lib/money.ts'
import { useLedger } from '../lib/store.tsx'
import { CategoryBars, OwnerBars, SplitPie, WeekBars } from './Charts.tsx'
import { Metric, Panel } from './ui.tsx'

const Donut3D = lazy(async () => {
  const m = await import('./Scene.tsx')
  return { default: m.Donut3D }
})
const ObservatoryCanvas = lazy(async () => {
  const m = await import('./Scene.tsx')
  return { default: m.ObservatoryCanvas }
})

export function Dashboard({ persona }: { persona: Persona }) {
  const { state, setView } = useLedger()
  const entries = visibleEntries(state, persona)
  const activity = visibleActivity(state, persona)
  const income = sumActivity(activity, 'income')
  const savings = sumActivity(activity, 'savings')
  const investments = sumActivity(activity, 'investments')
  const incomeMonth = thisMonth(activity.filter((a) => a.kind === 'income'))
  const slices = allocationFromActivity(activity)
  const advice = buildAdvice(state, entries).slice(0, 3)
  const wedding = state.events.find((e) => e.kind === 'wedding')
  const nextEvent = [...state.events].sort((a, b) => a.date.localeCompare(b.date))[0]
  const fund = activity
    .filter((a) => a.kind === 'savings' && a.category.toLowerCase().includes('wedding'))
    .reduce((n, a) => n + a.amount, 0)
  const investedAll = investments
  const savedAll = savings
  const recentWeek = groupWeeks(activity)[0]
  const hustle = hustleTotals(visibleHustleLines(state, persona))
  const debt = debtSummary(state, persona)
  const cards = cardSummary(state, persona)

  const greeting =
    persona === 'together'
      ? 'The shared observatory'
      : persona === 'kaylie'
        ? `Good to see you, ${state.profiles.kaylie.name}`
        : `Good to see you, ${state.profiles.nefi.name}`

  return (
    <div className="space-y-5 pb-24 md:pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.28em] text-gold uppercase">Dashboard</p>
          <h2 className="mt-1 font-display text-4xl font-light text-mist">{greeting}</h2>
          <p className="mt-2 max-w-xl text-sm text-mute">
            Nothing is recalculated. Totals only move when you log a paycheck, investment, cost, or hustle line.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView('paycheck')}
            className="rounded-full bg-gold px-4 py-2 text-sm text-ink"
          >
            I just got paid
          </button>
          {income === 0 ? (
            <button
              type="button"
              onClick={() => setView('activity')}
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-mist"
            >
              Log an investment
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric kicker="Logged income" value={usd(income)} hint={`${usd(incomeMonth)} this month · all time`} />
        <Metric
          kicker="Invested"
          value={usd(investments)}
          hint="Only what you logged — never rewritten"
        />
        <Metric
          kicker="Saved"
          value={usd(savings)}
          accent="#7ee7d6"
          hint="Emergency, wedding, and other cash logs"
        />
        <Metric
          kicker="Saved + invested"
          value={usd(savings + investments)}
          accent="#7ee7d6"
          hint="Running total from the activity log"
        />
      </div>

      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Side hustle</p>
            <h3 className="font-display text-2xl text-mist">
              {hustle.profit >= 0 ? `${usd(hustle.profit)} profit` : `${usd(Math.abs(hustle.profit))} in the red`}
            </h3>
            <p className="mt-1 text-sm text-mute">
              {usd(hustle.revenue)} in · {usd(hustle.cost)} out · {usd(hustle.monthProfit)} this month
            </p>
          </div>
          <button type="button" onClick={() => setView('hustle')} className="text-sm text-gold">
            Log costs & sales →
          </button>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Loans</p>
            <h3 className="font-display text-2xl text-mist">{usd(debt.remaining)} still owed</h3>
            <p className="mt-1 text-sm text-mute">
              Paid {usd(debt.paid)} · {usd(debt.paidThisMonth)} this month
            </p>
          </div>
          <button type="button" onClick={() => setView('loans')} className="text-sm text-gold">
            Log a payment →
          </button>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Credit cards</p>
            <h3 className="font-display text-2xl text-mist">{usd(cards.remaining)} on cards</h3>
            <p className="mt-1 text-sm text-mute">
              Paid {usd(cards.paidThisMonth)} this month · {usd(cards.paid)} all time
            </p>
          </div>
          <button type="button" onClick={() => setView('cards')} className="text-sm text-gold">
            Pay a card →
          </button>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-mute uppercase">History</p>
            <h3 className="font-display text-2xl text-mist">Week by week, it adds up</h3>
            <p className="mt-1 text-sm text-mute">
              Invested all time {usd(investedAll)} · saved {usd(savedAll)}
              {recentWeek ? ` · ${recentWeek.label}: ${usd(recentWeek.investments)} invested` : ''}
            </p>
          </div>
          <button type="button" onClick={() => setView('activity')} className="text-sm text-gold">
            Open activity →
          </button>
        </div>
        <div className="mt-4">
          <WeekBars data={weekChart(activity)} />
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="min-h-[360px] overflow-hidden p-0">
          <div className="flex items-center justify-between px-6 pt-5">
            <div>
              <p className="text-[11px] tracking-[0.2em] text-mute uppercase">3D split</p>
              <h3 className="font-display text-2xl text-mist">What you have logged</h3>
            </div>
          </div>
          <div className="h-[300px]">
            <Suspense fallback={<div className="h-full bg-white/5" />}>
              <Donut3D slices={slices} />
            </Suspense>
          </div>
        </Panel>
        <Panel className="min-h-[360px] overflow-hidden p-0">
          <div className="px-6 pt-5">
            <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Orbit</p>
            <h3 className="font-display text-2xl text-mist">Live field</h3>
          </div>
          <div className="h-[300px]">
            <Suspense fallback={<div className="h-full bg-white/5" />}>
              <ObservatoryCanvas persona={persona} />
            </Suspense>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Percent mix</p>
          <h3 className="mb-4 font-display text-2xl text-mist">Needs · fun · save · invest</h3>
          <SplitPie data={slices} />
        </Panel>
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Two incomes</p>
          <h3 className="mb-4 font-display text-2xl text-mist">Kaylie vs Nefi</h3>
          <OwnerBars data={splitByOwnerActivity(activity)} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">Categories</p>
          <h3 className="mb-4 font-display text-2xl text-mist">Outflow texture</h3>
          <CategoryBars data={byCategoryActivity(activity).slice(0, 7)} />
        </Panel>
        <Panel>
          <p className="text-[11px] tracking-[0.2em] text-mute uppercase">On the horizon</p>
          <h3 className="font-display text-2xl text-mist">Next event</h3>
          {nextEvent ? (
            <div className="mt-4">
              <p className="font-display text-3xl text-gold">{nextEvent.title}</p>
              <p className="mt-1 text-sm text-mute">
                {prettyDate(nextEvent.date)}
                {monthsUntil(nextEvent.date) > 0
                  ? ` · ${Math.max(1, Math.round(monthsUntil(nextEvent.date)))} months`
                  : ' · update the date'}
              </p>
              {nextEvent.estimatedCost > 0 ? (
                <p className="mt-4 text-sm text-mist">Estimated {usd(nextEvent.estimatedCost)}</p>
              ) : null}
              {wedding && nextEvent.id === wedding.id ? (
                <p className="mt-2 text-sm text-mute">
                  Wedding savings logged {usd(fund)}
                  {wedding.estimatedCost > 0
                    ? ` · target ${usd(wedding.estimatedCost)}`
                    : ''}
                </p>
              ) : null}
              <button type="button" onClick={() => setView('events')} className="mt-6 text-sm text-gold">
                Edit ages & events →
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-mute">Add a wedding, trip, or home date so counsel can aim.</p>
          )}
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-mute uppercase">What to do next</p>
            <h3 className="font-display text-2xl text-mist">Counsel</h3>
          </div>
          <button type="button" onClick={() => setView('advice')} className="text-sm text-gold">
            Full brief →
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {advice.map((card) => (
            <article key={card.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="text-[10px] tracking-[0.2em] text-gold uppercase">{card.priority}</p>
              <h4 className="mt-2 font-display text-xl text-mist">{card.title}</h4>
              <p className="mt-2 line-clamp-4 text-sm text-mute">{card.body}</p>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  )
}
