import {
  addDoc, collection, doc, getDocs, increment, query, serverTimestamp, updateDoc, where, writeBatch, setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { addDays, today } from "../lib/utils";

const col = (uid, name) => collection(db, "shops", uid, name);
const pDoc = (uid, id) => doc(db, "shops", uid, "products", id);
const withId = (d) => ({ id: d.id, ...d.data() });
const num = (v) => Number(v) || 0;

export async function listProducts(uid) {
  const snap = await getDocs(col(uid, "products"));
  return snap.docs.map(withId).filter((p) => p.isActive !== false).sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveProduct(uid, id, f) {
  const data = {
    name: f.name.trim(), category: (f.category || "").trim(),
    buyPrice: num(f.buyPrice), sellPrice: num(f.sellPrice), stock: num(f.stock),
    leadTimeDays: num(f.leadTimeDays) || 2, photoUrl: f.photoUrl || "",
  };
  if (id) return updateDoc(pDoc(uid, id), data);
  return addDoc(col(uid, "products"), { ...data, isActive: true, createdAt: serverTimestamp() });
}

export const removeProduct = (uid, id) => updateDoc(pDoc(uid, id), { isActive: false });

// lines: [{ product, qty, unitPrice }]. Saves the sales and lowers stock in one atomic batch.
export async function recordSale(uid, lines, method, date = today()) {
  const batch = writeBatch(db);
  lines.forEach((l) => {
    batch.set(doc(col(uid, "sales")), {
      productId: l.product.id, productName: l.product.name, qty: l.qty,
      unitPrice: l.unitPrice, unitCost: l.product.buyPrice, method, date, createdAt: serverTimestamp(),
    });
    batch.update(pDoc(uid, l.product.id), { stock: increment(-l.qty) });
  });
  await batch.commit();
}

export async function recordRestock(uid, { product, qty, unitCost, method, date }) {
  const batch = writeBatch(db);
  batch.set(doc(col(uid, "restocks")), {
    productId: product.id, productName: product.name, qty, unitCost, method, date, createdAt: serverTimestamp(),
  });
  batch.update(pDoc(uid, product.id), { stock: increment(qty), buyPrice: unitCost });
  await batch.commit();
}

export const addExpense = (uid, { description, amount, method, date }) =>
  addDoc(col(uid, "expenses"), { description, amount, method, date, createdAt: serverTimestamp() });

export async function loadData(uid, since) {
  const get = async (name) =>
    (await getDocs(query(col(uid, name), where("date", ">=", since)))).docs.map(withId);
  const [sales, restocks, expenses] = await Promise.all([get("sales"), get("restocks"), get("expenses")]);
  return { sales, restocks, expenses };
}

export async function listCashCounts(uid) {
  const snap = await getDocs(col(uid, "cashCounts"));
  return snap.docs.map(withId).sort((a, b) => a.date.localeCompare(b.date));
}

export const saveCashCount = (uid, record) => setDoc(doc(db, "shops", uid, "cashCounts", record.date), record);

// Test data: 8 products and 35 days of sales, so the insights can be tried straight away
export async function seedDemo(uid) {
  const demo = [
    // name, category, buy, sell, stock, lead days, sold per day
    ["Cooking oil 1L", "Groceries", 260, 310, 10, 2, 6],
    ["Sugar 1kg", "Groceries", 150, 180, 60, 2, 5],
    ["Maize flour 2kg", "Groceries", 170, 200, 25, 2, 8],
    ["Tea leaves 250g", "Groceries", 90, 120, 40, 2, 6],
    ["Soda 500ml", "Drinks", 40, 60, 80, 1, 12],
    ["Rice 1kg", "Groceries", 140, 170, 30, 2, 4],
    ["Soap bar", "Household", 35, 50, 50, 3, 5],
    ["Eggs tray", "Groceries", 380, 450, 12, 2, 3],
  ];
  const t = today();
  const batch = writeBatch(db);
  const refs = demo.map(([name, category, buy, sell, stock, lead]) => {
    const ref = doc(col(uid, "products"));
    batch.set(ref, { name, category, buyPrice: buy, sellPrice: sell, stock, leadTimeDays: lead,
      photoUrl: "", isActive: true, createdAt: serverTimestamp() });
    return ref;
  });
  demo.forEach((d, i) => {
    for (let age = 0; age < 35; age++) {
      let rate = d[6];
      if (i === 3 && age < 7) rate *= 0.3; // tea starts selling slowly this week
      const qty = Math.max(0, Math.round(rate + (Math.random() - 0.5) * 2));
      if (qty > 0) {
        batch.set(doc(col(uid, "sales")), {
          productId: refs[i].id, productName: d[0], qty, unitPrice: d[3], unitCost: d[2],
          method: Math.random() < 0.6 ? "cash" : "mpesa", date: addDays(t, -age), createdAt: serverTimestamp(),
        });
      }
    }
  });
  await batch.commit();
}