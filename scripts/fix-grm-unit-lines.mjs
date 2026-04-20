/**
 * Fix recipe lines whose unit is "grm" (typo for "g") — normalize to "g",
 * recompute costPerUnit + lineCost against the matched ingredient's stored
 * unit, and recompute the parent recipe's totalRecipeCost + costPerServing.
 *
 * Emits before/after for each line so a human can eyeball whether the
 * original quantity was meant as grams or as some other unit (e.g., 3.5 "grm"
 * of atta for 100 rotis is almost certainly 3.5 KG — that's a data-entry
 * issue this migration does NOT try to guess; it just makes the stored
 * numbers consistent.)
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  collectionGroup,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCTrgQ3B1qEcc2_vNxCs-WmrxcbOw5uzBQ",
  authDomain: "resteraunt-margins-tracker.firebaseapp.com",
  projectId: "resteraunt-margins-tracker",
  storageBucket: "resteraunt-margins-tracker.firebasestorage.app",
  messagingSenderId: "83303772940",
  appId: "1:83303772940:web:5140d561f07b44bda10f29",
};

// oz base — mirrors src/lib/constants/units.ts
const UNITS = {
  oz: { type: "weight", toBase: 1 },
  lb: { type: "weight", toBase: 16 },
  g: { type: "weight", toBase: 0.035274 },
  kg: { type: "weight", toBase: 35.274 },
  ml: { type: "volume", toBase: 0.033814 },
  liter: { type: "volume", toBase: 33.814 },
};

function convertCostPerUnit(baseUnit, baseCostPerUnit, targetUnit) {
  if (baseUnit === targetUnit) return baseCostPerUnit;
  const b = UNITS[baseUnit];
  const t = UNITS[targetUnit];
  if (!b || !t || b.type !== t.type) return null;
  return baseCostPerUnit * (t.toBase / b.toBase);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await signInWithEmailAndPassword(
  auth,
  "rajesh@hfscatering.in",
  "HFSCoimbatore2024!"
);

const ingSnap = await getDocs(collection(db, "ingredients"));
const ingById = new Map();
for (const d of ingSnap.docs) ingById.set(d.id, d.data());

const lineSnap = await getDocs(collectionGroup(db, "lines"));
const target = lineSnap.docs.filter((d) => d.data().unit === "grm");

console.log(`Found ${target.length} lines with unit="grm".\n`);

const touchedRecipeIds = new Set();

for (const d of target) {
  const data = d.data();
  const recipeId = d.ref.parent.parent?.id;
  const ing = ingById.get(data.ingredientId);
  if (!ing) {
    console.log(
      `  ⚠ Skipping line ${d.id} — ingredient ${data.ingredientId} not found.`
    );
    continue;
  }

  const newCostPerUnit = convertCostPerUnit(ing.unit, ing.costPerUnit, "g");
  if (newCostPerUnit === null) {
    console.log(
      `  ⚠ Skipping line ${d.id} (${data.ingredientName}) — can't convert ${ing.unit} to g`
    );
    continue;
  }
  const newLineCost = Number((data.quantity * newCostPerUnit).toFixed(4));

  console.log(
    `  [${data.ingredientName}] ${data.quantity} grm @ ₹${data.costPerUnit} = ₹${data.lineCost}`
  );
  console.log(
    `    → ${data.quantity} g @ ₹${newCostPerUnit.toFixed(
      6
    )}/g = ₹${newLineCost}`
  );

  await updateDoc(d.ref, {
    unit: "g",
    costPerUnit: Number(newCostPerUnit.toFixed(6)),
    lineCost: newLineCost,
  });
  if (recipeId) touchedRecipeIds.add(recipeId);
}

console.log(
  `\nRecomputing totals on ${touchedRecipeIds.size} recipe(s)...`
);

for (const rid of touchedRecipeIds) {
  const recRef = doc(db, "recipes", rid);
  const recSnap = await getDoc(recRef);
  if (!recSnap.exists()) continue;
  const recipe = recSnap.data();

  const subSnap = await getDocs(collection(db, "recipes", rid, "lines"));
  const total = subSnap.docs.reduce(
    (s, d) => s + Number(d.data().lineCost || 0),
    0
  );
  const servings = Number(recipe.servings) || 1;
  const costPerServing = total / servings;
  await updateDoc(recRef, {
    totalRecipeCost: Number(total.toFixed(2)),
    costPerServing: Number(costPerServing.toFixed(2)),
    updatedAt: new Date(),
  });
  console.log(
    `  [${recipe.name}] total ₹${total.toFixed(2)} · ₹${costPerServing.toFixed(
      2
    )}/serving (${servings} servings)`
  );
}

console.log("\nDone.");
process.exit(0);
