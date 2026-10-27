import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listProducts, recordSale } from "../services/shop";
import { getError, money } from "../lib/utils";

export default function Sell() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [method, setMethod] = useState("cash");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => { listProducts(user.uid).then(setProducts); }, [user.uid]);
  useEffect(() => { load(); }, [load]);

  const change = (id, delta) =>
    setCart((c) => {
      const q = (c[id] || 0) + delta;
      const next = { ...c };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });

  const lines = products.filter((p) => cart[p.id]).map((p) => ({ product: p, qty: cart[p.id], unitPrice: p.sellPrice }));
  const total = lines.reduce((t, l) => t + l.qty * l.unitPrice, 0);
  const shown = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const checkout = async () => {
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      await recordSale(user.uid, lines, method);
      setCart({});
      setMsg({ type: "ok", text: `Sale recorded: ${money(total)} (${method === "cash" ? "cash" : "M-Pesa"})` });
      load();
    } catch (e) {
      setMsg({ type: "err", text: getError(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2">
        <h1 className="text-2xl font-bold">Sell</h1>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
          className="mt-4 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-600" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shown.map((p) => (
            <button key={p.id} onClick={() => change(p.id, 1)}
              className="rounded-xl border bg-white p-3 text-left shadow-sm transition hover:border-brand-600 active:scale-95">
              {p.photoUrl
                ? <img src={p.photoUrl} alt="" className="h-20 w-full rounded-lg object-cover" />
                : <div className="flex h-20 items-center justify-center rounded-lg bg-gray-100 text-2xl text-gray-300">{p.name[0]}</div>}
              <div className="mt-2 text-sm font-medium leading-tight">{p.name}</div>
              <div className="text-sm text-brand-700">{money(p.sellPrice)}</div>
              <div className={`text-xs ${p.stock <= 0 ? "text-red-600" : "text-gray-400"}`}>{p.stock} in stock</div>
            </button>
          ))}
        </div>
        {products.length === 0 && <p className="mt-10 text-center text-gray-500">Add products first.</p>}
      </div>

      <div className="h-fit rounded-xl border bg-white p-4 shadow-sm md:sticky md:top-4">
        <h2 className="font-semibold">Current sale</h2>
        {lines.length === 0 && <p className="mt-3 text-sm text-gray-400">Tap a product to add it.</p>}
        <div className="mt-3 space-y-2">
          {lines.map((l) => (
            <div key={l.product.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex-1">{l.product.name}
                {l.qty > l.product.stock && <span className="block text-xs text-red-600">Only {l.product.stock} recorded in stock</span>}
              </span>
              <button onClick={() => change(l.product.id, -1)} className="h-7 w-7 rounded border">−</button>
              <span className="w-6 text-center">{l.qty}</span>
              <button onClick={() => change(l.product.id, 1)} className="h-7 w-7 rounded border">+</button>
              <span className="w-20 text-right">{money(l.qty * l.unitPrice)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          {["cash", "mpesa"].map((m) => (
            <button key={m} onClick={() => setMethod(m)}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium ${method === m ? "border-brand-600 bg-brand-50 text-brand-700" : ""}`}>
              {m === "cash" ? "Cash" : "M-Pesa"}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-between text-lg font-bold"><span>Total</span><span>{money(total)}</span></div>
        <button disabled={!lines.length || saving} onClick={checkout}
          className="mt-3 w-full rounded-lg bg-brand-600 py-3 font-semibold text-white disabled:opacity-40">
          {saving ? "Saving..." : "Record sale"}
        </button>
        {msg.text && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>
        )}
      </div>
    </div>
  );
}