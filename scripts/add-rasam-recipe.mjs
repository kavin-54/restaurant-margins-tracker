/**
 * One-off: add a "Rasam" recipe (small-batch, rasam-powder style)
 * to the live Firestore catering-platform project.
 *
 * Run: node scripts/add-rasam-recipe.mjs
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
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

// Ingredient lines — mapped to existing ingredient IDs where available.
// Quantities converted from grams/ml to kg/liter to match each ingredient's unit.
// Midpoints used for "25-30g" / "20-25g" / "4-5 pieces" ranges.
const lines = [
  { ingredientId: "i-tamarind",     ingredientName: "Tamarind (Puli)",             quantity: 0.05,  unit: "kg",    costPerUnit: 120, sortOrder: 1, notes: "Soaked, extracted" },
  { ingredientId: "i-tomato",       ingredientName: "Tomato (Thakkali)",           quantity: 0.4,   unit: "kg",    costPerUnit: 30,  sortOrder: 2, notes: "4 medium, crushed" },
  { ingredientId: "i-toor-dal",     ingredientName: "Toor Dal (Arhar)",            quantity: 0.05,  unit: "kg",    costPerUnit: 130, sortOrder: 3, notes: "Raw; ~150g cooked dal water" },
  { ingredientId: "i-turmeric",     ingredientName: "Turmeric Powder (Manjal)",    quantity: 0.005, unit: "kg",    costPerUnit: 160, sortOrder: 4 },
  { ingredientId: "i-salt",         ingredientName: "Iodized Salt",                quantity: 0.022, unit: "kg",    costPerUnit: 10,  sortOrder: 5, notes: "Adjust to taste" },
  { ingredientId: "i-ghee",         ingredientName: "Pure Cow Ghee",               quantity: 0.025, unit: "kg",    costPerUnit: 500, sortOrder: 6, notes: "For tempering (~30 ml)" },
  { ingredientId: "i-mustard",      ingredientName: "Mustard Seeds (Kadugu)",      quantity: 0.008, unit: "kg",    costPerUnit: 120, sortOrder: 7, notes: "Tempering" },
  { ingredientId: "i-cumin",        ingredientName: "Cumin Seeds (Jeeragam)",      quantity: 0.008, unit: "kg",    costPerUnit: 350, sortOrder: 8, notes: "Tempering" },
  { ingredientId: "i-garlic",       ingredientName: "Garlic (Poondu)",             quantity: 0.04,  unit: "kg",    costPerUnit: 150, sortOrder: 9, notes: "~10 cloves, crushed, optional" },
  { ingredientId: "i-curry-leaves", ingredientName: "Curry Leaves (Karuveppilai)", quantity: 0.01,  unit: "kg",    costPerUnit: 120, sortOrder: 10, notes: "Tempering" },
];

const linesWithCost = lines.map((l) => ({
  ...l,
  lineCost: Number((l.quantity * l.costPerUnit).toFixed(2)),
}));

const totalRecipeCost = Number(
  linesWithCost.reduce((sum, l) => sum + l.lineCost, 0).toFixed(2)
);
const servings = 10; // ~2.5L rasam, 250 ml per serving
const costPerServing = Number((totalRecipeCost / servings).toFixed(2));

const recipe = {
  name: "Rasam",
  category: "soup",
  servings,
  costPerServing,
  totalRecipeCost,
  description:
    "South Indian rasam with tamarind, tomato and toor dal water, tempered with mustard, cumin, garlic and curry leaves. Yields ~2.5 L (≈10 servings).\n\n" +
    "Additional ingredients not tracked in catalog (add to description for reference):\n" +
    "• Rasam powder — 25–30 g\n" +
    "• Dry red chilies — 4–5 pieces (≈3 g)\n" +
    "• Asafoetida (hing) — 2 g\n" +
    "• Water — 2 to 2.5 liters",
};

async function main() {
  const cred = await signInWithEmailAndPassword(
    auth,
    "rajesh@hfscatering.in",
    "HFSCoimbatore2024!"
  );
  console.log("Signed in as:", cred.user.email);

  const now = Timestamp.now();
  const recipeRef = await addDoc(collection(db, "recipes"), {
    ...recipe,
    createdAt: now,
    updatedAt: now,
  });
  console.log("Created recipe:", recipeRef.id, recipe.name);

  for (const line of linesWithCost) {
    await addDoc(collection(db, "recipes", recipeRef.id, "lines"), line);
  }
  console.log(`Added ${linesWithCost.length} ingredient lines.`);
  console.log(
    `Total cost: ₹${totalRecipeCost}, cost/serving: ₹${costPerServing} (${servings} servings)`
  );
  console.log(
    `View at: https://catering-platform-sigma.vercel.app/recipes/${recipeRef.id}`
  );
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
