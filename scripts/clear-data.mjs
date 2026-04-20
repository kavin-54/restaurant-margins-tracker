/**
 * Clear all demo data from Firestore.
 *
 * Wipes every collection used by the app EXCEPT:
 *   - users         (auth profiles — would break login)
 *   - systemConfig  (app settings, not demo data)
 *
 * Run: node scripts/clear-data.mjs
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

const COLLECTIONS_TO_CLEAR = [
  "vendors",
  "ingredients",
  "clients",
  "recipes",
  "events",
  "purchaseOrders",
  "wasteLog",
  "inventory",
  "inventoryAdjustments",
];

const KNOWN_SUBCOLLECTIONS = ["menuItems", "lines", "vendorRecords"];

async function clearCollection(name) {
  const snap = await getDocs(collection(db, name));
  let count = 0;
  for (const d of snap.docs) {
    for (const sub of KNOWN_SUBCOLLECTIONS) {
      try {
        const subSnap = await getDocs(collection(db, name, d.id, sub));
        for (const sd of subSnap.docs) await deleteDoc(sd.ref);
      } catch {}
    }
    await deleteDoc(d.ref);
    count++;
  }
  return count;
}

async function main() {
  console.log("Signing in as rajesh@hfscatering.in...");
  await signInWithEmailAndPassword(
    auth,
    "rajesh@hfscatering.in",
    "HFSCoimbatore2024!",
  );
  console.log("Signed in.\n");

  console.log("Clearing collections:");
  for (const col of COLLECTIONS_TO_CLEAR) {
    const n = await clearCollection(col);
    console.log(`  ${col}: ${n} docs deleted`);
  }

  console.log("\nDone. `users` and `systemConfig` preserved.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
