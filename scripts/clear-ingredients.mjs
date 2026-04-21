/**
 * Clear all ingredients from Firestore.
 *
 * Run: node scripts/clear-ingredients.mjs
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCTrgQ3B1qEcc2_vNxCs-WmrxcbOw5uzBQ",
  authDomain: "resteraunt-margins-tracker.firebaseapp.com",
  projectId: "resteraunt-margins-tracker",
  storageBucket: "resteraunt-margins-tracker.firebasestorage.app",
  messagingSenderId: "83303772940",
  appId: "1:83303772940:web:5140d561f07b44bda10f29",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  console.log("Signing in as rajesh@hfscatering.in...");
  await signInWithEmailAndPassword(
    auth,
    "rajesh@hfscatering.in",
    "HFSCoimbatore2024!",
  );
  console.log("Signed in.\n");

  const snap = await getDocs(collection(db, "ingredients"));
  console.log(`Found ${snap.size} ingredients. Deleting...`);

  let count = 0;
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
    count++;
    if (count % 25 === 0) console.log(`  deleted ${count}/${snap.size}`);
  }

  console.log(`\nDone. ${count} ingredients deleted.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
