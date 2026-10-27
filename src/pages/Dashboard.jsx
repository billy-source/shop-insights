import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listCashCounts, listProducts, loadData, seedDemo } from "../services/shop";
import { analyse } from "../lib/insights";
import { addDays, getError, money, today } from "../lib/utils";

const STYLE = {
  high: "border-red-200 bg-red-50",
  medium: "border-yellow-200 bg-yellow-50",
  low: "border-blue-200 bg-blue-50",
};
const LABEL = { stock: "Stock", sales: "Sales", cash: "Cash", info: "Tip" };

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [cash, setCash] = useState("");
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    try {
      const [products, d, cashCounts] = await Promise.all([
        listProducts(user.uid), loadData(user.uid, addDays(today(), -34)), listCashCounts(user.uid),
      ]);
      setData({ products, ...d, cashCounts });
      const last = cashCounts[cashCounts.length - 1];
      if (last) setCash(String(last.counted));
    } catch (e) {
      setError(getError(e));
    }
  };
  useEffect(() => { load(); }, [user.uid]); // eslint-disable-line

  const result = useMemo(() => (data ? analyse(data, Number(cash) || 0) : null), [data, cash]);

  const demo = async () => {
    setSeeding(true);
    await seedDemo(user.uid);
    await load();
    setSeeding(false);
  };

  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>;
  if (!result) return <p className="text-gray-500">Loading...</p>;

  if (data.products.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-xl border bg-white p-8 text-center">
        <h1 className="text-xl font-bold">Welcome! Let's set up your shop</h1>
        <p className="mt-2 text-sm text-gray-500">Add your products, then record sales. The dashboard fills in as data arrives.</p>
        <Link to="/products" className="mt-5 inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white">Add products</Link>
        <p className="mt-6 text-xs text-gray-400">Just want to see how it works?</p>
        <button onClick={demo} disabled={seeding} className="mt-1 text-sm text-brand-600 underline disabled:opacity-50">
          {seeding ? "Loading demo data..." : "Load demo data"}
        </button>
      </div>
    );
  }

  const { insights, plan, remaining, summary } = result;
  const stat = "rounded-xl border bg-white p-4";

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className={stat}><p className="text-xs text-gray-500">Today's sales</p><p className="text-xl font-bold">{money(summary.revenue)}</p></div>
        <div className={stat}><p className="text-xs text-gray-500">Estimated profit</p><p className="text-xl font-bold text-green-700">{money(summary.profit)}</p></div>
        <div className={stat}><p className="text-xs text-gray-500">Cash sales</p><p className="text-xl font-bold">{money(summary.cash)}</p></div>
        <div className={stat}><p className="text-xs text-gray-500">M-Pesa sales</p><p className="text-xl font-bold">{money(summary.mpesa)}</p></div>
      </section>

      <section>
        <h2 className="text-lg font-bold">What needs your attention</h2>
        {insights.length === 0 && <p className="mt-3 rounded-xl border bg-white p-5 text-sm text-gray-500">Nothing urgent right now. 🎉</p>}
        <div className="mt-3 space-y-3">
          {insights.map((i) => (
            <div key={i.id} className={`rounded-xl border p-4 ${STYLE[i.severity]}`}>
              <div className="flex items-center gap-2">
                <span className="rounded bg-white/70 px-2 py-0.5 text-xs font-medium">{LABEL[i.type]}</span>
                <b>{i.title}</b>
              </div>
              <p className="mt-1 text-sm text-gray-700">{i.detail}</p>
              <p className="mt-1 text-sm font-medium">→ {i.action}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-bold">Restock suggestions</h2>
          <label className="text-xs text-gray-500">Cash available for restocking
            <input type="number" min="0" value={cash} onChange={(e) => setCash(e.target.value)}
              className="ml-2 w-32 rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-600" />
          </label>
        </div>
        {plan.length === 0 ? (
          <p className="mt-3 rounded-xl border bg-white p-5 text-sm text-gray-500">
            {Number(cash) > 0 ? "No restocking needed right now." : "Enter the cash you can spend to get a restock list."}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Buy</th>
                  <th className="px-4 py-3">Cost</th><th className="px-4 py-3">Why</th></tr>
              </thead>
              <tbody>
                {plan.map((p, i) => (
                  <tr key={p.product.id} className="border-t">
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3">{p.product.name}</td>
                    <td className="px-4 py-3">{p.qty}{p.partial && <span className="ml-1 text-xs text-gray-400">(all you can afford)</span>}</td>
                    <td className="px-4 py-3">{money(p.cost)}</td>
                    <td className="px-4 py-3 text-gray-600">{p.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t px-4 py-3 text-sm text-gray-500">
              Total {money(plan.reduce((t, p) => t + p.cost, 0))} · Cash left after buying {money(remaining)}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}