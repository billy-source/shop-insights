import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  ["/", "Dashboard"], ["/sell", "Sell"], ["/products", "Products"],
  ["/purchases", "Restock & expenses"], ["/cash", "Cash count"],
];

export default function Layout() {
  const { shop, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <b className="text-lg text-brand-700">{shop?.name || "My shop"}</b>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-600">Log out</button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:text-brand-600"}`}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6"><Outlet /></main>
    </div>
  );
}