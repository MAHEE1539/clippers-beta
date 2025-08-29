// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Paste your Firebase config here (from Firebase console -> Project settings -> Your apps)
const firebaseConfig = {
  apiKey: "AIzaSyAtFg3DekJQovczgCmNFlIgK0U41NwwKPw",
  authDomain: "cafe-qr-d8169.firebaseapp.com",
  projectId: "cafe-qr-d8169",
  storageBucket: "cafe-qr-d8169.firebasestorage.app",
  messagingSenderId: "264802299842",
  appId: "1:264802299842:web:afb706c42fe0a90c54b05b",
  measurementId: "G-69EJPWP2H9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
