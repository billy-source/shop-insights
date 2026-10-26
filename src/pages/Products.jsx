import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listProducts, removeProduct, saveProduct } from "../services/shop";
import { uploadImage } from "../services/cloudinary";
import { getError, money } from "../lib/utils";

const EMPTY = { name: "", category: "", buyPrice: "", sellPrice: "", stock: "", leadTimeDays: 2, photoUrl: "" };

export default function Products() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    listProducts(user.uid).then(setItems).catch((e) => setError(getError(e)));
  }, [user.uid]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onPhoto = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, photoUrl: url }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveProduct(user.uid, editId, form);
      setForm(null);
      setEditId(null);
      load();
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    if (!confirm(`Remove ${p.name}? Past sales stay in your reports.`)) return;
    await removeProduct(user.uid, p.id);
    load();
  };

  const input = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-600";
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        {!form && (
          <button onClick={() => { setForm(EMPTY); setEditId(null); }}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">+ Add product</button>
        )}
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {form && (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border bg-white p-5">
          <h2 className="font-semibold">{editId ? "Edit product" : "New product"}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input className={input} placeholder="Name" required value={form.name} onChange={set("name")} />
            <input className={input} placeholder="Category (optional)" value={form.category} onChange={set("category")} />
            <input className={input} type="number" min="0" placeholder="Stock on hand" required value={form.stock} onChange={set("stock")} />
            <input className={input} type="number" min="0" step="0.01" placeholder="Buying price" required value={form.buyPrice} onChange={set("buyPrice")} />
            <input className={input} type="number" min="0" step="0.01" placeholder="Selling price" required value={form.sellPrice} onChange={set("sellPrice")} />
            <label className="text-xs text-gray-500">Supplier delivery time (days)
              <input className={input} type="number" min="0" value={form.leadTimeDays} onChange={set("leadTimeDays")} />
            </label>
          </div>
          <div className="flex items-center gap-3">
            {form.photoUrl && <img src={form.photoUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />}
            <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files[0])} className="text-sm" />
          </div>
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
              {busy ? "Working..." : "Save"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg border px-5 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Buy</th><th className="px-4 py-3">Sell</th>
              <th className="px-4 py-3">Stock</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="flex items-center gap-3 px-4 py-3">
                  {p.photoUrl
                    ? <img src={p.photoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-400">{p.name[0]}</div>}
                  <div>{p.name}<div className="text-xs text-gray-400">{p.category}</div></div>
                </td>
                <td className="px-4 py-3">{money(p.buyPrice)}</td>
                <td className="px-4 py-3">{money(p.sellPrice)}</td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setForm({ ...EMPTY, ...p }); setEditId(p.id); }} className="mr-2 text-brand-600">Edit</button>
                  <button onClick={() => remove(p)} className="text-red-600">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="p-8 text-center text-gray-500">No products yet.</p>}
      </div>
    </div>
  );
}