// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Paste your Firebase config here (from Firebase console -> Project settings -> Your apps)
const firebaseConfig = {
  apiKey: "AIzaSyCh5N1NjKfSLAVnqwgPs4ZDNwH_lkDsmw0",
  authDomain: "dev-clippers.firebaseapp.com",
  projectId: "dev-clippers",
  storageBucket: "dev-clippers.firebasestorage.app",
  messagingSenderId: "848949133739",
  appId: "1:848949133739:web:ab1dd0facf522462d752ee",
  measurementId: "G-66G5RZ1L9W"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
