/**
 * Convert packet/bottle ingredients to proper weight/volume units
 * where the pack size is known from the HFS item name. After this,
 * recipes can specify quantities in grams, ml, kg, or L and the
 * line cost will compute correctly.
 *
 * Run: node scripts/fix-pack-units.mjs
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

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

// [docId, newName, newUnit, newCostPerUnit]
const updates = [
  ["hfs-170008", "Asafoetida Powder",       "kg",    1411.60],
  ["hfs-170561", "Asafoetida Cake",         "kg",    1390.60],
  ["hfs-170028", "Chat Masala",             "kg",     714.30],
  ["hfs-170290", "Channa Masala",           "kg",     752.40],
  ["hfs-170500", "Gulab Jamun MTR",         "kg",     715.83],
  ["hfs-170558", "Semiya Anil",             "kg",      95.28],
  ["hfs-170161", "Ragi Semiya",             "kg",     124.33],
  ["hfs-170078", "Egg Noodles",             "kg",     109.50],
  ["hfs-170007", "Appalam",                 "kg",     125.00],
  ["hfs-130040", "Cheese Slice (Amul)",     "kg",     452.07],
  ["hfs-re0001", "Refined Oil Aadhaar",     "liter",  116.00],
  ["hfs-130043", "Curd",                    "liter",   52.39],
  ["hfs-170576", "Ghee",                    "liter",  560.00],
  ["hfs-170203", "Vinegar",                 "liter",   42.86],
  ["hfs-170157", "Pickle Mango",            "kg",      53.60],
];

async function main() {
  console.log("Signing in...");
  await signInWithEmailAndPassword(
    auth,
    "rajesh@hfscatering.in",
    "HFSCoimbatore2024!",
  );
  console.log(`Signed in. Updating ${updates.length} ingredients...\n`);

  const now = new Date();
  for (const [id, name, unit, costPerUnit] of updates) {
    await updateDoc(doc(db, "ingredients", id), {
      name,
      unit,
      costPerUnit,
      updatedAt: now,
    });
    console.log(`  ${name} → ${costPerUnit}/${unit}`);
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
