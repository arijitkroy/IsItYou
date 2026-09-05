import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../lib/firebase";

const AuthContext = createContext({
  user: null,
  isEmailVerified: false,
  loading: true,
  isConfigured: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  sendVerificationEmail: async () => {},
  reloadUser: async () => false,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
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
      setIsEmailVerified(Boolean(currentUser?.emailVerified));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    if (!auth) throw new Error("Firebase Authentication is not configured.");
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setUser(cred.user);
    setIsEmailVerified(Boolean(cred.user?.emailVerified));
    return cred;
  };

  const signup = async (email, password) => {
    if (!auth) throw new Error("Firebase Authentication is not configured.");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await sendEmailVerification(cred.user);
    } catch (err) {
      console.warn("sendEmailVerification notice:", err.message);
    }
    setUser(cred.user);
    setIsEmailVerified(Boolean(cred.user?.emailVerified));
    return cred;
  };

  const sendVerificationEmail = async () => {
    if (!auth || !auth.currentUser) {
      throw new Error("No active user session found.");
    }
    await sendEmailVerification(auth.currentUser);
    return true;
  };

  const reloadUser = async () => {
    if (!auth || !auth.currentUser) return false;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    const verified = Boolean(auth.currentUser.emailVerified);
    setIsEmailVerified(verified);
    setUser(auth.currentUser);
    return verified;
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null);
    setIsEmailVerified(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isEmailVerified,
      loading,
      isConfigured: configured,
      login,
      signup,
      logout,
      sendVerificationEmail,
      reloadUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
