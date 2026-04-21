/**
 * Seed the `ingredients` collection from the HFS "Store list.xls" export.
 *
 * Dedupes by HFS item code, picks the most recent non-zero rate per item,
 * and skips non-food categories (cleaning, laundry, office, packaging, gas, etc.).
 *
 * Run: node scripts/seed-store-list-ingredients.mjs
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import XLSX from "xlsx";

const firebaseConfig = {
  apiKey: "AIzaSyCTrgQ3B1qEcc2_vNxCs-WmrxcbOw5uzBQ",
  authDomain: "resteraunt-margins-tracker.firebaseapp.com",
  projectId: "resteraunt-margins-tracker",
  storageBucket: "resteraunt-margins-tracker.firebasestorage.app",
  messagingSenderId: "83303772940",
  appId: "1:83303772940:web:5140d561f07b44bda10f29",
};

const SRC = "/Users/kavinramesh/Downloads/Store list.xls";

const FOOD_CATS = new Set([
  "DAIRY PRODUCTS",
  "FROZEN FOODS",
  "GROCERY AND",
  "KITC & F & B",
  "MEAT AND FISH",
]);

function mapUnit(u) {
  switch (String(u || "").toUpperCase().trim()) {
    case "KG": return "kg";
    case "LIT": return "liter";
    case "NOS": return "each";
    case "PKT": return "each";
    case "BOT": return "each";
    default: return "each";
  }
}

function titleCase(s) {
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b([a-z])/g, (_, c) => c.toUpperCase())
    .trim();
}

function categorize(xlsCat, rawName) {
  const n = rawName.toLowerCase();
  if (xlsCat === "DAIRY PRODUCTS") return "dairy";
  if (xlsCat === "MEAT AND FISH") return "protein";
  if (xlsCat === "FROZEN FOODS") {
    if (/(sweet corn|green peas)/.test(n)) return "produce";
    return "other";
  }
  // GROCERY AND / KITC & F & B — keyword heuristics
  if (/milk maid|milk cream/.test(n)) return "condiment";
  if (/tea powder/.test(n)) return "beverage";
  if (/\boil\b|ghee|vanaspathi/.test(n)) return "oil-fat";
  if (
    /masala|chilli|chat|cardomum|cardamom|cloves|cumin|jeera|turmeric|pepper|coriander|cin(n)?amon|fenugric|fenugreek|sombu|ani ?seed|ajwain|asafoetida|bay leaves|musterd|mustard|star anis|jathi|jathikai|omam|kalpassi|salt|kasoori|poppy seed|nutmug/.test(n)
  ) return "spice";
  if (
    /rice|rava|atta|maida|flour|semiya|noodles|sago|sooji|aval|idli|puttu podi|millet|ragi|parupu podi|idiyappam|bun|gulab jamun|ada pradaman/.test(n)
  ) return "grain-starch";
  if (
    /dhal|channa|karamani|peas white|mochai|meal maker|peanut|appalam|papad|vathal|dry grapes|cashew|almond|pista|melon seed|till|sugar candy|sunda|badham|green peas dry/.test(n)
  ) return "dry-goods";
  if (
    /sugar|jaggary|jaggery|tamarind|syrup|sauce|pickle|kitchup|ketchup|\bjam\b|vinegar|tomato puree|mayonnaise|coconut milk powder|desicatted coconut|nannari/.test(n)
  ) return "condiment";
  return "other";
}

function parseTxnDate(txnId) {
  const m = /-(\d{2})\/(\d{2})\/(\d{4})\s*$/.exec(String(txnId || ""));
  if (!m) return 0;
  return new Date(+m[3], +m[2] - 1, +m[1]).getTime();
}

function loadRows() {
  const wb = XLSX.readFile(SRC);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
}

function buildIngredients() {
  const rows = loadRows();
  const byCode = new Map();
  for (const r of rows) {
    const txn = r[0];
    const code = String(r[1] || "").trim();
    const rawName = String(r[3] || "").trim();
    const cat = String(r[4] || "").trim();
    const unit = String(r[6] || "").trim();
    const rate = parseFloat(r[9]) || 0;
    if (!code || !rawName || !FOOD_CATS.has(cat)) continue;

    const date = parseTxnDate(txn);
    const existing = byCode.get(code);
    if (!existing) {
      byCode.set(code, { code, rawName, cat, unit, rate, date });
      continue;
    }
    // Prefer later date; if the latest has rate 0, fall back to a non-zero rate
    if (date > existing.date) {
      byCode.set(code, {
        code,
        rawName,
        cat,
        unit,
        rate: rate > 0 ? rate : existing.rate,
        date,
      });
    } else if (existing.rate === 0 && rate > 0) {
      existing.rate = rate;
    }
  }
  return [...byCode.values()].map((x) => ({
    code: x.code,
    name: titleCase(x.rawName),
    unit: mapUnit(x.unit),
    costPerUnit: Math.round(x.rate * 100) / 100,
    category: categorize(x.cat, x.rawName),
  }));
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  const ingredients = buildIngredients();
  console.log(`Prepared ${ingredients.length} unique ingredients from Store list.\n`);

  console.log("Signing in as rajesh@hfscatering.in...");
  await signInWithEmailAndPassword(
    auth,
    "rajesh@hfscatering.in",
    "HFSCoimbatore2024!",
  );
  console.log("Signed in.\n");

  const now = new Date();
  let ok = 0;
  for (const it of ingredients) {
    const id = `hfs-${it.code.toLowerCase()}`;
    await setDoc(doc(db, "ingredients", id), {
      name: it.name,
      unit: it.unit,
      costPerUnit: it.costPerUnit,
      supplier: "",
      category: it.category,
      hfsItemCode: it.code,
      createdAt: now,
      updatedAt: now,
    });
    ok++;
    if (ok % 25 === 0) console.log(`  ${ok}/${ingredients.length}...`);
  }

  console.log(`\nDone. ${ok} ingredients written.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
