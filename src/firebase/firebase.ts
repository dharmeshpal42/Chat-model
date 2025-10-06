// // src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDlL-uTbOVjdmPhOG0CJzLRRBm4LxJyuvU",
  authDomain: "chat-app-f9def.firebaseapp.com",
  projectId: "chat-app-f9def",
  storageBucket: "chat-app-f9def.firebasestorage.app",
  messagingSenderId: "644786107012",
  appId: "1:644786107012:web:e47a936020e9a4f8b1c8d1",
  measurementId: "G-PZQFSHRTJ7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, analytics };
export default app;
