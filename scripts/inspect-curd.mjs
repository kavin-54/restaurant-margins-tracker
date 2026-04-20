import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  collectionGroup,
  query,
  where,
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

await signInWithEmailAndPassword(
  auth,
  "rajesh@hfscatering.in",
  "HFSCoimbatore2024!"
);

const ingSnap = await getDocs(collection(db, "ingredients"));
const curds = ingSnap.docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .filter((i) => /curd|yogurt|thayir/i.test(i.name || ""));

console.log("=== Ingredients matching curd ===");
for (const c of curds) {
  console.log({
    id: c.id,
    name: c.name,
    unit: c.unit,
    costPerUnit: c.costPerUnit,
  });
}

console.log("\n=== Recipe lines referencing curd ===");
const lineSnap = await getDocs(collectionGroup(db, "lines"));
const curdLines = lineSnap.docs
  .map((d) => ({ path: d.ref.path, ...d.data() }))
  .filter((l) => /curd|yogurt|thayir/i.test(l.ingredientName || ""));

for (const l of curdLines) {
  console.log({
    path: l.path,
    ingredientName: l.ingredientName,
    quantity: l.quantity,
    unit: l.unit,
    costPerUnit: l.costPerUnit,
    lineCost: l.lineCost,
  });
}

process.exit(0);
