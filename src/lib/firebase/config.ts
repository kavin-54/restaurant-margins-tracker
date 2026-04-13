import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCTrgQ3B1qEcc2_vNxCs-WmrxcbOw5uzBQ",
  authDomain: "resteraunt-margins-tracker.firebaseapp.com",
  projectId: "resteraunt-margins-tracker",
  storageBucket: "resteraunt-margins-tracker.firebasestorage.app",
  messagingSenderId: "83303772940",
  appId: "1:83303772940:web:7cf68a8b9b0dcb11a10f29",
  measurementId: "G-9VBTESKPXM",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
