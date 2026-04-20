/**
 * Scan every recipe line and flag any line whose `unit` is either:
 *   (a) not in the canonical UNITS table (unknown unit — silent conversion
 *       failure, line cost ends up in wrong units)
 *   (b) in a different measurement type than its ingredient's stored unit
 *       (same cross-type hazard we hit on the curd line)
 *
 * Read-only — reports the damage; does not write.
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  collectionGroup,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCTrgQ3B1qEcc2_vNxCs-WmrxcbOw5uzBQ",
  authDomain: "resteraunt-margins-tracker.firebaseapp.com",
  projectId: "resteraunt-margins-tracker",
  storageBucket: "resteraunt-margins-tracker.firebasestorage.app",
  messagingSenderId: "83303772940",
  appId: "1:83303772940:web:5140d561f07b44bda10f29",
};

const UNITS = [
  { value: "oz", type: "weight" },
  { value: "lb", type: "weight" },
  { value: "g", type: "weight" },
  { value: "kg", type: "weight" },
  { value: "tsp", type: "volume" },
  { value: "tbsp", type: "volume" },
  { value: "fl_oz", type: "volume" },
  { value: "cup", type: "volume" },
  { value: "pint", type: "volume" },
  { value: "quart", type: "volume" },
  { value: "gallon", type: "volume" },
  { value: "ml", type: "volume" },
  { value: "liter", type: "volume" },
  { value: "each", type: "count" },
  { value: "dozen", type: "count" },
  { value: "case", type: "count" },
  { value: "bunch", type: "count" },
  { value: "head", type: "count" },
  { value: "piece", type: "count" },
];
const UNIT_TYPE = new Map(UNITS.map((u) => [u.value, u.type]));

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

const recSnap = await getDocs(collection(db, "recipes"));
const recById = new Map();
for (const d of recSnap.docs) recById.set(d.id, { ...d.data(), id: d.id });

const lineSnap = await getDocs(collectionGroup(db, "lines"));

const unknownUnits = [];
const crossTypeLines = [];
const unitFreq = new Map();

for (const d of lineSnap.docs) {
  const data = d.data();
  const recipeId = d.ref.parent.parent?.id;
  const rec = recById.get(recipeId);
  const ing = ingById.get(data.ingredientId);

  unitFreq.set(data.unit, (unitFreq.get(data.unit) || 0) + 1);

  const lineType = UNIT_TYPE.get(data.unit);
  if (!lineType) {
    unknownUnits.push({
      recipe: rec?.name,
      recipeId,
      lineId: d.id,
      ingredient: data.ingredientName,
      qty: data.quantity,
      unit: data.unit,
      costPerUnit: data.costPerUnit,
      lineCost: data.lineCost,
      ingredientUnit: ing?.unit,
    });
    continue;
  }
  const ingType = ing ? UNIT_TYPE.get(ing.unit) : null;
  if (ingType && lineType !== ingType) {
    crossTypeLines.push({
      recipe: rec?.name,
      recipeId,
      lineId: d.id,
      ingredient: data.ingredientName,
      qty: data.quantity,
      lineUnit: data.unit,
      lineType,
      ingredientUnit: ing.unit,
      ingredientType: ingType,
      lineCost: data.lineCost,
    });
  }
}

console.log("=== Unit frequency across recipe lines ===");
for (const [u, n] of [...unitFreq.entries()].sort((a, b) => b[1] - a[1])) {
  const known = UNIT_TYPE.has(u) ? "" : "  ⚠ UNKNOWN";
  console.log(`  ${u.padEnd(10)} ${String(n).padStart(4)}${known}`);
}

console.log(`\n=== Unknown-unit lines (${unknownUnits.length}) ===`);
for (const l of unknownUnits) {
  console.log(
    `  [${l.recipe}] ${l.ingredient}: ${l.qty} ${l.unit} @ ₹${l.costPerUnit}/${l.unit} = ₹${l.lineCost} (ingredient stored in ${l.ingredientUnit})`
  );
}

console.log(`\n=== Cross-type lines (${crossTypeLines.length}) ===`);
for (const l of crossTypeLines) {
  console.log(
    `  [${l.recipe}] ${l.ingredient}: ${l.qty} ${l.lineUnit} (${l.lineType}) against ingredient stored in ${l.ingredientUnit} (${l.ingredientType}) — line cost ₹${l.lineCost}`
  );
}

process.exit(0);
