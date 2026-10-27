export const fmt = (d) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD
export const today = () => fmt(new Date());

export const addDays = (s, n) => {
  const d = new Date(`${s}T12:00:00`);
  d.setDate(d.getDate() + n);
  return fmt(d);
};

// number of days from a to b (b minus a)
export const diffDays = (a, b) =>
  Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000);

export const money = (n) => `KES ${Math.round(Number(n) || 0).toLocaleString()}`;

export function getError(err) {
  const map = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/email-already-in-use": "That email is already registered.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "permission-denied": "You don't have permission to do that.",
  };
  return map[err?.code] || err?.message || "Something went wrong.";
}