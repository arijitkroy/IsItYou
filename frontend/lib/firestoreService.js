import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc 
} from "firebase/firestore";
import { db, auth } from "./firebase";

const assertVerifiedAuth = () => {
  if (auth && auth.currentUser && auth.currentUser.emailVerified === false) {
    throw new Error("Access denied: Verified email required to perform biometric database operations.");
  }
};

export const saveUserProfile = async (userId, profileData) => {
  if (!db || !userId || !profileData || !profileData.id) {
    throw new Error("Firestore is not initialized or user is unauthenticated.");
  }

  assertVerifiedAuth();

  const profileRef = doc(db, "users", userId, "profiles", profileData.id);
  const dataToSave = {
    ...profileData,
    user_id: userId,
    updated_at: new Date().toISOString()
  };

  await setDoc(profileRef, dataToSave, { merge: true });
  return dataToSave;
};

export const getUserProfiles = async (userId) => {
  if (!db || !userId) return [];

  try {
    assertVerifiedAuth();
  } catch (authErr) {
    return [];
  }

  try {
    const profilesCol = collection(db, "users", userId, "profiles");
    const snapshot = await getDocs(profilesCol);
    const profiles = [];
    snapshot.forEach((docSnap) => {
      profiles.push({ id: docSnap.id, ...docSnap.data() });
    });
    return profiles;
  } catch (err) {
    console.error("Failed to load profiles from Firestore:", err);
    return [];
  }
};

export const deleteUserProfile = async (userId, profileId) => {
  if (!db || !userId || !profileId) return false;

  assertVerifiedAuth();

  try {
    const profileRef = doc(db, "users", userId, "profiles", profileId);
    await deleteDoc(profileRef);
    return true;
  } catch (err) {
    console.error("Failed to delete profile from Firestore:", err);
    return false;
  }
};
