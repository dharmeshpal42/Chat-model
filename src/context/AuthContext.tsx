// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";

interface AuthContextType {
  currentUser: User | null;
  showOldChats: boolean;
  setShowOldChatsRemote: (value: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOldChats, setShowOldChats] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Subscribe to user preferences in Firestore
  useEffect(() => {
    if (!currentUser?.uid) {
      setShowOldChats(false);
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);

    // Ensure doc has the preference with default false
    (async () => {
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, { showOldChats: false }, { merge: true });
        } else if (typeof snap.data()?.showOldChats !== "boolean") {
          await setDoc(userRef, { showOldChats: false }, { merge: true });
        }
      } catch (e) {
        // fail-soft: keep default false
        console.warn("Failed to ensure user prefs doc:", e);
      }
    })();

    const unsub = onSnapshot(userRef, (snapshot) => {
      const data = snapshot.data() as { showOldChats?: boolean } | undefined;
      setShowOldChats(Boolean(data?.showOldChats));
    });

    return () => unsub();
  }, [currentUser?.uid]);

  const setShowOldChatsRemote = useCallback(
    async (value: boolean) => {
      if (!currentUser?.uid) return;
      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(userRef, { showOldChats: value }, { merge: true });
    },
    [currentUser?.uid]
  );

  return <AuthContext.Provider value={{ currentUser, showOldChats, setShowOldChatsRemote }}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
