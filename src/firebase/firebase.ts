import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported as isMessagingSupported } from "firebase/messaging";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || undefined,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let messaging: ReturnType<typeof getMessaging> | undefined;

// Defensive check for messaging support (required for insecure contexts/older browsers)
isMessagingSupported()
  .then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    } else {
      console.warn("Firebase Messaging is not supported in this environment (likely an insecure context or unsupported browser).");
    }
  })
  .catch((err) => {
    console.warn("Failed to check for Firebase Messaging support:", err);
  });

let analytics: ReturnType<typeof getAnalytics> | undefined;
// Only initialize Analytics if supported (e.g., not on SSR)
isAnalyticsSupported()
  .then((supported) => {
    if (supported) analytics = getAnalytics(app);
  })
  .catch(() => undefined);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

export const generateToken = async (userId?: string) => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return;
  }

  if (!messaging) {
    console.warn("Messaging is not initialized or supported. Skipping token generation.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // Reuse the app's own registered service worker (public/sw.js, which
    // also carries the Firebase Messaging background handler) instead of
    // letting getToken() try to auto-register the default file name.
    const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.ready : undefined;

    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY || "",
      serviceWorkerRegistration: registration,
    });

    if (userId && token) {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, { fcmToken: token }, { merge: true });
    }
  } catch (error) {
    console.error("Error generating token:", error);
  }
};

export { analytics, auth, db, messaging, rtdb };
export default app;
