/**
 * Fix the mis-unit curd recipe line (300 g vs ingredient priced in liters).
 * Changes line unit to ml, recomputes costPerUnit + lineCost, then recomputes
 * the parent recipe's totalRecipeCost + costPerServing.
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
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

// oz base, mirrors src/lib/constants/units.ts
const UNIT_TO_BASE = {
  ml: 0.033814,
  liter: 33.814,
  fl_oz: 1,
};

await signInWithEmailAndPassword(
  auth,
  "rajesh@hfscatering.in",
  "HFSCoimbatore2024!"
);

const RECIPE_ID = "fT8KOVQKRsBHGEXexKPS";
const LINE_ID = "aVZ6Wb7fCsDKmlwGovBU";

const linePath = doc(db, "recipes", RECIPE_ID, "lines", LINE_ID);
const lineSnap = await getDoc(linePath);
if (!lineSnap.exists()) throw new Error("Line not found");
const line = lineSnap.data();
console.log("Before:", {
  unit: line.unit,
  quantity: line.quantity,
  costPerUnit: line.costPerUnit,
  lineCost: line.lineCost,
});

// Ingredient is priced at ₹52.39/liter. Convert to ₹/ml.
const ingredientCostPerLiter = 52.39;
const costPerMl =
  ingredientCostPerLiter * (UNIT_TO_BASE.ml / UNIT_TO_BASE.liter);
// 300 ml assumes curd density ≈ 1 g/ml → 300 g ≈ 300 ml.
const newQuantity = 300;
const newUnit = "ml";
const newCostPerUnit = Number(costPerMl.toFixed(4));
const newLineCost = Number((newQuantity * costPerMl).toFixed(2));

await updateDoc(linePath, {
  unit: newUnit,
  quantity: newQuantity,
  costPerUnit: newCostPerUnit,
  lineCost: newLineCost,
});
console.log("After:", {
  unit: newUnit,
  quantity: newQuantity,
  costPerUnit: newCostPerUnit,
  lineCost: newLineCost,
});

// Recompute recipe totals.
const recipeRef = doc(db, "recipes", RECIPE_ID);
const recipeSnap = await getDoc(recipeRef);
if (!recipeSnap.exists()) throw new Error("Recipe not found");
const recipe = recipeSnap.data();

const linesSnap = await getDocs(collection(db, "recipes", RECIPE_ID, "lines"));
const total = linesSnap.docs.reduce(
  (sum, d) => sum + Number(d.data().lineCost || 0),
  0
);
const servings = Number(recipe.servings) || 1;
const costPerServing = total / servings;

await updateDoc(recipeRef, {
  totalRecipeCost: Number(total.toFixed(2)),
  costPerServing: Number(costPerServing.toFixed(2)),
  updatedAt: new Date(),
});

console.log("Recipe totals:", {
  totalRecipeCost: Number(total.toFixed(2)),
  costPerServing: Number(costPerServing.toFixed(2)),
  servings,
});

process.exit(0);
