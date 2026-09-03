// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db, rtdb } from "../firebase/firebase";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { onDisconnect, onValue, ref, serverTimestamp as rtdbServerTimestamp, set } from "firebase/database";

interface AuthContextType {
  currentUser: User | null;
  showOldChats: boolean;
  setShowOldChatsRemote: (value: boolean) => Promise<void>;
  themeMode: 'light' | 'dark';
  setThemeModeRemote: (mode: 'light' | 'dark') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOldChats, setShowOldChats] = useState<boolean>(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

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
      setThemeMode('light');
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);

    // Ensure doc has the preference with default false
    (async () => {
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, { showOldChats: false, themeMode: 'light' }, { merge: true });
        } else {
          const data = snap.data() as any;
          if (typeof data?.showOldChats !== 'boolean') {
            await setDoc(userRef, { showOldChats: false }, { merge: true });
          }
          if (data?.themeMode !== 'light' && data?.themeMode !== 'dark') {
            await setDoc(userRef, { themeMode: 'light' }, { merge: true });
          }
        }
      } catch (e) {
        // fail-soft: keep default false
        console.warn("Failed to ensure user prefs doc:", e);
      }
    })();

    const unsub = onSnapshot(userRef, (snapshot) => {
      const data = snapshot.data() as { showOldChats?: boolean; themeMode?: 'light' | 'dark' } | undefined;
      setShowOldChats(Boolean(data?.showOldChats));
      if (data?.themeMode === 'dark' || data?.themeMode === 'light') setThemeMode(data.themeMode);
    });

    return () => unsub();
  }, [currentUser?.uid]);

  // Presence: uses Realtime Database's onDisconnect(), which is a promise
  // enforced by Firebase's own servers - it fires the moment the server
  // detects the socket dropped (crash, force-close, killed process, lost
  // network), not just on a graceful page unload. A client-only heartbeat
  // can never do this: a crashed client can't run code to announce it's
  // gone, so it could only ever time out. This writes to RTDB at
  // status/{uid}; a Cloud Function (see functions/index.js) mirrors that
  // into Firestore's users/{uid}.online so the rest of the app doesn't need
  // to know Realtime Database exists.
  useEffect(() => {
    if (!currentUser?.uid) return;
    const statusRef = ref(rtdb, `status/${currentUser.uid}`);
    const connectedRef = ref(rtdb, ".info/connected");

    const unsub = onValue(connectedRef, (snap) => {
      if (snap.val() === false) return;
      // (Re)connected: register the server-side "mark me offline" promise
      // first, then mark ourselves online.
      onDisconnect(statusRef)
        .set({ state: "offline", last_changed: rtdbServerTimestamp() })
        .then(() => {
          set(statusRef, { state: "online", last_changed: rtdbServerTimestamp() });
        });
    });

    return () => {
      unsub();
      // Graceful teardown (logout, or this effect re-running) - don't wait
      // for the server to notice the disconnect.
      set(statusRef, { state: "offline", last_changed: rtdbServerTimestamp() }).catch(() => undefined);
    };
  }, [currentUser?.uid]);

  const setShowOldChatsRemote = useCallback(
    async (value: boolean) => {
      if (!currentUser?.uid) return;
      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(userRef, { showOldChats: value }, { merge: true });
    },
    [currentUser?.uid]
  );

  const setThemeModeRemote = useCallback(
    async (mode: 'light' | 'dark') => {
      if (!currentUser?.uid) return;
      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(userRef, { themeMode: mode }, { merge: true });
    },
    [currentUser?.uid]
  );

  return <AuthContext.Provider value={{ currentUser, showOldChats, setShowOldChatsRemote, themeMode, setThemeModeRemote }}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
