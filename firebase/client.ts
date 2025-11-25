import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA55WKeU1WLNeOA0tAz9NyAkL880Xl8t8A",
  authDomain: "echomock-2bf57.firebaseapp.com",
  projectId: "echomock-2bf57",
  storageBucket: "echomock-2bf57.firebasestorage.app",
  messagingSenderId: "33546554722",
  appId: "1:33546554722:web:7504318bc94a2679a8f03b",
  measurementId: "G-GMXGR1HGJP",
};

const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
