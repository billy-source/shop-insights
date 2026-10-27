import { diffDays, money, today } from "./utils";

const sum = (list, fn) => list.reduce((t, x) => t + fn(x), 0);
const ORDER = { high: 0, medium: 1, low: 2 };

// Cash that moved in the shop for dates after `afterDate`, up to and including `upToDate`
export function cashFlow({ sales, restocks, expenses }, afterDate, upToDate) {
  const inRange = (r) => r.method === "cash" && r.date > afterDate && r.date <= upToDate;
  const s = sum(sales.filter(inRange), (x) => x.qty * x.unitPrice);
  const r = sum(restocks.filter(inRange), (x) => x.qty * x.unitCost);
  const e = sum(expenses.filter(inRange), (x) => x.amount);
  return { sales: s, restocks: r, expenses: e, net: s - r - e };
}

export function analyse(data, availableCash = 0) {
  const { products, sales, cashCounts } = data;
  const t = today();
  const insights = [];

  // How many days of sales history do we have? (needed to know how far to trust the numbers)
  const firstSale = sales.reduce((m, s) => (s.date < m ? s.date : m), t);
  const history = sales.length ? diffDays(firstSale, t) + 1 : 0;
  const win = Math.min(14, Math.max(history, 1));

  const stats = Object.fromEntries(products.map((p) => [p.id, { win: 0, recent: 0, prior: 0 }]));
  sales.forEach((s) => {
    const st = stats[s.productId];
    if (!st) return;
    const age = diffDays(s.date, t); // 0 = today
    if (age < win) st.win += s.qty;
    if (age < 7) st.recent += s.qty;
    else if (age < 35) st.prior += s.qty;
  });

  const rows = products.map((p) => {
    const st = stats[p.id];
    const avg = st.win / win;
    const lead = Number(p.leadTimeDays) || 2;
    return { ...p, st, avg, lead, daysLeft: avg > 0 ? p.stock / avg : Infinity };
  });

  if (history < 7) {
    insights.push({
      id: "learning", type: "info", severity: "low",
      title: "Still learning your shop",
      detail: `You have ${history} day(s) of sales recorded. Warnings become reliable after about 7 days, and slow-seller checks after 3 weeks.`,
      action: "Keep recording sales every day.",
    });
  }

  rows.forEach((p) => {
    // 1. Stock warnings
    if (history >= 3 && p.avg > 0) {
      const left = Math.max(1, Math.round(p.daysLeft));
      const rate = `You sell about ${p.avg.toFixed(1)} a day`;
      if (p.stock <= 0) {
        insights.push({ id: `out-${p.id}`, type: "stock", severity: "high",
          title: `${p.name} is out of stock`, detail: `${rate}.`, action: "Restock as soon as you can." });
      } else if (p.daysLeft < p.lead) {
        insights.push({ id: `low-${p.id}`, type: "stock", severity: "high",
          title: `${p.name} may run out within ${left} day(s)`,
          detail: `${rate} and have ${p.stock} left. A delivery takes about ${p.lead} day(s).`,
          action: "Order today." });
      } else if (p.daysLeft < p.lead + 3) {
        insights.push({ id: `soon-${p.id}`, type: "stock", severity: "medium",
          title: `${p.name} is running low (about ${left} days left)`,
          detail: `${rate} and have ${p.stock} left.`,
          action: "Plan to restock in the next day or two." });
      }
    }

    // 2. Slow seller: last 7 days vs the 28 days before (skipped when out of stock, since that fakes a drop)
    if (history >= 21 && p.stock > 0 && p.st.prior >= 10) {
      const base = p.st.prior / 28;
      const now = p.st.recent / 7;
      if (now < base * 0.7) {
        insights.push({ id: `slow-${p.id}`, type: "sales", severity: "medium",
          title: `${p.name} is selling ${Math.round((1 - now / base) * 100)}% slower than usual`,
          detail: `${now.toFixed(1)} a day this week versus ${base.toFixed(1)} a day before.`,
          action: "Check the price, shelf position, and whether a nearby shop is selling it cheaper." });
      }
    }
  });

  // 3. Cash checks
  const last = cashCounts[cashCounts.length - 1];
  if (!last) {
    insights.push({ id: "no-cash", type: "info", severity: "low",
      title: "No cash count yet",
      detail: "Count your cash at closing time to unlock cash mismatch checks.",
      action: 'Open "Cash count" and record your starting balance.' });
  } else {
    const limit = Math.max(100, (last.expected || 0) * 0.02);
    if (last.hasExpected && Math.abs(last.difference) > limit) {
      insights.push({ id: "cash-mismatch", type: "cash", severity: "high",
        title: `Cash mismatch on ${last.date}`,
        detail: `Expected ${money(last.expected)}, counted ${money(last.counted)} (${last.difference > 0 ? "over" : "short"} by ${money(Math.abs(last.difference))}).`,
        action: "Look for unrecorded sales, expenses or restocks, or money taken from the till." });
    }
    const gap = diffDays(last.date, t);
    if (gap >= 2) {
      insights.push({ id: "cash-old", type: "cash", severity: "low",
        title: `Last cash count was ${gap} days ago`,
        detail: "Regular counts catch problems while you can still trace them.",
        action: "Do a cash count today." });
    }
  }

  // 4. Restock plan: most urgent first, then most profitable per day, within the cash available
  const candidates = rows
    .filter((r) => r.avg > 0 && r.buyPrice > 0)
    .map((r) => {
      const need = Math.max(0, Math.ceil(r.avg * (r.lead + 7)) - r.stock);
      const urgency = r.daysLeft < r.lead ? 3 : r.daysLeft < r.lead + 3 ? 2 : 1;
      return { ...r, need, urgency, profitPerDay: (r.sellPrice - r.buyPrice) * r.avg };
    })
    .filter((r) => r.need > 0)
    .sort((a, b) => b.urgency - a.urgency || b.profitPerDay - a.profitPerDay);

  let remaining = availableCash;
  const plan = [];
  for (const c of candidates) {
    if (plan.length >= 5) break;
    const qty = Math.min(c.need, Math.floor(remaining / c.buyPrice));
    if (qty <= 0) continue;
    const cost = qty * c.buyPrice;
    plan.push({
      product: c, qty, cost, partial: qty < c.need,
      reason: c.urgency === 3 ? "Runs out before a delivery could arrive"
        : c.urgency === 2 ? "Running low"
        : `Earns about ${money(c.profitPerDay)} profit a day`,
    });
    remaining -= cost;
  }

  const todays = sales.filter((s) => s.date === t);
  const summary = {
    count: todays.length,
    revenue: sum(todays, (s) => s.qty * s.unitPrice),
    profit: sum(todays, (s) => s.qty * (s.unitPrice - s.unitCost)),
    cash: sum(todays.filter((s) => s.method === "cash"), (s) => s.qty * s.unitPrice),
    mpesa: sum(todays.filter((s) => s.method === "mpesa"), (s) => s.qty * s.unitPrice),
  };

  insights.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  return { insights, plan, remaining, summary, history };
}