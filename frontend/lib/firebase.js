import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const getFirebaseConfig = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("is_it_you_firebase_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      } catch (e) {}
    }
  }

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
};

export const isFirebaseConfigured = () => {
  const config = getFirebaseConfig();
  return Boolean(
    config.apiKey &&
    config.apiKey !== "your_api_key_here" &&
    config.projectId &&
    config.projectId !== "your_project_id"
  );
};

export const initFirebase = () => {
  const config = getFirebaseConfig();
  if (!getApps().length) {
    if (config.apiKey && config.projectId) {
      try {
        return initializeApp(config);
      } catch (err) {
        return null;
      }
    }
    return null;
  }
  return getApp();
};

const app = initFirebase();
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export const saveCustomFirebaseConfig = (config) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("is_it_you_firebase_config", JSON.stringify(config));
    window.location.reload();
  }
};

export const clearCustomFirebaseConfig = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("is_it_you_firebase_config");
    window.location.reload();
  }
};
