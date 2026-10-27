import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { addExpense, listProducts, recordRestock } from "../services/shop";
import { getError, today } from "../lib/utils";

const Method = ({ value, onChange }) => (
  <select value={value} onChange={onChange} className="w-full rounded-lg border bg-white px-3 py-2 text-sm">
    <option value="cash">Paid with cash</option>
    <option value="mpesa">Paid with M-Pesa</option>
  </select>
);

export default function Purchases() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [r, setR] = useState({ productId: "", qty: "", unitCost: "", method: "cash" });
  const [x, setX] = useState({ description: "", amount: "", method: "cash" });
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => { listProducts(user.uid).then(setProducts); }, [user.uid]);

  const pick = (id) => {
    const p = products.find((p) => p.id === id);
    setR({ ...r, productId: id, unitCost: p ? String(p.buyPrice) : "" });
  };

  const run = async (fn, okText, reset) => {
    setMsg({ type: "", text: "" });
    try {
      await fn();
      reset();
      setMsg({ type: "ok", text: okText });
      setProducts(await listProducts(user.uid));
    } catch (e) {
      setMsg({ type: "err", text: getError(e) });
    }
  };

  const submitRestock = (e) => {
    e.preventDefault();
    const product = products.find((p) => p.id === r.productId);
    if (!product) return;
    run(
      () => recordRestock(user.uid, { product, qty: Number(r.qty), unitCost: Number(r.unitCost), method: r.method, date: today() }),
      `Restocked ${r.qty} × ${product.name}.`,
      () => setR({ productId: "", qty: "", unitCost: "", method: "cash" })
    );
  };

  const submitExpense = (e) => {
    e.preventDefault();
    run(
      () => addExpense(user.uid, { description: x.description.trim(), amount: Number(x.amount), method: x.method, date: today() }),
      "Expense recorded.",
      () => setX({ description: "", amount: "", method: "cash" })
    );
  };

  const input = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-600";
  return (
    <div>
      <h1 className="text-2xl font-bold">Restock & expenses</h1>
      <p className="mt-1 text-sm text-gray-500">Record these every time money leaves the till, or your cash check will show false mismatches.</p>
      {msg.text && (
        <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>
      )}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <form onSubmit={submitRestock} className="space-y-3 rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Restock a product</h2>
          <select className={input} required value={r.productId} onChange={(e) => pick(e.target.value)}>
            <option value="">Choose product...</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} (stock {p.stock})</option>)}
          </select>
          <input className={input} type="number" min="1" placeholder="Quantity bought" required value={r.qty} onChange={(e) => setR({ ...r, qty: e.target.value })} />
          <input className={input} type="number" min="0" step="0.01" placeholder="Cost per unit" required value={r.unitCost} onChange={(e) => setR({ ...r, unitCost: e.target.value })} />
          <Method value={r.method} onChange={(e) => setR({ ...r, method: e.target.value })} />
          <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white">Save restock</button>
        </form>

        <form onSubmit={submitExpense} className="space-y-3 rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Record an expense</h2>
          <input className={input} placeholder="What was it for? (rent, transport, wages...)" required value={x.description} onChange={(e) => setX({ ...x, description: e.target.value })} />
          <input className={input} type="number" min="1" step="0.01" placeholder="Amount" required value={x.amount} onChange={(e) => setX({ ...x, amount: e.target.value })} />
          <Method value={x.method} onChange={(e) => setX({ ...x, method: e.target.value })} />
          <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white">Save expense</button>
        </form>
      </div>
    </div>
  );
}