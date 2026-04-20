/**
 * Seed the `ingredients` collection from the HFS Costcenter Consumption Report
 * (01/04/2026–18/04/2026). Food items only — fixed assets, cleaning, packaging,
 * and vehicle items are intentionally excluded.
 *
 * Uses the HFS item code as the Firestore doc ID so re-runs are idempotent.
 *
 * Run: node scripts/seed-hfs-ingredients.mjs
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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

// Rows: [code, name, unit, costPerUnit, category]
const rows = [
  // ===== DAIRY =====
  ["130007", "Cooking Cream", "kg", 203.22, "dairy"],
  ["130040", "Cheese Slice 750gm (Amul)", "each", 339.05, "dairy"],
  ["PCPC01", "Putting Cake", "each", 15.00, "other"],
  ["130069", "Milk Standard 4.5 Fat", "liter", 52.00, "dairy"],
  ["130043", "Curd 1L", "each", 52.39, "dairy"],
  ["130035", "Butter 500g", "kg", 569.53, "dairy"],
  ["130003", "Paneer", "kg", 300.00, "dairy"],

  // ===== FROZEN FOODS =====
  ["130057", "Spring Roll Veg", "each", 304.76, "other"],
  ["0005", "Green Peas Frozen", "kg", 97.94, "produce"],
  ["130071", "Veg Momos Mix", "each", 166.97, "other"],
  ["0003", "Sweet Corn Frozen", "kg", 90.64, "produce"],
  ["0004", "Jalapeno Cheese Pops", "kg", 399.00, "other"],
  ["1300080", "Veg Cutlet", "each", 180.00, "other"],

  // ===== FRUITS =====
  ["120050", "Banana Nenthiran", "each", 20.00, "produce"],
  ["120001", "Apple (Imported)", "kg", 220.00, "produce"],
  ["120021", "Papaya", "kg", 30.00, "produce"],
  ["120018", "Pineapple", "kg", 45.00, "produce"],
  ["120053", "Red Banana", "each", 15.98, "produce"],
  ["120041", "Banana Poovan", "each", 5.56, "produce"],
  ["110546", "Musk Melon", "kg", 36.43, "produce"],
  ["120025", "Pomegranate", "kg", 140.00, "produce"],
  ["150050", "Banana Poovan (kg)", "kg", 69.70, "produce"],
  ["120005", "Banana Green", "kg", 79.19, "produce"],
  ["120012", "Grapes Panner", "kg", 100.00, "produce"],
  ["120015", "Guava", "kg", 62.19, "produce"],
  ["120034", "Banana Rasthali", "each", 3.87, "produce"],
  ["120019", "Orange (Imported)", "kg", 140.00, "produce"],
  ["120014", "Grapes Seedless Black", "kg", 100.00, "produce"],
  ["120028", "Water Melon", "kg", 23.00, "produce"],
  ["120020", "Orange Local", "kg", 80.00, "produce"],
  ["120030", "Mango Raw", "kg", 60.00, "produce"],
  ["120002", "Apple (Indian)", "kg", 220.00, "produce"],

  // ===== GROCERY & PROVISIONS =====
  ["170376", "Dhal Vada", "kg", 60.00, "dry-goods"],
  ["170169", "Rice Jeeraga Samba", "kg", 170.00, "grain-starch"],
  ["170043", "Coriander Powder", "kg", 202.85, "spice"],
  ["170248", "Cashewnut 4 Bits", "kg", 827.62, "dry-goods"],
  ["170509", "Till Black", "kg", 180.00, "spice"],
  ["170035", "Cinnamon Stick", "kg", 304.80, "spice"],
  ["170762", "Millet Kambu Kurunai", "kg", 65.00, "grain-starch"],
  ["170304", "Rice Sevai Vermicelli", "each", 95.26, "grain-starch"],
  ["170018", "Black Salt", "kg", 65.00, "spice"],
  ["170028", "Chat Masala 100gm", "each", 71.43, "spice"],
  ["RE0001", "Refined Oil Aadhaar 1L", "each", 116.00, "oil-fat"],
  ["170136", "Milk Maid Tin", "each", 135.65, "condiment"],
  ["170006", "Ani Seed Sombu", "kg", 238.10, "spice"],
  ["85002", "Red Aval", "kg", 76.20, "grain-starch"],
  ["170199", "Turmeric Powder", "kg", 226.66, "spice"],
  ["170069", "Dhal Rajma", "kg", 120.01, "dry-goods"],
  ["170175", "Puttu Podi Samba", "kg", 113.16, "grain-starch"],
  ["170168", "Rice Idli", "kg", 41.00, "grain-starch"],
  ["170082", "Flour Corn", "kg", 57.15, "grain-starch"],
  ["170145", "Refined Oil", "liter", 169.25, "oil-fat"],
  ["170801", "Jaggery Powder", "kg", 66.67, "condiment"],
  ["170238", "Sunda Vathal", "kg", 323.86, "dry-goods"],
  ["170129", "Maida All Purpose", "kg", 44.00, "grain-starch"],
  ["170578", "Peas White Dry", "kg", 60.00, "dry-goods"],
  ["170623", "Burger Bun", "each", 14.07, "grain-starch"],
  ["170534", "Aromatic Seasoning Mix", "each", 152.39, "spice"],
  ["170416", "Idiyappam Fresh", "each", 5.22, "grain-starch"],
  ["170435", "Mochai Dry", "kg", 136.56, "dry-goods"],
  ["170502", "Sauce Tomato", "each", 62.50, "condiment"],
  ["170093", "Green Cardamom", "kg", 2895.20, "spice"],
  ["170507", "Melon Seed", "kg", 712.99, "dry-goods"],
  ["170007", "Appalam 600g Pkt", "each", 75.00, "dry-goods"],
  ["170170", "Rice Raw", "kg", 41.65, "grain-starch"],
  ["170072", "Dhal Urid White", "kg", 128.18, "dry-goods"],
  ["170246", "Veg Mayonnaise", "kg", 152.38, "condiment"],
  ["170426", "Salt Stone (Kit)", "kg", 13.00, "spice"],
  ["170500", "Gulab Jamun MTR 175g", "each", 125.27, "other"],
  ["170058", "Cumin Seeds (Jeera)", "kg", 288.22, "spice"],
  ["170341", "Peanuts Raw", "kg", 161.92, "dry-goods"],
  ["170083", "Flour Rice", "kg", 42.00, "grain-starch"],
  ["170038", "Coconut Oil", "liter", 285.71, "oil-fat"],
  ["170171", "Sago", "kg", 61.47, "dry-goods"],
  ["170247", "Garam Masala", "kg", 412.38, "spice"],
  ["170603", "Millet Varagu Rice", "kg", 123.83, "grain-starch"],
  ["170508", "Till White", "kg", 200.00, "spice"],
  ["170030", "Chilli Powder", "kg", 260.00, "spice"],
  ["170287", "Red Rice Kerala", "kg", 58.00, "grain-starch"],
  ["170294", "Flour Ragi", "kg", 76.20, "grain-starch"],
  ["170010", "Atta", "kg", 49.50, "grain-starch"],
  ["170070", "Dhal Red Masoor", "kg", 90.48, "dry-goods"],
  ["170243", "Poppy Seeds", "kg", 1552.40, "spice"],
  ["170105", "Jaggery Dark Brown", "kg", 66.68, "condiment"],
  ["170005", "Ani Seed Powder", "kg", 216.19, "spice"],
  ["170516", "Jathikai Nutmeg", "kg", 985.80, "spice"],
  ["170194", "Tamarind", "kg", 169.78, "condiment"],
  ["170065", "Dhal Bengal", "kg", 60.00, "dry-goods"],
  ["170165", "Red Dry Chilli", "kg", 325.03, "spice"],
  ["170167", "Rice Boiled Guest", "kg", 48.08, "grain-starch"],
  ["8300052", "Kannan Devan Tea Powder", "each", 376.25, "beverage"],
  ["8300027", "Mutton Masala", "kg", 360.00, "spice"],
  ["170139", "Mustard Seeds Big", "kg", 109.60, "spice"],
  ["170744", "Parupu Podi", "kg", 216.19, "spice"],
  ["170122", "Kashmiri Chilli Powder", "each", 88.58, "spice"],
  ["170576", "Ghee 1L", "each", 560.00, "oil-fat"],
  ["8300071", "Veg Puff", "each", 14.87, "other"],
  ["170561", "Asafoetida Cake 100g", "each", 139.06, "spice"],
  ["170686", "Puttu Podi", "kg", 90.48, "grain-starch"],
  ["170514", "Star Aniseed", "kg", 609.60, "spice"],
  ["1750535", "Bread Family", "each", 100.00, "grain-starch"],
  ["170209", "Bay Leaves", "kg", 209.50, "spice"],
  ["170249", "Coriander Seeds", "kg", 161.90, "spice"],
  ["170091", "Gingelly Oil", "liter", 247.28, "oil-fat"],
  ["170505", "Rava Wheat", "kg", 142.88, "grain-starch"],
  ["170162", "Rava White", "kg", 46.68, "grain-starch"],
  ["170071", "Dhal Thoor", "kg", 130.00, "dry-goods"],
  ["170391", "Oil Groundnut", "liter", 238.09, "oil-fat"],
  ["8500120", "Samosa", "each", 7.00, "other"],
  ["170201", "Vanaspathi", "liter", 123.82, "oil-fat"],
  ["170057", "Cumin Seed Powder", "kg", 402.85, "spice"],
  ["170250", "Pepper Black Whole", "kg", 809.52, "spice"],
  ["170081", "Flour Basin", "kg", 86.68, "grain-starch"],
  ["170037", "Coconut Milk Powder 1kg", "kg", 885.00, "dry-goods"],
  ["170558", "Semiya Anil 180g", "each", 17.15, "grain-starch"],
  ["170506", "Dhal White Channa Medium", "kg", 80.96, "dry-goods"],
  ["170025", "Cashewnut Broken", "kg", 616.37, "dry-goods"],
  ["170066", "Dhal Green Moong", "kg", 112.39, "dry-goods"],
  ["170251", "Flour Kambu", "kg", 90.48, "grain-starch"],
  ["170008", "Asafoetida Powder 100g", "each", 141.16, "spice"],
  ["170011", "Aval", "kg", 65.00, "grain-starch"],
  ["170242", "Pista", "kg", 1838.33, "dry-goods"],
  ["170103", "Idli Chilli Powder", "kg", 231.42, "spice"],
  ["170003", "Almond Badham", "kg", 876.30, "dry-goods"],
  ["170178", "Sauce Soya Dark", "each", 53.60, "condiment"],
  ["170174", "Salt Powder", "kg", 27.50, "spice"],
  ["170063", "Dhal Black Channa", "kg", 78.51, "dry-goods"],
  ["170161", "Ragi Semiya 180g", "each", 22.38, "grain-starch"],
  ["170155", "Pepper Powder Black", "kg", 964.76, "spice"],
  ["BT0011", "BT Raw Rice", "kg", 57.70, "grain-starch"],
  ["170183", "Sugar", "kg", 44.76, "condiment"],
  ["170342", "Meal Maker Small", "kg", 88.00, "dry-goods"],
  ["170135", "Fenugreek", "kg", 100.02, "spice"],
  ["170601", "Millet Kutharavali Rice", "kg", 140.00, "grain-starch"],
  ["170557", "Chicken Masala", "kg", 283.80, "spice"],
  ["170519", "Rice Ada Pradaman", "each", 45.00, "grain-starch"],
  ["170515", "Jathi Pathri Mace", "kg", 2904.80, "spice"],
  ["170120", "Kalpassi", "kg", 504.85, "spice"],
  ["170513", "Dry Grapes", "kg", 495.30, "dry-goods"],
  ["170532", "Bread Plain", "each", 58.90, "grain-starch"],
  ["170203", "Vinegar 700ml", "each", 30.00, "condiment"],
  ["170087", "Garlic", "kg", 160.24, "produce"],
  ["170217", "Cloves", "kg", 971.54, "spice"],
  ["170085", "Fried Channa", "kg", 89.71, "dry-goods"],
  ["170290", "Channa Masala 100g", "each", 75.24, "spice"],
  ["170504", "Sambar Powder", "kg", 317.14, "spice"],
  ["170078", "Egg Noodles 200g", "each", 21.90, "grain-starch"],
  ["170068", "Dhal Moong", "kg", 111.44, "dry-goods"],
  ["170707", "Tomato Ketchup Kissan", "each", 180.96, "condiment"],
  ["170157", "Pickle Mango 5kg", "each", 268.00, "condiment"],

  // ===== MEAT & FISH / POULTRY =====
  ["160062", "Chicken Whole Bird", "kg", 179.00, "protein"],
  ["160004", "Chicken Drumstick", "kg", 192.29, "protein"],
  ["160061", "Chicken Chilli Cut", "kg", 192.00, "protein"],
  ["160006", "Egg", "each", 4.41, "protein"],
  ["160063", "Chicken Leg Cut", "kg", 191.42, "protein"],

  // ===== KITCHEN & F&B REQUISITES =====
  ["95543", "Flavoured Papad", "kg", 58.00, "dry-goods"],

  // ===== VEGETABLES =====
  ["110521", "Lettuce Iceberg", "kg", 110.00, "produce"],
  ["110064", "Coconut", "each", 28.00, "produce"],
  ["110044", "Pumpkin Red", "kg", 22.00, "produce"],
  ["110031", "Keerai Variety", "kg", 38.00, "produce"],
  ["130534", "Snake Gourd", "kg", 40.00, "produce"],
  ["110027", "Curry Leaves", "kg", 50.00, "produce"],
  ["110022", "Kothavarangai", "kg", 52.00, "produce"],
  ["110034", "Ladies Finger", "kg", 58.00, "produce"],
  ["110020", "Chilli Green", "kg", 53.00, "produce"],
  ["110015", "Brinjal", "kg", 30.00, "produce"],
  ["110041", "Onion Big", "kg", 24.25, "produce"],
  ["130540", "Peeled Garlic", "kg", 170.00, "produce"],
  ["110551", "Mushroom", "each", 42.00, "produce"],
  ["110547", "Tomato Apple", "kg", 27.00, "produce"],
  ["110058", "Tomato Country", "kg", 26.10, "produce"],
  ["110063", "Yam", "kg", 65.00, "produce"],
  ["110042", "Potato", "kg", 30.00, "produce"],
  ["110029", "Ginger", "kg", 85.00, "produce"],
  ["110510", "Capsicum Yellow", "kg", 135.00, "produce"],
  ["110026", "Cucumber Green", "kg", 30.00, "produce"],
  ["110013", "Bottle Gourd", "kg", 35.00, "produce"],
  ["110018", "Carrot Big", "kg", 56.00, "produce"],
  ["110005", "Baby Corn Peeled Fresh", "kg", 140.00, "produce"],
  ["110010", "Beans French", "kg", 65.00, "produce"],
  ["110555", "Raw Banana (kg)", "kg", 55.00, "produce"],
  ["110016", "Cabbage", "kg", 22.00, "produce"],
  ["110536", "Butter Beans", "kg", 40.00, "produce"],
  ["110549", "Onion Small", "kg", 40.00, "produce"],
  ["110550", "Ridge Gourd", "kg", 42.00, "produce"],
  ["110545", "Mint", "kg", 42.00, "produce"],
  ["110047", "Radish White", "kg", 22.00, "produce"],
  ["110045", "Pumpkin White", "kg", 24.00, "produce"],
  ["110011", "Beetroot", "kg", 42.00, "produce"],
  ["110035", "Lemon", "kg", 70.00, "produce"],
  ["110028", "Drumstick", "kg", 80.00, "produce"],
  ["110508", "Capsicum Red", "kg", 135.00, "produce"],
  ["110025", "Coriander Leaves", "kg", 60.00, "produce"],
  ["110017", "Capsicum Green", "kg", 60.00, "produce"],
  ["110014", "Brinjal Big (Balloon)", "kg", 65.00, "produce"],
  ["110024", "Chow Chow", "kg", 32.00, "produce"],
  ["110052", "Spinach", "kg", 40.00, "produce"],
  ["110004", "Avarakkai", "kg", 80.00, "produce"],
  ["110548", "Cauliflower (kg)", "kg", 44.00, "produce"],
];

async function main() {
  console.log("Signing in...");
  await signInWithEmailAndPassword(
    auth,
    "rajesh@hfscatering.in",
    "HFSCoimbatore2024!",
  );
  console.log(`Signed in. Seeding ${rows.length} ingredients...\n`);

  const now = new Date();
  let ok = 0;
  for (const [code, name, unit, costPerUnit, category] of rows) {
    const id = `hfs-${String(code).toLowerCase()}`;
    await setDoc(doc(db, "ingredients", id), {
      name,
      unit,
      costPerUnit,
      supplier: "",
      category,
      hfsItemCode: String(code),
      createdAt: now,
      updatedAt: now,
    });
    ok++;
    if (ok % 25 === 0) console.log(`  ${ok}/${rows.length}...`);
  }

  console.log(`\nDone. ${ok} ingredients written to Firestore.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
