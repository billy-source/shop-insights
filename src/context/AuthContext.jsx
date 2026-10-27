import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const registering = useRef(false);

  const loadShop = async (uid) => {
    const snap = await getDoc(doc(db, "shops", uid));
    return snap.exists() ? snap.data() : null;
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (registering.current) return; // register() sets the state itself
      setUser(u);
      setShop(u ? await loadShop(u.uid) : null);
      setLoading(false);
    });
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setShop(await loadShop(cred.user.uid));
    setUser(cred.user);
  };

  const register = async ({ email, password, shopName }) => {
    registering.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "shops", cred.user.uid), { name: shopName, createdAt: serverTimestamp() });
      setShop({ name: shopName });
      setUser(cred.user);
    } finally {
      registering.current = false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setShop(null);
  };

  return (
    <AuthContext.Provider value={{ user, shop, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}