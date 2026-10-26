import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getError } from "../lib/utils";

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ shopName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isRegister) await register(f);
      else await login(f.email, f.password);
      navigate("/");
    } catch (err) {
      setError(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-600";
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{isRegister ? "Create your shop" : "Log in"}</h1>
        {isRegister && <input className={input} placeholder="Shop name" required value={f.shopName} onChange={set("shopName")} />}
        <input className={input} type="email" placeholder="Email" required value={f.email} onChange={set("email")} />
        <input className={input} type="password" placeholder="Password (6+ characters)" required value={f.password} onChange={set("password")} />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white disabled:opacity-50">
          {busy ? "Please wait..." : isRegister ? "Sign up" : "Log in"}
        </button>
        <p className="text-center text-sm text-gray-500">
          {isRegister ? <>Have an account? <Link to="/login" className="text-brand-600 underline">Log in</Link></>
            : <>New here? <Link to="/register" className="text-brand-600 underline">Create a shop</Link></>}
        </p>
      </form>
    </div>
  );
}