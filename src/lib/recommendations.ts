import type { AdviceCard, LedgerState, MoneyEntry } from '../types.ts'
import { monthsUntil, usd } from './money.ts'
import { hustleTotals, visibleHustleLines } from './hustle.ts'
import { cardSummary, cardTotals, linesForCard, visibleCards } from './card.ts'
import { debtSummary, linesForLoan, loanTotals, visibleLoans } from './loan.ts'
import { riskPosture, sumKind, weddingSavings } from './ledger.ts'
import { monthlyAmount } from './money.ts'

function monthsOfRunway(savings: number, spend: number): number {
  if (spend <= 0) return savings > 0 ? 99 : 0
  return savings / spend
}

function named(state: LedgerState): string {
  return `${state.profiles.kaylie.name} & ${state.profiles.nefi.name}`
}

export function buildAdvice(state: LedgerState, entries: MoneyEntry[]): AdviceCard[] {
  const cards: AdviceCard[] = []
  const age = Math.min(state.profiles.kaylie.age, state.profiles.nefi.age)
  const avgAge = (state.profiles.kaylie.age + state.profiles.nefi.age) / 2
  const risk = riskPosture(age)
  const income = sumKind(entries, 'income')
  const spend = sumKind(entries, 'spend')
  const fun = sumKind(entries, 'fun')
  const savings = sumKind(entries, 'savings')
  const investments = sumKind(entries, 'investments')
  const assigned = spend + fun + savings + investments
  const surplus = income - assigned
  const saveRate = income > 0 ? (savings + investments) / income : 0
  const funRate = income > 0 ? fun / income : 0
  const runway = monthsOfRunway(savings, spend + fun)
  const weddingFund = weddingSavings(entries)
  const upcoming = [...state.events].sort((a, b) => a.date.localeCompare(b.date))
  const wedding = upcoming.find((e) => e.kind === 'wedding')
  const monthsToWedding = wedding ? monthsUntil(wedding.date) : null
  const nearCashEvents = upcoming.filter((e) => monthsUntil(e.date) > 0 && monthsUntil(e.date) < 24)

  if (income <= 0) {
    cards.push({
      id: 'log-income',
      priority: 'now',
      title: 'Start with what you earn',
      body: `Orbit is only as sharp as the numbers. Add ${named(state)}’s monthly income so the split, surplus, and advice can lock onto real life — not guesses.`,
      why: 'Every other recommendation is downstream of cash in.',
      action: 'Log both incomes on the Income page.',
    })
  }

  if (income > 0 && assigned === 0) {
    cards.push({
      id: 'assign',
      priority: 'now',
      title: 'Give every dollar a job',
      body: `You have ${usd(income)}/mo coming in and nothing assigned yet. Split it across needs, fun, savings, and investments so the pie has something true to show.`,
      why: 'Unassigned money quietly becomes random spending.',
      action: 'Add rent, food, fun money, and at least one savings line.',
    })
  }

  if (income > 0 && surplus < 0) {
    cards.push({
      id: 'over-assigned',
      priority: 'now',
      title: 'The ledger is oversubscribed',
      body: `Assigned outflows beat income by ${usd(Math.abs(surplus))}/mo. That is how couples leak into credit cards. Trim a spend line or revisit the fun envelope before the wedding budget takes the hit.`,
      why: 'A plan that does not fit on paper will not fit in real life.',
      action: 'Cut or pause the lowest-joy expenses until surplus is green.',
    })
  }

  if (income > 0 && surplus > income * 0.15) {
    cards.push({
      id: 'idle-cash',
      priority: 'soon',
      title: `${usd(surplus)} is sitting unassigned`,
      body: 'Idle surplus is a gift — and a risk. Sweep most of it to the wedding fund or investments so it cannot evaporate on a random Saturday.',
      why: 'What is not named gets spent.',
      action: 'Route unassigned cash to Wedding, Emergency, or Brokerage.',
    })
  }

  if (runway < 1 && income > 0) {
    cards.push({
      id: 'runway-0',
      priority: 'now',
      title: 'Build a one-month cushion first',
      body: `Savings currently cover about ${runway.toFixed(1)} month of living costs. Before you get heroic with the market, park one month of needs in cash. At your age the goal is speed, not perfection.`,
      why: 'A single surprise bill should not touch wedding money or investments.',
      action: 'Auto-move a slice of each paycheck into Emergency until it hits 1× monthly needs.',
    })
  } else if (runway < 3 && income > 0) {
    cards.push({
      id: 'runway-3',
      priority: 'soon',
      title: 'Stretch the emergency fund toward 3 months',
      body: `You have ~${runway.toFixed(1)} months of runway. For a couple heading into marriage, three months of needs (not including the wedding fund) is the calm number.`,
      why: 'Two incomes are a blessing until one of them pauses.',
      action: 'Keep Emergency as its own savings category, separate from wedding.',
    })
  }

  if (wedding && monthsToWedding !== null) {
    const cost = wedding.estimatedCost
    const annualFund = weddingFund * 12
    const years = Math.max(monthsToWedding / 12, 0.05)
    const onPace = annualFund * years
    const gap = Math.max(0, cost - onPace)
    const monthsLeft = Math.max(monthsToWedding, 1)
    const neededMonthly = cost > 0 ? Math.max(0, (cost - annualFund * (monthsToWedding / 12)) / monthsLeft) : 0

    if (monthsToWedding < 0) {
      cards.push({
        id: 'wedding-past',
        priority: 'now',
        title: 'Update the wedding date — or archive it',
        body: 'That wedding event is in the past. If you are married now, shift the fund into emergency / house / investing and add whatever is actually next.',
        why: 'Advice is only as current as your timeline.',
        action: 'Edit the event date or add the next chapter (home, trip, family).',
      })
    } else if (cost > 0 && onPace < cost * 0.7) {
      cards.push({
        id: 'wedding-pace',
        priority: monthsToWedding < 12 ? 'now' : 'soon',
        title:
          monthsToWedding < 12
            ? `Wedding is ${Math.round(monthsToWedding)} months out — cash only`
            : 'The wedding fund needs a faster cadence',
        body: `You are planning around ${usd(cost)}. At the current ${usd(weddingFund)}/mo wedding savings, you are on pace for about ${usd(onPace)} by the date. Gap: ${usd(gap)}. Needed: ~${usd(Math.ceil(neededMonthly))}/mo.`,
        why: 'Money you need inside 24 months does not belong in stocks. A 20-year-old market is on your side; a 12-month wedding is not.',
        action: 'Raise the Wedding savings line and keep it in a HYSA, not an index fund.',
      })
    } else if (cost > 0) {
      cards.push({
        id: 'wedding-ok',
        priority: 'soon',
        title: 'Wedding cash is on a sensible track',
        body: `At ${usd(weddingFund)}/mo you are roughly on pace for ${usd(cost)}. Protect it. Do not “put the wedding fund in the market to grow a little more.” That is how dates get stressful.`,
        why: `${Math.round(monthsToWedding)} months is too close for equity risk.`,
        action: 'Leave long-term investing for non-wedding dollars only.',
      })
    }
  }

  if (investments > 0 && wedding && monthsToWedding !== null && monthsToWedding < 18 && weddingFund < (wedding.estimatedCost || 0) / 12) {
    cards.push({
      id: 'de-risk',
      priority: 'now',
      title: 'You are investing harder than you are funding the wedding',
      body: `Investments are ${usd(investments)}/mo while the wedding sinking fund is ${usd(weddingFund)}/mo. Flip that until the ceremony is fully cash-funded, then go aggressive again. You have time after the vows — you do not have a spare year before them.`,
      why: 'Sequence of returns risk on a wedding is just called “we had to put it on a card.”',
      action: 'Temporarily route a slice of brokerage/retirement extras into Wedding.',
    })
  }

  if (income > 0 && investments === 0 && runway >= 1 && (!wedding || (monthsToWedding ?? 99) > 6)) {
    cards.push({
      id: 'start-investing',
      priority: 'soon',
      title: `At ${Math.round(avgAge)}, time is the rare asset`,
      body: `${risk.blurb} Open (or max) Roth IRAs while income is earned. A simple total-market or S&P 500 index fund is enough. You do not need a clever portfolio at 22.`,
      why: `Target ~${risk.equity}% equities for money you will not touch for 5+ years.`,
      action: 'Add a monthly Retirement investment for each of you, even if it starts small.',
    })
  }

  if (income > 0 && saveRate < 0.15 && surplus >= 0 && assigned > 0) {
    cards.push({
      id: 'save-rate',
      priority: 'soon',
      title: `Savings rate is ${Math.round(saveRate * 100)}% — aim for 20%+`,
      body: 'Count savings + investments. A young couple can live a little and still pay Future You. If the wedding is heavy this year, 20% can include the wedding fund — just don’t let it all vanish after the party.',
      why: 'The habit matters more than the product.',
      action: 'Nudge savings or investments up 1% of income this month, then again next quarter.',
    })
  }

  if (funRate === 0 && income > 0 && assigned > 0) {
    cards.push({
      id: 'no-fun',
      priority: 'soon',
      title: 'Put fun on the books',
      body: 'A budget with zero joy money breaks. At 22, date nights and hobbies are not a moral failure — they are how the plan survives. Give each of you a no-questions envelope.',
      why: 'Unbudgeted fun becomes guilt spending, which becomes hidden spending.',
      action: 'Add a Fun line for Kaylie, Nefi, and one shared date-night number.',
    })
  } else if (funRate > 0.22) {
    cards.push({
      id: 'too-fun',
      priority: 'soon',
      title: `Fun is eating ${Math.round(funRate * 100)}% of income`,
      body: 'Live richly, not loosely. Pull fun toward 8–15% and slide the rest toward the wedding or Roths. You will not remember the extra takeout. You will remember a calm wedding and a funded decade.',
      why: 'Fun should be deliberate, not the residual of every weak evening.',
      action: 'Cap personal fun money and keep a shared date-night line so you do not feel punished.',
    })
  }

  const hustle = hustleTotals(visibleHustleLines(state, 'together'))
  if (hustle.cost > 0 && hustle.profit < 0) {
    cards.push({
      id: 'hustle-red',
      priority: 'soon',
      title: 'The side hustle is costing more than it makes',
      body: `All-time: ${usd(hustle.revenue)} in, ${usd(hustle.cost)} out — ${usd(Math.abs(hustle.profit))} underwater. Either raise prices, cut supplies/ads, or pause until a gig is clearly profitable. A hobby with inventory is just shopping.`,
      why: 'Untracked hustle costs quietly eat the wedding fund.',
      action: 'Open Hustle and log every cost. Kill the lines that do not pay for themselves.',
    })
  } else if (hustle.monthProfit > 250) {
    cards.push({
      id: 'hustle-profit',
      priority: 'soon',
      title: `Side hustle cleared ${usd(hustle.monthProfit)} this month`,
      body: 'Treat profit like a paycheck: skim a tax set-aside (~25–30%), then send the rest to the wedding HYSA or a Roth — not a lifestyle upgrade.',
      why: 'Irregular income is easiest to spend because it feels like a bonus.',
      action: 'Move this month’s hustle profit into Savings or This check as if it were a deposit.',
    })
  }

  const owedCards = visibleCards(state, 'together')
    .map((card) => ({ card, tot: cardTotals(card, linesForCard(state, card.id)) }))
    .filter((x) => x.tot.remaining > 0)
    .sort((a, b) => b.card.rate - a.card.rate)
  const cardDebt = cardSummary(state, 'together')
  if (cardDebt.remaining > 0) {
    const worst = owedCards[0]
    const rateNote =
      worst && worst.card.rate >= 15
        ? ` ${worst.card.name} is at ${worst.card.rate}% APR — pay as close to in full as you can.`
        : ' Pay the statement in full when you can so interest never starts.'
    cards.push({
      id: 'card-pay',
      priority: worst && worst.card.rate >= 15 ? 'now' : 'soon',
      title: `${usd(cardDebt.remaining)} sitting on credit cards`,
      body: `Log the payment on Cards when you send it.${rateNote} The balance will not drop until you record it.`,
      why: 'Card interest is usually the most expensive debt in a young household.',
      action: 'Open Cards and use Pay in full or log the amount you actually paid.',
    })
  }

  const debt = debtSummary(state, 'together')
  const costly = visibleLoans(state, 'together')
    .map((loan) => ({ loan, tot: loanTotals(loan, linesForLoan(state, loan.id)) }))
    .filter((x) => x.tot.remaining > 0 && x.loan.rate >= 7)
    .sort((a, b) => b.loan.rate - a.loan.rate)[0]
  if (costly) {
    cards.push({
      id: 'high-apr',
      priority: 'now',
      title: `${costly.loan.name} is at ${costly.loan.rate}% — pay this before extra investing`,
      body: `${usd(costly.tot.remaining)} left. A guaranteed ${costly.loan.rate}% return is beating most index-fund years after tax. Log extra payments here; keep retirement contributions only if the match is free money.`,
      why: 'High-interest debt is a negative investment that compounds against you.',
      action: 'Open Loans and log any extra you can send this month.',
    })
  } else if (debt.remaining > 0) {
    cards.push({
      id: 'debt-floor',
      priority: 'soon',
      title: `${usd(debt.remaining)} still on the books`,
      body: 'Make the minimum so nothing goes delinquent, then point leftover cash at the wedding fund and Roths unless a rate is ugly. Log every payment so the remaining number is honest.',
      why: 'Debt only shrinks when you record what you actually paid.',
      action: 'After each payment, log it on Loans — the balance will not guess.',
    })
  }

  const kaylieInc = entries.filter((e) => e.owner === 'kaylie' && e.kind === 'income').reduce((n, e) => n + monthlyAmount(e), 0)
  const nefiInc = entries.filter((e) => e.owner === 'nefi' && e.kind === 'income').reduce((n, e) => n + monthlyAmount(e), 0)
  if (income > 0 && (kaylieInc === 0 || nefiInc === 0)) {
    const missing = kaylieInc === 0 ? 'Kaylie' : 'Nefi'
    cards.push({
      id: 'both-incomes',
      priority: 'now',
      title: `${missing}’s income is still blank`,
      body: 'Household advice gets weird when only one orbit is lit. Even a rough number beats a zero — you can refine it when paystubs are handy.',
      why: 'Proportional giving, saving, and fun money need both salaries.',
      action: `Add at least one income row for ${missing}.`,
    })
  }

  cards.push({
    id: 'risk-posture',
    priority: 'horizon',
    title: `Risk posture: ${risk.label} (~${risk.equity}% equity)`,
    body: `You are ${state.profiles.kaylie.age} and ${state.profiles.nefi.age}. ${risk.blurb} Near-term events are the exception: wedding, a home down payment inside 5 years, a trip you already promised — those sit in cash. Everything else can be brave.`,
    why: 'Age sets your capacity for risk. Events set which dollars are allowed to use it.',
    action: 'Revisit this whenever you change an age or add a life event.',
  })

  for (const event of nearCashEvents) {
    if (event.kind === 'wedding') continue
    const m = monthsUntil(event.date)
    if (event.estimatedCost <= 0) continue
    const monthly = event.estimatedCost / Math.max(m, 1)
    cards.push({
      id: `event-${event.id}`,
      priority: m < 8 ? 'now' : 'soon',
      title: `${event.title} in ${Math.max(1, Math.round(m))} months`,
      body: `Estimated ${usd(event.estimatedCost)}. Set aside about ${usd(Math.ceil(monthly))}/mo in a named sinking fund. If this is inside two years, do not put it in crypto or a hot stock.`,
      why: 'Sinking funds keep big days from becoming big debts.',
      action: `Add a ${event.kind === 'home' ? 'Home' : 'General'} savings line labeled “${event.title}”.`,
    })
  }

  const home = upcoming.find((e) => e.kind === 'home')
  if (home && monthsUntil(home.date) > 0) {
    cards.push({
      id: 'home-horizon',
      priority: monthsUntil(home.date) < 36 ? 'soon' : 'horizon',
      title: 'A house changes the portfolio mix',
      body: 'Down-payment money with a 5-year (or shorter) fuse belongs in cash, T-bills, or a conservative HYSA. Retirement accounts stay aggressive. Do not raid Roths for a closing date unless you have no other path.',
      why: 'Illiquidity plus a hard deadline is how buyers get forced into bad rates.',
      action: 'Split “Home” savings from Emergency and from long-term brokerage.',
    })
  }

  const family = upcoming.find((e) => e.kind === 'family')
  if (family) {
    cards.push({
      id: 'family',
      priority: 'horizon',
      title: 'Family on the timeline — raise the floor',
      body: 'Bump the emergency fund toward 6 months, look at term life once you have someone who depends on your income, and keep investing automatic so a chaotic year does not pause compounding.',
      why: 'Dependents change the cost of being unlucky.',
      action: 'Add the event cost if you can estimate it, and revisit insurance after the wedding.',
    })
  }

  if (age < 26) {
    cards.push({
      id: 'roth',
      priority: 'horizon',
      title: 'Roth years are cheaper now than they will ever be',
      body: 'If this is a relatively lower-income chapter, Roth IRA / Roth 401k contributions can be a gift to 45-year-old you. Max what you can after the emergency floor and wedding cash are honest. Tax-free growth for 40 years is the whole trick.',
      why: 'Your bracket is likely lower at 22 than in your 30s.',
      action: 'Each of you: a monthly Retirement investment labeled Roth.',
    })
  }

  const order = { now: 0, soon: 1, horizon: 2 }
  const seen = new Set<string>()
  return cards
    .filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
    .sort((a, b) => order[a.priority] - order[b.priority])
}
