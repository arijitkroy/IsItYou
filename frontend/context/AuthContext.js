import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../lib/firebase";

const AuthContext = createContext({
  user: null,
  loading: true,
  isConfigured: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const isConfig = isFirebaseConfigured();
    setConfigured(isConfig);

    if (!isConfig || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    if (!auth) throw new Error("Firebase Authentication is not configured.");
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email, password) => {
    if (!auth) throw new Error("Firebase Authentication is not configured.");
    return await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (!auth) return;
    return await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isConfigured: configured, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
