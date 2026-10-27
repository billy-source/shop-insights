import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listCashCounts, loadData, saveCashCount } from "../services/shop";
import { cashFlow } from "../lib/insights";
import { addDays, getError, money, today } from "../lib/utils";

export default function CashCount() {
  const { user } = useAuth();
  const t = today();
  const [info, setInfo] = useState(null);
  const [counted, setCounted] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    (async () => {
      const counts = await listCashCounts(user.uid);
      const base = [...counts].reverse().find((c) => c.date < t) || null; // last count before today
      const data = await loadData(user.uid, base ? base.date : addDays(t, -35));
      const flow = base ? cashFlow(data, base.date, t) : null;
      const existing = counts.find((c) => c.date === t);
      setInfo({ base, flow, expected: base ? base.counted + flow.net : null });
      if (existing) setCounted(String(existing.counted));
    })();
  }, [user.uid, t]);

  const save = async (e) => {
    e.preventDefault();
    const c = Number(counted);
    const hasExpected = info.expected != null;
    try {
      await saveCashCount(user.uid, {
        date: t, counted: c, hasExpected,
        expected: hasExpected ? info.expected : c,
        difference: hasExpected ? c - info.expected : 0,
        baselineDate: info.base?.date || null,
      });
      const diff = c - info.expected;
      setMsg({
        type: !hasExpected || Math.abs(diff) <= 100 ? "ok" : "err",
        text: !hasExpected ? "Starting balance saved. Tomorrow's count will be checked against it."
          : Math.abs(diff) <= 100 ? "Cash matches your records."
          : `Mismatch: you are ${diff > 0 ? "over" : "short"} by ${money(Math.abs(diff))}.`,
      });
    } catch (err) {
      setMsg({ type: "err", text: getError(err) });
    }
  };

  if (!info) return <p className="text-gray-500">Loading...</p>;
  const { base, flow, expected } = info;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold">Cash count</h1>
      {base ? (
        <div className="mt-4 space-y-1 rounded-xl border bg-white p-5 text-sm">
          <Row label={`Counted on ${base.date}`} value={money(base.counted)} />
          <Row label="+ Cash sales since then" value={money(flow.sales)} />
          <Row label="− Cash restocks" value={money(flow.restocks)} />
          <Row label="− Cash expenses" value={money(flow.expenses)} />
          <div className="mt-2 border-t pt-2"><Row label="Expected cash now" value={money(expected)} bold /></div>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border bg-white p-5 text-sm text-gray-600">
          This is your first count. Count the cash in your till now. It becomes your starting balance, and future counts are checked against it.
        </p>
      )}
      <form onSubmit={save} className="mt-4 space-y-3 rounded-xl border bg-white p-5">
        <label className="text-sm text-gray-500">Cash actually in the till
          <input type="number" min="0" step="0.01" required value={counted} onChange={(e) => setCounted(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-gray-800 outline-none focus:border-brand-600" />
        </label>
        <button className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white">Save count</button>
        {msg.text && (
          <p className={`rounded-lg px-3 py-2 text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>
        )}
      </form>
    </div>
  );
}

const Row = ({ label, value, bold }) => (
  <div className={`flex justify-between ${bold ? "font-bold" : ""}`}><span>{label}</span><span>{value}</span></div>
);