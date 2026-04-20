/**
 * Seed script: Realistic Coimbatore catering company data
 * Company: HFS Catering, Coimbatore, Tamil Nadu
 * Scale: ~5,000 meals/day
 *
 * Uses the EXACT field names from the hooks (useEvents, useClients, etc.)
 *
 * Run: node scripts/seed-coimbatore-data.mjs
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, deleteDoc, getDocs, Timestamp } from "firebase/firestore";

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

// Helper: dates
function daysFromNow(n) {
  const d = new Date(); d.setDate(d.getDate() + n); d.setHours(0,0,0,0);
  return d;
}
function daysAgo(n) { return daysFromNow(-n); }

// Clear a collection
async function clearCollection(name) {
  const snap = await getDocs(collection(db, name));
  for (const d of snap.docs) {
    // Try to clear subcollections
    for (const sub of ["menuItems", "lines", "vendorRecords"]) {
      try {
        const subSnap = await getDocs(collection(db, name, d.id, sub));
        for (const sd of subSnap.docs) await deleteDoc(sd.ref);
      } catch {}
    }
    await deleteDoc(d.ref);
  }
}

// ==================== VENDORS ====================
// Interface: { id, name, email, phone, address?, city?, state?, zipCode?, contactPerson?, specialties?, leadTime?, minimumOrder?, notes?, createdAt, updatedAt }
const vendors = [
  { id: "v-koyambedu", name: "Koyambedu Fresh Vegetables", email: "koyambedufresh@gmail.com", phone: "+91 98420 45123", address: "Koyambedu Wholesale Market, Chennai", city: "Coimbatore Depot", state: "Tamil Nadu", contactPerson: "Murugan", specialties: ["vegetables", "greens", "herbs"], leadTime: 1, minimumOrder: 5000, notes: "Main vegetable supplier. Daily delivery from Koyambedu wholesale market. Delivers by 5 AM. 6 days/week." },
  { id: "v-ponni-rice", name: "Sri Ponni Rice Mill - Thanjavur", email: "sriponnimill@yahoo.com", phone: "+91 94433 67890", address: "NH-36, Thanjavur District", city: "Thanjavur", state: "Tamil Nadu", contactPerson: "Arun Kumar", specialties: ["ponni rice", "sona masoori", "basmati"], leadTime: 2, minimumOrder: 25000, notes: "Premium rice supplier. 25kg & 50kg bags. Weekly delivery. Credit: Net 15 days." },
  { id: "v-aavin", name: "Aavin Dairy - Coimbatore Depot", email: "aavincoimbatore@aavin.net", phone: "+91 422 2301456", address: "Aavin Dairy Depot, Peelamedu", city: "Coimbatore", state: "Tamil Nadu", contactPerson: "Depot Manager", specialties: ["milk", "curd", "butter", "ghee", "paneer"], leadTime: 1, minimumOrder: 2000, notes: "Government dairy. Daily delivery by 4 AM. Bulk rates for 100L+ orders." },
  { id: "v-pollachi", name: "Pollachi Masala Traders", email: "pollachispice@gmail.com", phone: "+91 98650 23456", address: "Spice Market, Pollachi Main Road", city: "Pollachi", state: "Tamil Nadu", contactPerson: "Selvam", specialties: ["chilli powder", "turmeric", "coriander", "cumin", "pepper"], leadTime: 2, minimumOrder: 8000, notes: "Fresh ground spices. All FSSAI certified. Twice weekly delivery." },
  { id: "v-kovai-oil", name: "Kovai Oil & Ghee Suppliers", email: "kovaioil@gmail.com", phone: "+91 94878 11234", address: "Gandhipuram Industrial Area", city: "Coimbatore", state: "Tamil Nadu", contactPerson: "Balan", specialties: ["sunflower oil", "gingelly oil", "coconut oil"], leadTime: 2, minimumOrder: 10000, notes: "Refined sunflower oil (15L tins), gingelly oil, coconut oil. Bulk pricing 100L+/month." },
  { id: "v-erode", name: "Erode Provision Stores", email: "erodeprovisions@gmail.com", phone: "+91 98430 56789", address: "Wholesale Provision Market, Erode", city: "Erode", state: "Tamil Nadu", contactPerson: "Raman", specialties: ["dal", "sugar", "jaggery", "tamarind", "flour", "dry goods"], leadTime: 3, minimumOrder: 15000, notes: "Dal, sugar, jaggery, tamarind, atta, besan, rava. Weekly bulk. Credit: Net 30." },
  { id: "v-nilgiris-meat", name: "Nilgiris Fresh Meat & Poultry", email: "nilgirismeat@gmail.com", phone: "+91 96000 34567", address: "Ukkadam Market Area", city: "Coimbatore", state: "Tamil Nadu", contactPerson: "Ibrahim", specialties: ["chicken", "mutton", "eggs", "fish", "prawns"], leadTime: 1, minimumOrder: 8000, notes: "Fresh chicken, mutton, eggs. Halal certified. Morning delivery by 5:30 AM." },
  { id: "v-packaging", name: "Coimbatore Packaging Solutions", email: "cbepackaging@gmail.com", phone: "+91 98940 78901", address: "SIDCO Industrial Estate", city: "Coimbatore", state: "Tamil Nadu", contactPerson: "Venkat", specialties: ["foil containers", "banana leaves", "paper plates", "cling wrap"], leadTime: 3, minimumOrder: 5000, notes: "Aluminium containers, banana leaves, paper plates, takeaway boxes. 10% discount on ₹20k+ orders." },
  { id: "v-coconut", name: "Palakkad Coconut Traders", email: "palakkadcoconut@gmail.com", phone: "+91 94470 12345", address: "Palakkad Border, Walayar", city: "Palakkad", state: "Kerala", contactPerson: "Suresh Nair", specialties: ["coconut", "grated coconut", "coconut milk"], leadTime: 1, minimumOrder: 3000, notes: "Fresh coconuts direct from Palakkad farms. 500+ coconuts per delivery. 3x/week." },
  { id: "v-flowers", name: "Coimbatore Flower Market", email: "cbeflowers@gmail.com", phone: "+91 90430 56780", address: "Town Hall Flower Market", city: "Coimbatore", state: "Tamil Nadu", contactPerson: "Saravanan", specialties: ["banana leaves", "jasmine garlands", "marigold"], leadTime: 1, minimumOrder: 1500, notes: "Banana leaves for serving, garlands for decoration. Pre-order by 6 PM previous day." },
];

// ==================== INGREDIENTS ====================
// Interface: { id, name, unit, costPerUnit, supplier, category, createdAt, updatedAt }
// Categories: protein, produce, dairy, dry-goods, spice, condiment, oil-fat, grain-starch, beverage, disposable, packaging, other
const ingredients = [
  // GRAINS (prices in ₹/kg)
  { id: "i-ponni-rice", name: "Ponni Raw Rice", unit: "kg", costPerUnit: 45, supplier: "Sri Ponni Rice Mill - Thanjavur", category: "grain-starch" },
  { id: "i-sona-masoori", name: "Sona Masoori Rice", unit: "kg", costPerUnit: 55, supplier: "Sri Ponni Rice Mill - Thanjavur", category: "grain-starch" },
  { id: "i-basmati-rice", name: "Basmati Rice", unit: "kg", costPerUnit: 100, supplier: "Sri Ponni Rice Mill - Thanjavur", category: "grain-starch" },
  { id: "i-wheat-atta", name: "Whole Wheat Atta", unit: "kg", costPerUnit: 36, supplier: "Erode Provision Stores", category: "grain-starch" },
  { id: "i-rava", name: "Rava (Semolina)", unit: "kg", costPerUnit: 45, supplier: "Erode Provision Stores", category: "grain-starch" },
  { id: "i-besan", name: "Besan (Chickpea Flour)", unit: "kg", costPerUnit: 80, supplier: "Erode Provision Stores", category: "grain-starch" },
  { id: "i-rice-flour", name: "Rice Flour", unit: "kg", costPerUnit: 50, supplier: "Erode Provision Stores", category: "grain-starch" },
  { id: "i-vermicelli", name: "Vermicelli (Semiya)", unit: "kg", costPerUnit: 65, supplier: "Erode Provision Stores", category: "grain-starch" },

  // DALS
  { id: "i-toor-dal", name: "Toor Dal (Arhar)", unit: "kg", costPerUnit: 130, supplier: "Erode Provision Stores", category: "dry-goods" },
  { id: "i-urad-dal", name: "Urad Dal (Black Gram)", unit: "kg", costPerUnit: 120, supplier: "Erode Provision Stores", category: "dry-goods" },
  { id: "i-moong-dal", name: "Moong Dal", unit: "kg", costPerUnit: 110, supplier: "Erode Provision Stores", category: "dry-goods" },
  { id: "i-chana-dal", name: "Chana Dal", unit: "kg", costPerUnit: 90, supplier: "Erode Provision Stores", category: "dry-goods" },

  // VEGETABLES
  { id: "i-onion", name: "Onion (Vengayam)", unit: "kg", costPerUnit: 35, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-tomato", name: "Tomato (Thakkali)", unit: "kg", costPerUnit: 30, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-potato", name: "Potato (Urulaikizhangu)", unit: "kg", costPerUnit: 30, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-carrot", name: "Carrot (Kaarat)", unit: "kg", costPerUnit: 40, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-beans", name: "French Beans (Avarakkai)", unit: "kg", costPerUnit: 50, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-drumstick", name: "Drumstick (Murungakkai)", unit: "kg", costPerUnit: 40, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-brinjal", name: "Brinjal (Kathirikai)", unit: "kg", costPerUnit: 25, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-ladies-finger", name: "Ladies Finger (Vendaikkai)", unit: "kg", costPerUnit: 45, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-cabbage", name: "Cabbage (Muttakos)", unit: "kg", costPerUnit: 20, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-green-peas", name: "Green Peas (Pattani)", unit: "kg", costPerUnit: 80, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-raw-banana", name: "Raw Banana (Vaazhaikai)", unit: "kg", costPerUnit: 30, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-curry-leaves", name: "Curry Leaves (Karuveppilai)", unit: "kg", costPerUnit: 120, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-coriander", name: "Coriander Leaves (Kothamalli)", unit: "kg", costPerUnit: 100, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-green-chilli", name: "Green Chilli (Pachai Milagai)", unit: "kg", costPerUnit: 60, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-ginger", name: "Ginger (Inji)", unit: "kg", costPerUnit: 120, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-garlic", name: "Garlic (Poondu)", unit: "kg", costPerUnit: 150, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-lemon", name: "Lemon (Elumichai)", unit: "kg", costPerUnit: 70, supplier: "Koyambedu Fresh Vegetables", category: "produce" },
  { id: "i-coconut", name: "Coconut (Thengai)", unit: "each", costPerUnit: 22, supplier: "Palakkad Coconut Traders", category: "produce" },
  { id: "i-grated-coconut", name: "Grated Coconut", unit: "kg", costPerUnit: 90, supplier: "Palakkad Coconut Traders", category: "produce" },

  // DAIRY
  { id: "i-curd", name: "Curd / Yogurt (Thayir)", unit: "kg", costPerUnit: 45, supplier: "Aavin Dairy - Coimbatore Depot", category: "dairy" },
  { id: "i-milk", name: "Full Cream Milk", unit: "liter", costPerUnit: 48, supplier: "Aavin Dairy - Coimbatore Depot", category: "dairy" },
  { id: "i-ghee", name: "Pure Cow Ghee", unit: "kg", costPerUnit: 500, supplier: "Aavin Dairy - Coimbatore Depot", category: "dairy" },
  { id: "i-butter", name: "Butter (Vennai)", unit: "kg", costPerUnit: 350, supplier: "Aavin Dairy - Coimbatore Depot", category: "dairy" },
  { id: "i-paneer", name: "Paneer (Fresh)", unit: "kg", costPerUnit: 320, supplier: "Aavin Dairy - Coimbatore Depot", category: "dairy" },

  // OILS
  { id: "i-sunflower-oil", name: "Refined Sunflower Oil", unit: "liter", costPerUnit: 140, supplier: "Kovai Oil & Ghee Suppliers", category: "oil-fat" },
  { id: "i-gingelly-oil", name: "Gingelly Oil (Nallennai)", unit: "liter", costPerUnit: 300, supplier: "Kovai Oil & Ghee Suppliers", category: "oil-fat" },
  { id: "i-coconut-oil", name: "Coconut Oil", unit: "liter", costPerUnit: 200, supplier: "Kovai Oil & Ghee Suppliers", category: "oil-fat" },

  // SPICES
  { id: "i-chilli-powder", name: "Red Chilli Powder", unit: "kg", costPerUnit: 240, supplier: "Pollachi Masala Traders", category: "spice" },
  { id: "i-turmeric", name: "Turmeric Powder (Manjal)", unit: "kg", costPerUnit: 160, supplier: "Pollachi Masala Traders", category: "spice" },
  { id: "i-coriander-powder", name: "Coriander Powder (Malli)", unit: "kg", costPerUnit: 140, supplier: "Pollachi Masala Traders", category: "spice" },
  { id: "i-cumin", name: "Cumin Seeds (Jeeragam)", unit: "kg", costPerUnit: 350, supplier: "Pollachi Masala Traders", category: "spice" },
  { id: "i-mustard", name: "Mustard Seeds (Kadugu)", unit: "kg", costPerUnit: 120, supplier: "Pollachi Masala Traders", category: "spice" },
  { id: "i-black-pepper", name: "Black Pepper (Milagu)", unit: "kg", costPerUnit: 650, supplier: "Pollachi Masala Traders", category: "spice" },
  { id: "i-cardamom", name: "Cardamom (Elakkai)", unit: "kg", costPerUnit: 2400, supplier: "Pollachi Masala Traders", category: "spice" },
  { id: "i-cinnamon", name: "Cinnamon (Pattai)", unit: "kg", costPerUnit: 450, supplier: "Pollachi Masala Traders", category: "spice" },
  { id: "i-fennel", name: "Fennel Seeds (Sombu)", unit: "kg", costPerUnit: 280, supplier: "Pollachi Masala Traders", category: "spice" },
  { id: "i-fenugreek", name: "Fenugreek Seeds (Vendayam)", unit: "kg", costPerUnit: 140, supplier: "Pollachi Masala Traders", category: "spice" },

  // CONDIMENTS
  { id: "i-tamarind", name: "Tamarind (Puli)", unit: "kg", costPerUnit: 120, supplier: "Erode Provision Stores", category: "condiment" },
  { id: "i-jaggery", name: "Jaggery (Vellam)", unit: "kg", costPerUnit: 65, supplier: "Erode Provision Stores", category: "condiment" },
  { id: "i-sugar", name: "Sugar (Sakkarai)", unit: "kg", costPerUnit: 42, supplier: "Erode Provision Stores", category: "condiment" },
  { id: "i-salt", name: "Iodized Salt", unit: "kg", costPerUnit: 10, supplier: "Erode Provision Stores", category: "condiment" },

  // DRY GOODS
  { id: "i-cashew", name: "Cashew Nuts (Mundiri)", unit: "kg", costPerUnit: 800, supplier: "Erode Provision Stores", category: "dry-goods" },
  { id: "i-raisins", name: "Raisins (Thirachai)", unit: "kg", costPerUnit: 300, supplier: "Erode Provision Stores", category: "dry-goods" },
  { id: "i-papad", name: "Papad (Appalam)", unit: "kg", costPerUnit: 200, supplier: "Erode Provision Stores", category: "dry-goods" },

  // PROTEIN
  { id: "i-chicken", name: "Chicken Curry Cut", unit: "kg", costPerUnit: 190, supplier: "Nilgiris Fresh Meat & Poultry", category: "protein" },
  { id: "i-mutton", name: "Mutton (Goat Meat)", unit: "kg", costPerUnit: 750, supplier: "Nilgiris Fresh Meat & Poultry", category: "protein" },
  { id: "i-eggs", name: "Eggs (Muttai)", unit: "each", costPerUnit: 7, supplier: "Nilgiris Fresh Meat & Poultry", category: "protein" },
  { id: "i-fish-seer", name: "Seer Fish (Vanjaram)", unit: "kg", costPerUnit: 800, supplier: "Nilgiris Fresh Meat & Poultry", category: "protein" },
  { id: "i-prawns", name: "Prawns (Eral)", unit: "kg", costPerUnit: 500, supplier: "Nilgiris Fresh Meat & Poultry", category: "protein" },

  // PACKAGING
  { id: "i-banana-leaf", name: "Banana Leaf", unit: "each", costPerUnit: 3.5, supplier: "Coimbatore Flower Market", category: "disposable" },
  { id: "i-foil-container", name: "Aluminium Foil Container (750ml)", unit: "each", costPerUnit: 6, supplier: "Coimbatore Packaging Solutions", category: "packaging" },
  { id: "i-paper-plate", name: "Paper Plates (10 inch)", unit: "each", costPerUnit: 3, supplier: "Coimbatore Packaging Solutions", category: "disposable" },
  { id: "i-cling-wrap", name: "Cling Wrap Roll", unit: "each", costPerUnit: 300, supplier: "Coimbatore Packaging Solutions", category: "packaging" },
];

// ==================== CLIENTS ====================
// Interface: { id, name, email, phone, company?, address?, city?, state?, notes?, createdAt, updatedAt }
const clients = [
  { id: "c-tidel", name: "Suresh Venkataraman", email: "suresh.v@tidelpark-cbe.com", phone: "+91 94430 12345", company: "Tidel Park IT Companies", address: "Tidel Park, ELCOT SEZ, Vilankurichi Road", city: "Coimbatore", state: "Tamil Nadu", notes: "Daily cafeteria contract - 1,200 meals/day (breakfast + lunch). Payment: Monthly, Net 30. Predominantly vegetarian with some non-veg options." },
  { id: "c-psg", name: "Dr. Ramachandran K", email: "ramachandran@psgtech.ac.in", phone: "+91 98420 56789", company: "PSG College of Technology", address: "Peelamedu", city: "Coimbatore", state: "Tamil Nadu", notes: "College canteen + hostel mess. 2,500 meals/day across 4 hostels. Pure vegetarian. Jain section needed. Annual contract renewal June." },
  { id: "c-wedding", name: "Meenakshi Sundaram", email: "meenakshi@kovaiweddings.in", phone: "+91 90430 78901", company: "Kovai Wedding Planners", address: "RS Puram", city: "Coimbatore", state: "Tamil Nadu", notes: "Premium wedding planner. 15-20 weddings/month during season (Apr-Jul, Nov-Jan). 800-3000 guests. High margin client." },
  { id: "c-roots", name: "Anand Krishnamurthy", email: "anand.k@rootsindia.com", phone: "+91 96550 34567", company: "Roots Industries Ltd", address: "Roots Garden, Kanuvai", city: "Coimbatore", state: "Tamil Nadu", notes: "Factory canteen - 800 meals/day (lunch + night shift). Workers prefer heavy portions. Include buttermilk daily. Payment: Net 15." },
  { id: "c-collector", name: "Vijayalakshmi", email: "collector.cbe@tn.gov.in", phone: "+91 422 2300100", company: "Coimbatore District Collector Office", address: "Race Course Road", city: "Coimbatore", state: "Tamil Nadu", notes: "Government functions, VIP visits. 200-500 meals/event. Payment: Treasury 45-60 day cycle. Need FSSAI compliance docs." },
  { id: "c-amrita", name: "Dr. Sathish Kumar", email: "sathish.k@amritahospital.org", phone: "+91 94870 45678", company: "Amrita Hospital Coimbatore", address: "AIMS, Ponekkara", city: "Coimbatore", state: "Tamil Nadu", notes: "Patient meals + staff cafeteria. 600/day. Low oil/salt/spice for patients. Diabetic menu needed. NABH compliance required." },
  { id: "c-isha", name: "Maheshwaran", email: "mahesh@ishafoundation.org", phone: "+91 94432 67890", company: "Isha Foundation", address: "Isha Yoga Center, Velliangiri Foothills", city: "Coimbatore", state: "Tamil Nadu", notes: "Ashram meals. Strictly vegetarian - Sattvic (no onion/garlic). 300-2000 per program. MahaShivratri needs 50,000+. Book 1 month ahead." },
  { id: "c-kpr", name: "Ramesh Babu", email: "ramesh.b@kprmill.com", phone: "+91 94431 89012", company: "KPR Mill Limited", address: "Sathyamangalam Road", city: "Coimbatore", state: "Tamil Nadu", notes: "Textile mill canteen. 1,500 meals/day (3 shifts). High-calorie meals needed. Budget: ₹55-65 per meal." },
];

// ==================== RECIPES ====================
// Interface: { id, name, servings, costPerServing, totalRecipeCost, category, description?, createdAt, updatedAt }
// Lines: { id, ingredientId, ingredientName, quantity, unit, costPerUnit, lineCost, sortOrder, notes? }
const recipes = [
  {
    id: "r-sambar",
    name: "Sambar (Traditional Tamil)",
    servings: 333,
    costPerServing: 9.6,
    totalRecipeCost: 3200,
    category: "soup",
    description: "Classic Tamil sambar with toor dal, drumstick, brinjal, onion in tamarind base. Yields 50 liters. Tempered with mustard, curry leaves in ghee.",
    lines: [
      { id: "rl-1", ingredientId: "i-toor-dal", ingredientName: "Toor Dal (Arhar)", quantity: 8, unit: "kg", costPerUnit: 130, lineCost: 1040, sortOrder: 1, notes: "Soaked 30 min, pressure cooked 4 whistles" },
      { id: "rl-2", ingredientId: "i-drumstick", ingredientName: "Drumstick (Murungakkai)", quantity: 3, unit: "kg", costPerUnit: 40, lineCost: 120, sortOrder: 2, notes: "Cut 2-inch pieces" },
      { id: "rl-3", ingredientId: "i-brinjal", ingredientName: "Brinjal (Kathirikai)", quantity: 2, unit: "kg", costPerUnit: 25, lineCost: 50, sortOrder: 3, notes: "Quartered" },
      { id: "rl-4", ingredientId: "i-onion", ingredientName: "Onion (Vengayam)", quantity: 4, unit: "kg", costPerUnit: 35, lineCost: 140, sortOrder: 4, notes: "Sliced" },
      { id: "rl-5", ingredientId: "i-tomato", ingredientName: "Tomato (Thakkali)", quantity: 3, unit: "kg", costPerUnit: 30, lineCost: 90, sortOrder: 5, notes: "Chopped" },
      { id: "rl-6", ingredientId: "i-tamarind", ingredientName: "Tamarind (Puli)", quantity: 0.5, unit: "kg", costPerUnit: 120, lineCost: 60, sortOrder: 6, notes: "Soaked and extracted" },
      { id: "rl-7", ingredientId: "i-turmeric", ingredientName: "Turmeric Powder (Manjal)", quantity: 0.1, unit: "kg", costPerUnit: 160, lineCost: 16, sortOrder: 7 },
      { id: "rl-8", ingredientId: "i-chilli-powder", ingredientName: "Red Chilli Powder", quantity: 0.15, unit: "kg", costPerUnit: 240, lineCost: 36, sortOrder: 8 },
      { id: "rl-9", ingredientId: "i-coriander-powder", ingredientName: "Coriander Powder (Malli)", quantity: 0.2, unit: "kg", costPerUnit: 140, lineCost: 28, sortOrder: 9 },
      { id: "rl-10", ingredientId: "i-mustard", ingredientName: "Mustard Seeds (Kadugu)", quantity: 0.05, unit: "kg", costPerUnit: 120, lineCost: 6, sortOrder: 10, notes: "For tempering" },
      { id: "rl-11", ingredientId: "i-sunflower-oil", ingredientName: "Refined Sunflower Oil", quantity: 1, unit: "liter", costPerUnit: 140, lineCost: 140, sortOrder: 11 },
      { id: "rl-12", ingredientId: "i-curry-leaves", ingredientName: "Curry Leaves (Karuveppilai)", quantity: 0.1, unit: "kg", costPerUnit: 120, lineCost: 12, sortOrder: 12 },
    ],
  },
  {
    id: "r-rasam",
    name: "Rasam (Pepper-Tamarind)",
    servings: 416,
    costPerServing: 4.3,
    totalRecipeCost: 1800,
    category: "soup",
    description: "Pepper-tamarind rasam with crushed garlic, tomato. Yields 50 liters. Light and digestive. Tempered in ghee.",
    lines: [
      { id: "rl-1", ingredientId: "i-tamarind", ingredientName: "Tamarind (Puli)", quantity: 1, unit: "kg", costPerUnit: 120, lineCost: 120, sortOrder: 1, notes: "Extracted juice" },
      { id: "rl-2", ingredientId: "i-tomato", ingredientName: "Tomato (Thakkali)", quantity: 5, unit: "kg", costPerUnit: 30, lineCost: 150, sortOrder: 2, notes: "Crushed" },
      { id: "rl-3", ingredientId: "i-black-pepper", ingredientName: "Black Pepper (Milagu)", quantity: 0.2, unit: "kg", costPerUnit: 650, lineCost: 130, sortOrder: 3, notes: "Coarse crushed" },
      { id: "rl-4", ingredientId: "i-cumin", ingredientName: "Cumin Seeds (Jeeragam)", quantity: 0.15, unit: "kg", costPerUnit: 350, lineCost: 52.5, sortOrder: 4, notes: "Crushed" },
      { id: "rl-5", ingredientId: "i-garlic", ingredientName: "Garlic (Poondu)", quantity: 0.5, unit: "kg", costPerUnit: 150, lineCost: 75, sortOrder: 5, notes: "Crushed" },
      { id: "rl-6", ingredientId: "i-coriander", ingredientName: "Coriander Leaves (Kothamalli)", quantity: 0.5, unit: "kg", costPerUnit: 100, lineCost: 50, sortOrder: 7, notes: "Chopped garnish" },
      { id: "rl-7", ingredientId: "i-ghee", ingredientName: "Pure Cow Ghee", quantity: 0.5, unit: "kg", costPerUnit: 500, lineCost: 250, sortOrder: 8, notes: "For tempering" },
    ],
  },
  {
    id: "r-veg-biryani",
    name: "Vegetable Biryani",
    servings: 166,
    costPerServing: 41,
    totalRecipeCost: 6800,
    category: "main",
    description: "Layered vegetable biryani with basmati rice, saffron, dum-cooked. Yields 50kg. Garnished with fried cashew and crispy onions.",
    lines: [
      { id: "rl-1", ingredientId: "i-basmati-rice", ingredientName: "Basmati Rice", quantity: 15, unit: "kg", costPerUnit: 100, lineCost: 1500, sortOrder: 1, notes: "Soaked 30 min" },
      { id: "rl-2", ingredientId: "i-onion", ingredientName: "Onion (Vengayam)", quantity: 8, unit: "kg", costPerUnit: 35, lineCost: 280, sortOrder: 2, notes: "Thin sliced for frying" },
      { id: "rl-3", ingredientId: "i-carrot", ingredientName: "Carrot (Kaarat)", quantity: 3, unit: "kg", costPerUnit: 40, lineCost: 120, sortOrder: 3, notes: "Diced" },
      { id: "rl-4", ingredientId: "i-beans", ingredientName: "French Beans (Avarakkai)", quantity: 2, unit: "kg", costPerUnit: 50, lineCost: 100, sortOrder: 4, notes: "Diced" },
      { id: "rl-5", ingredientId: "i-green-peas", ingredientName: "Green Peas (Pattani)", quantity: 2, unit: "kg", costPerUnit: 80, lineCost: 160, sortOrder: 5, notes: "Shelled" },
      { id: "rl-6", ingredientId: "i-potato", ingredientName: "Potato (Urulaikizhangu)", quantity: 3, unit: "kg", costPerUnit: 30, lineCost: 90, sortOrder: 6, notes: "Cubed and fried" },
      { id: "rl-7", ingredientId: "i-ghee", ingredientName: "Pure Cow Ghee", quantity: 3, unit: "kg", costPerUnit: 500, lineCost: 1500, sortOrder: 7 },
      { id: "rl-8", ingredientId: "i-cashew", ingredientName: "Cashew Nuts (Mundiri)", quantity: 0.5, unit: "kg", costPerUnit: 800, lineCost: 400, sortOrder: 8, notes: "Fried" },
      { id: "rl-9", ingredientId: "i-sunflower-oil", ingredientName: "Refined Sunflower Oil", quantity: 5, unit: "liter", costPerUnit: 140, lineCost: 700, sortOrder: 10 },
    ],
  },
  {
    id: "r-chicken-biryani",
    name: "Chicken Biryani (Dindigul Style)",
    servings: 142,
    costPerServing: 88,
    totalRecipeCost: 12500,
    category: "main",
    description: "Dindigul-style chicken biryani with sona masoori rice (not basmati), heavy spice, small chicken pieces. 50kg yield.",
    lines: [
      { id: "rl-1", ingredientId: "i-sona-masoori", ingredientName: "Sona Masoori Rice", quantity: 15, unit: "kg", costPerUnit: 55, lineCost: 825, sortOrder: 1, notes: "Soaked 20 min" },
      { id: "rl-2", ingredientId: "i-chicken", ingredientName: "Chicken Curry Cut", quantity: 20, unit: "kg", costPerUnit: 190, lineCost: 3800, sortOrder: 2, notes: "Small curry cut, marinated" },
      { id: "rl-3", ingredientId: "i-onion", ingredientName: "Onion (Vengayam)", quantity: 10, unit: "kg", costPerUnit: 35, lineCost: 350, sortOrder: 3, notes: "Sliced thin" },
      { id: "rl-4", ingredientId: "i-curd", ingredientName: "Curd / Yogurt (Thayir)", quantity: 3, unit: "kg", costPerUnit: 45, lineCost: 135, sortOrder: 4, notes: "For marination" },
      { id: "rl-5", ingredientId: "i-ghee", ingredientName: "Pure Cow Ghee", quantity: 4, unit: "kg", costPerUnit: 500, lineCost: 2000, sortOrder: 5 },
      { id: "rl-6", ingredientId: "i-sunflower-oil", ingredientName: "Refined Sunflower Oil", quantity: 5, unit: "liter", costPerUnit: 140, lineCost: 700, sortOrder: 6 },
    ],
  },
  {
    id: "r-plain-rice",
    name: "Plain Steamed Rice",
    servings: 400,
    costPerServing: 4.6,
    totalRecipeCost: 1850,
    category: "main",
    description: "Simple steamed ponni rice (1:2 ratio). Yields 100kg cooked. Base for sambar-rice meals.",
    lines: [
      { id: "rl-1", ingredientId: "i-ponni-rice", ingredientName: "Ponni Raw Rice", quantity: 40, unit: "kg", costPerUnit: 45, lineCost: 1800, sortOrder: 1, notes: "Washed 3 times" },
      { id: "rl-2", ingredientId: "i-salt", ingredientName: "Iodized Salt", quantity: 0.5, unit: "kg", costPerUnit: 10, lineCost: 5, sortOrder: 2 },
    ],
  },
  {
    id: "r-curd-rice",
    name: "Curd Rice (Thayir Sadam)",
    servings: 200,
    costPerServing: 11,
    totalRecipeCost: 2200,
    category: "main",
    description: "Cool curd rice with mustard tempering, ginger, green chilli. 40kg yield. Essential South Indian comfort dish.",
    lines: [
      { id: "rl-1", ingredientId: "i-ponni-rice", ingredientName: "Ponni Raw Rice", quantity: 10, unit: "kg", costPerUnit: 45, lineCost: 450, sortOrder: 1, notes: "Cooked soft, mashed" },
      { id: "rl-2", ingredientId: "i-curd", ingredientName: "Curd / Yogurt (Thayir)", quantity: 15, unit: "kg", costPerUnit: 45, lineCost: 675, sortOrder: 2, notes: "Fresh, not sour" },
      { id: "rl-3", ingredientId: "i-milk", ingredientName: "Full Cream Milk", quantity: 5, unit: "liter", costPerUnit: 48, lineCost: 240, sortOrder: 3 },
      { id: "rl-4", ingredientId: "i-mustard", ingredientName: "Mustard Seeds (Kadugu)", quantity: 0.05, unit: "kg", costPerUnit: 120, lineCost: 6, sortOrder: 4, notes: "For tempering" },
      { id: "rl-5", ingredientId: "i-green-chilli", ingredientName: "Green Chilli (Pachai Milagai)", quantity: 0.2, unit: "kg", costPerUnit: 60, lineCost: 12, sortOrder: 5, notes: "Finely chopped" },
      { id: "rl-6", ingredientId: "i-ginger", ingredientName: "Ginger (Inji)", quantity: 0.1, unit: "kg", costPerUnit: 120, lineCost: 12, sortOrder: 6, notes: "Grated" },
    ],
  },
  {
    id: "r-poriyal",
    name: "Beans Poriyal",
    servings: 250,
    costPerServing: 5.6,
    totalRecipeCost: 1400,
    category: "side",
    description: "Dry-sauteed French beans with coconut, mustard tempering. 20kg yield. Classic South Indian side dish.",
    lines: [
      { id: "rl-1", ingredientId: "i-beans", ingredientName: "French Beans (Avarakkai)", quantity: 12, unit: "kg", costPerUnit: 50, lineCost: 600, sortOrder: 1, notes: "Finely chopped" },
      { id: "rl-2", ingredientId: "i-grated-coconut", ingredientName: "Grated Coconut", quantity: 2, unit: "kg", costPerUnit: 90, lineCost: 180, sortOrder: 2 },
      { id: "rl-3", ingredientId: "i-mustard", ingredientName: "Mustard Seeds (Kadugu)", quantity: 0.05, unit: "kg", costPerUnit: 120, lineCost: 6, sortOrder: 3 },
      { id: "rl-4", ingredientId: "i-urad-dal", ingredientName: "Urad Dal (Black Gram)", quantity: 0.1, unit: "kg", costPerUnit: 120, lineCost: 12, sortOrder: 4, notes: "For tempering" },
      { id: "rl-5", ingredientId: "i-sunflower-oil", ingredientName: "Refined Sunflower Oil", quantity: 1, unit: "liter", costPerUnit: 140, lineCost: 140, sortOrder: 5 },
    ],
  },
  {
    id: "r-coconut-chutney",
    name: "Coconut Chutney",
    servings: 250,
    costPerServing: 3.8,
    totalRecipeCost: 950,
    category: "sauce",
    description: "Fresh ground coconut chutney with roasted chana dal, green chilli. 10kg yield. Served with vada, dosa, idli.",
    lines: [
      { id: "rl-1", ingredientId: "i-grated-coconut", ingredientName: "Grated Coconut", quantity: 5, unit: "kg", costPerUnit: 90, lineCost: 450, sortOrder: 1 },
      { id: "rl-2", ingredientId: "i-chana-dal", ingredientName: "Chana Dal", quantity: 0.5, unit: "kg", costPerUnit: 90, lineCost: 45, sortOrder: 2, notes: "Dry roasted" },
      { id: "rl-3", ingredientId: "i-green-chilli", ingredientName: "Green Chilli (Pachai Milagai)", quantity: 0.3, unit: "kg", costPerUnit: 60, lineCost: 18, sortOrder: 3 },
    ],
  },
  {
    id: "r-kesari",
    name: "Rava Kesari",
    servings: 250,
    costPerServing: 16.8,
    totalRecipeCost: 4200,
    category: "dessert",
    description: "Rich ghee-soaked rava sweet with saffron, cashew, raisins. 25kg yield. Festival & wedding staple.",
    lines: [
      { id: "rl-1", ingredientId: "i-rava", ingredientName: "Rava (Semolina)", quantity: 5, unit: "kg", costPerUnit: 45, lineCost: 225, sortOrder: 1, notes: "Roasted in ghee" },
      { id: "rl-2", ingredientId: "i-sugar", ingredientName: "Sugar (Sakkarai)", quantity: 7.5, unit: "kg", costPerUnit: 42, lineCost: 315, sortOrder: 2 },
      { id: "rl-3", ingredientId: "i-ghee", ingredientName: "Pure Cow Ghee", quantity: 5, unit: "kg", costPerUnit: 500, lineCost: 2500, sortOrder: 3, notes: "Added in stages" },
      { id: "rl-4", ingredientId: "i-cashew", ingredientName: "Cashew Nuts (Mundiri)", quantity: 0.5, unit: "kg", costPerUnit: 800, lineCost: 400, sortOrder: 4, notes: "Fried golden" },
      { id: "rl-5", ingredientId: "i-raisins", ingredientName: "Raisins (Thirachai)", quantity: 0.3, unit: "kg", costPerUnit: 300, lineCost: 90, sortOrder: 5, notes: "Fried" },
    ],
  },
  {
    id: "r-medu-vada",
    name: "Medu Vada",
    servings: 125,
    costPerServing: 22.4,
    totalRecipeCost: 2800,
    category: "appetizer",
    description: "Crispy urad dal vada with black pepper, curry leaves. Yields 250 pieces (2 per serving). Deep fried golden.",
    lines: [
      { id: "rl-1", ingredientId: "i-urad-dal", ingredientName: "Urad Dal (Black Gram)", quantity: 8, unit: "kg", costPerUnit: 120, lineCost: 960, sortOrder: 1, notes: "Soaked 4hr, ground smooth" },
      { id: "rl-2", ingredientId: "i-sunflower-oil", ingredientName: "Refined Sunflower Oil", quantity: 10, unit: "liter", costPerUnit: 140, lineCost: 1400, sortOrder: 2, notes: "For deep frying" },
      { id: "rl-3", ingredientId: "i-black-pepper", ingredientName: "Black Pepper (Milagu)", quantity: 0.05, unit: "kg", costPerUnit: 650, lineCost: 32.5, sortOrder: 3, notes: "Coarse crushed" },
      { id: "rl-4", ingredientId: "i-curry-leaves", ingredientName: "Curry Leaves (Karuveppilai)", quantity: 0.1, unit: "kg", costPerUnit: 120, lineCost: 12, sortOrder: 4, notes: "Chopped" },
    ],
  },
  {
    id: "r-payasam",
    name: "Semiya Payasam",
    servings: 250,
    costPerServing: 15.2,
    totalRecipeCost: 3800,
    category: "dessert",
    description: "Vermicelli kheer in full cream milk with cardamom, cashew, raisins. 30 liters yield. Rich and creamy.",
    lines: [
      { id: "rl-1", ingredientId: "i-vermicelli", ingredientName: "Vermicelli (Semiya)", quantity: 3, unit: "kg", costPerUnit: 65, lineCost: 195, sortOrder: 1, notes: "Roasted in ghee" },
      { id: "rl-2", ingredientId: "i-milk", ingredientName: "Full Cream Milk", quantity: 25, unit: "liter", costPerUnit: 48, lineCost: 1200, sortOrder: 2, notes: "Boiled" },
      { id: "rl-3", ingredientId: "i-sugar", ingredientName: "Sugar (Sakkarai)", quantity: 5, unit: "kg", costPerUnit: 42, lineCost: 210, sortOrder: 3 },
      { id: "rl-4", ingredientId: "i-ghee", ingredientName: "Pure Cow Ghee", quantity: 2, unit: "kg", costPerUnit: 500, lineCost: 1000, sortOrder: 4 },
      { id: "rl-5", ingredientId: "i-cashew", ingredientName: "Cashew Nuts (Mundiri)", quantity: 0.3, unit: "kg", costPerUnit: 800, lineCost: 240, sortOrder: 5, notes: "Fried" },
      { id: "rl-6", ingredientId: "i-cardamom", ingredientName: "Cardamom (Elakkai)", quantity: 0.02, unit: "kg", costPerUnit: 2400, lineCost: 48, sortOrder: 6, notes: "Crushed" },
    ],
  },
  {
    id: "r-mutton-curry",
    name: "Chettinad Mutton Curry",
    servings: 200,
    costPerServing: 92.5,
    totalRecipeCost: 18500,
    category: "main",
    description: "Slow-cooked Chettinad-style mutton with roasted spices, fennel, pepper. 30kg yield. Premium non-veg dish.",
    lines: [
      { id: "rl-1", ingredientId: "i-mutton", ingredientName: "Mutton (Goat Meat)", quantity: 15, unit: "kg", costPerUnit: 750, lineCost: 11250, sortOrder: 1, notes: "Cleaned, curry cut" },
      { id: "rl-2", ingredientId: "i-onion", ingredientName: "Onion (Vengayam)", quantity: 5, unit: "kg", costPerUnit: 35, lineCost: 175, sortOrder: 2, notes: "Sliced" },
      { id: "rl-3", ingredientId: "i-tomato", ingredientName: "Tomato (Thakkali)", quantity: 3, unit: "kg", costPerUnit: 30, lineCost: 90, sortOrder: 3, notes: "Chopped" },
      { id: "rl-4", ingredientId: "i-gingelly-oil", ingredientName: "Gingelly Oil (Nallennai)", quantity: 3, unit: "liter", costPerUnit: 300, lineCost: 900, sortOrder: 4 },
      { id: "rl-5", ingredientId: "i-fennel", ingredientName: "Fennel Seeds (Sombu)", quantity: 0.1, unit: "kg", costPerUnit: 280, lineCost: 28, sortOrder: 5, notes: "Dry roasted" },
      { id: "rl-6", ingredientId: "i-black-pepper", ingredientName: "Black Pepper (Milagu)", quantity: 0.15, unit: "kg", costPerUnit: 650, lineCost: 97.5, sortOrder: 6, notes: "Crushed" },
    ],
  },
];

// ==================== EVENTS ====================
// Interface: { id, clientId, clientName, eventDate, eventType, guestCount, status, totalCost, totalPrice, marginPercentage, notes?, createdAt, updatedAt }
// Status: "inquiry" | "proposal" | "confirmed" | "completed" | "cancelled"
// MenuItem: { id, recipeId, recipeName, quantity, costPerServing, lineCost, servings, notes? }
const events = [
  // TODAY - Active events
  {
    id: "e-psg-apr13",
    clientId: "c-psg", clientName: "PSG College of Technology",
    eventDate: daysFromNow(0),
    eventType: "Daily Hostel Meals",
    guestCount: 2500,
    status: "confirmed",
    totalCost: 121250, totalPrice: 137500, marginPercentage: 11.8,
    notes: "Daily hostel meals (4 hostels). Pure vegetarian. Separate Jain section in Hostel 2. Extra curd rice always.",
    menuItems: [
      { id: "mi-1", recipeId: "r-plain-rice", recipeName: "Plain Steamed Rice", quantity: 656, costPerServing: 4.6, lineCost: 12180, servings: 2625 },
      { id: "mi-2", recipeId: "r-sambar", recipeName: "Sambar (Traditional Tamil)", quantity: 393, costPerServing: 9.6, lineCost: 25200, servings: 2625 },
      { id: "mi-3", recipeId: "r-rasam", recipeName: "Rasam (Pepper-Tamarind)", quantity: 252, costPerServing: 4.3, lineCost: 9030, servings: 2100 },
      { id: "mi-4", recipeId: "r-poriyal", recipeName: "Beans Poriyal", quantity: 210, costPerServing: 5.6, lineCost: 14700, servings: 2625 },
      { id: "mi-5", recipeId: "r-curd-rice", recipeName: "Curd Rice (Thayir Sadam)", quantity: 315, costPerServing: 11, lineCost: 17325, servings: 1575 },
    ],
  },
  {
    id: "e-amrita-apr13",
    clientId: "c-amrita", clientName: "Amrita Hospital Coimbatore",
    eventDate: daysFromNow(0),
    eventType: "Hospital Patient Meals",
    guestCount: 600,
    status: "confirmed",
    totalCost: 32343, totalPrice: 36000, marginPercentage: 10.2,
    notes: "Patient meals - strict hygiene. Separate low-salt, diabetic, and liquid diet trays. Nutritional labels required.",
    menuItems: [
      { id: "mi-1", recipeId: "r-plain-rice", recipeName: "Plain Steamed Rice", quantity: 157, costPerServing: 4.6, lineCost: 2920, servings: 630 },
      { id: "mi-2", recipeId: "r-sambar", recipeName: "Sambar (Traditional Tamil)", quantity: 75.6, costPerServing: 9.6, lineCost: 4838, servings: 504 },
      { id: "mi-3", recipeId: "r-rasam", recipeName: "Rasam (Pepper-Tamarind)", quantity: 75.6, costPerServing: 4.3, lineCost: 2709, servings: 630 },
      { id: "mi-4", recipeId: "r-curd-rice", recipeName: "Curd Rice (Thayir Sadam)", quantity: 75.6, costPerServing: 11, lineCost: 4158, servings: 378 },
    ],
  },
  // TOMORROW
  {
    id: "e-tidel-apr14",
    clientId: "c-tidel", clientName: "Tidel Park IT Companies",
    eventDate: daysFromNow(1),
    eventType: "Corporate Cafeteria Lunch",
    guestCount: 1200,
    status: "confirmed",
    totalCost: 61122, totalPrice: 78000, marginPercentage: 21.6,
    notes: "Daily cafeteria service. Menu rotates weekly. Include buttermilk. A/C dining hall. Vegetarian with egg option.",
    menuItems: [
      { id: "mi-1", recipeId: "r-plain-rice", recipeName: "Plain Steamed Rice", quantity: 315, costPerServing: 4.6, lineCost: 5850, servings: 1260 },
      { id: "mi-2", recipeId: "r-sambar", recipeName: "Sambar (Traditional Tamil)", quantity: 189, costPerServing: 9.6, lineCost: 12100, servings: 1260 },
      { id: "mi-3", recipeId: "r-rasam", recipeName: "Rasam (Pepper-Tamarind)", quantity: 120, costPerServing: 4.3, lineCost: 4330, servings: 1008 },
      { id: "mi-4", recipeId: "r-poriyal", recipeName: "Beans Poriyal", quantity: 70, costPerServing: 5.6, lineCost: 4940, servings: 882 },
      { id: "mi-5", recipeId: "r-curd-rice", recipeName: "Curd Rice (Thayir Sadam)", quantity: 126, costPerServing: 11, lineCost: 6930, servings: 630 },
    ],
  },
  // DAY AFTER TOMORROW
  {
    id: "e-kpr-apr15",
    clientId: "c-kpr", clientName: "KPR Mill Limited",
    eventDate: daysFromNow(2),
    eventType: "Factory Night Shift Dinner",
    guestCount: 500,
    status: "confirmed",
    totalCost: 66194, totalPrice: 70000, marginPercentage: 5.4,
    notes: "Night shift workers - heavy meals. Extra rice. Include papad and pickle. Buttermilk mandatory.",
    menuItems: [
      { id: "mi-1", recipeId: "r-plain-rice", recipeName: "Plain Steamed Rice", quantity: 135, costPerServing: 4.6, lineCost: 2500, servings: 540 },
      { id: "mi-2", recipeId: "r-chicken-biryani", recipeName: "Chicken Biryani (Dindigul Style)", quantity: 135, costPerServing: 88, lineCost: 38000, servings: 432 },
      { id: "mi-3", recipeId: "r-sambar", recipeName: "Sambar (Traditional Tamil)", quantity: 81, costPerServing: 9.6, lineCost: 5184, servings: 540 },
      { id: "mi-4", recipeId: "r-curd-rice", recipeName: "Curd Rice (Thayir Sadam)", quantity: 43, costPerServing: 11, lineCost: 2376, servings: 216 },
    ],
  },
  // 3 DAYS FROM NOW - Big wedding
  {
    id: "e-wedding-murugan",
    clientId: "c-wedding", clientName: "Kovai Wedding Planners",
    eventDate: daysFromNow(3),
    eventType: "Wedding Reception (Murugan-Priya)",
    guestCount: 2500,
    status: "confirmed",
    totalCost: 556185, totalPrice: 700000, marginPercentage: 20.5,
    notes: "Grand wedding reception. 2500+ expected. Banana leaf dinner. Separate Jain counter. Ice cream by client. Stage decoration flowers separate.",
    menuItems: [
      { id: "mi-1", recipeId: "r-veg-biryani", recipeName: "Vegetable Biryani", quantity: 500, costPerServing: 41, lineCost: 87600, servings: 2140 },
      { id: "mi-2", recipeId: "r-chicken-biryani", recipeName: "Chicken Biryani (Dindigul Style)", quantity: 400, costPerServing: 88, lineCost: 164760, servings: 1872 },
      { id: "mi-3", recipeId: "r-sambar", recipeName: "Sambar (Traditional Tamil)", quantity: 240, costPerServing: 9.6, lineCost: 15408, servings: 1605 },
      { id: "mi-4", recipeId: "r-kesari", recipeName: "Rava Kesari", quantity: 267, costPerServing: 16.8, lineCost: 40440, servings: 2407 },
      { id: "mi-5", recipeId: "r-payasam", recipeName: "Semiya Payasam", quantity: 272, costPerServing: 15.2, lineCost: 34580, servings: 2273 },
      { id: "mi-6", recipeId: "r-medu-vada", recipeName: "Medu Vada", quantity: 3210, costPerServing: 22.4, lineCost: 36000, servings: 1605 },
      { id: "mi-7", recipeId: "r-coconut-chutney", recipeName: "Coconut Chutney", quantity: 64, costPerServing: 3.8, lineCost: 6100, servings: 1605 },
    ],
  },
  // 5 DAYS FROM NOW
  {
    id: "e-isha-apr18",
    clientId: "c-isha", clientName: "Isha Foundation",
    eventDate: daysFromNow(5),
    eventType: "Inner Engineering Retreat",
    guestCount: 1500,
    status: "confirmed",
    totalCost: 83686, totalPrice: 97500, marginPercentage: 14.2,
    notes: "Sattvic food ONLY - NO onion, NO garlic. Simple, wholesome cooking. Organic ingredients preferred. Banana leaf. Silent dining.",
    menuItems: [
      { id: "mi-1", recipeId: "r-plain-rice", recipeName: "Plain Steamed Rice", quantity: 397, costPerServing: 4.6, lineCost: 7360, servings: 1590 },
      { id: "mi-2", recipeId: "r-sambar", recipeName: "Sambar (Traditional Tamil)", quantity: 238, costPerServing: 9.6, lineCost: 15264, servings: 1590, notes: "NO onion/garlic version" },
      { id: "mi-3", recipeId: "r-poriyal", recipeName: "Beans Poriyal", quantity: 127, costPerServing: 5.6, lineCost: 8904, servings: 1590 },
      { id: "mi-4", recipeId: "r-curd-rice", recipeName: "Curd Rice (Thayir Sadam)", quantity: 222, costPerServing: 11, lineCost: 12243, servings: 1113, notes: "NO onion/garlic" },
    ],
  },
  // 7 DAYS FROM NOW
  {
    id: "e-collector-apr20",
    clientId: "c-collector", clientName: "Coimbatore District Collector Office",
    eventDate: daysFromNow(7),
    eventType: "District Collectors' Conference",
    guestCount: 200,
    status: "proposal",
    totalCost: 56162, totalPrice: 70000, marginPercentage: 19.8,
    notes: "VIP event. Premium setup with silver serving ware. Printed menu cards. Mineral water at each seat. A/C venue.",
    menuItems: [
      { id: "mi-1", recipeId: "r-veg-biryani", recipeName: "Vegetable Biryani", quantity: 66, costPerServing: 41, lineCost: 11500, servings: 220 },
      { id: "mi-2", recipeId: "r-mutton-curry", recipeName: "Chettinad Mutton Curry", quantity: 19.8, costPerServing: 92.5, lineCost: 12210, servings: 132 },
      { id: "mi-3", recipeId: "r-rasam", recipeName: "Rasam (Pepper-Tamarind)", quantity: 21, costPerServing: 4.3, lineCost: 756, servings: 176 },
      { id: "mi-4", recipeId: "r-kesari", recipeName: "Rava Kesari", quantity: 22, costPerServing: 16.8, lineCost: 3696, servings: 220 },
      { id: "mi-5", recipeId: "r-payasam", recipeName: "Semiya Payasam", quantity: 21, costPerServing: 15.2, lineCost: 2675, servings: 176 },
    ],
  },
  // COMPLETED PAST EVENTS
  {
    id: "e-roots-apr10",
    clientId: "c-roots", clientName: "Roots Industries Ltd",
    eventDate: daysAgo(3),
    eventType: "Factory Canteen Lunch",
    guestCount: 800,
    status: "completed",
    totalCost: 85349, totalPrice: 96000, marginPercentage: 11.1,
    notes: "Factory lunch. 780 actual (20 absent). Slight biryani excess donated to nearby temple.",
    menuItems: [
      { id: "mi-1", recipeId: "r-plain-rice", recipeName: "Plain Steamed Rice", quantity: 214, costPerServing: 4.6, lineCost: 3970, servings: 856 },
      { id: "mi-2", recipeId: "r-chicken-biryani", recipeName: "Chicken Biryani (Dindigul Style)", quantity: 180, costPerServing: 88, lineCost: 45200, servings: 513 },
      { id: "mi-3", recipeId: "r-sambar", recipeName: "Sambar (Traditional Tamil)", quantity: 128, costPerServing: 9.6, lineCost: 8217, servings: 856 },
      { id: "mi-4", recipeId: "r-poriyal", recipeName: "Beans Poriyal", quantity: 54.8, costPerServing: 5.6, lineCost: 3830, servings: 684 },
    ],
  },
  {
    id: "e-wedding-kumar",
    clientId: "c-wedding", clientName: "Kovai Wedding Planners",
    eventDate: daysAgo(5),
    eventType: "Wedding - Kumar-Lakshmi (Veg)",
    guestCount: 1800,
    status: "completed",
    totalCost: 261480, totalPrice: 324000, marginPercentage: 19.3,
    notes: "Pure vegetarian wedding. Banana leaf dinner. Traditional Tamil Brahmin style. 1750 actual guests (50 fewer).",
    menuItems: [
      { id: "mi-1", recipeId: "r-veg-biryani", recipeName: "Vegetable Biryani", quantity: 520, costPerServing: 41, lineCost: 71050, servings: 1733 },
      { id: "mi-2", recipeId: "r-sambar", recipeName: "Sambar (Traditional Tamil)", quantity: 289, costPerServing: 9.6, lineCost: 18508, servings: 1926 },
      { id: "mi-3", recipeId: "r-kesari", recipeName: "Rava Kesari", quantity: 192, costPerServing: 16.8, lineCost: 32316, servings: 1926 },
      { id: "mi-4", recipeId: "r-medu-vada", recipeName: "Medu Vada", quantity: 3080, costPerServing: 22.4, lineCost: 34500, servings: 1540 },
    ],
  },
  // More past events for the week
  {
    id: "e-tidel-apr11",
    clientId: "c-tidel", clientName: "Tidel Park IT Companies",
    eventDate: daysAgo(2),
    eventType: "Corporate Cafeteria Lunch",
    guestCount: 1200,
    status: "completed",
    totalCost: 58900, totalPrice: 78000, marginPercentage: 24.5,
    notes: "Regular Friday lunch. Lower cost day - simpler menu. Good margin.",
    menuItems: [
      { id: "mi-1", recipeId: "r-plain-rice", recipeName: "Plain Steamed Rice", quantity: 300, costPerServing: 4.6, lineCost: 5520, servings: 1200 },
      { id: "mi-2", recipeId: "r-sambar", recipeName: "Sambar (Traditional Tamil)", quantity: 180, costPerServing: 9.6, lineCost: 11520, servings: 1200 },
      { id: "mi-3", recipeId: "r-rasam", recipeName: "Rasam (Pepper-Tamarind)", quantity: 100, costPerServing: 4.3, lineCost: 3570, servings: 830 },
      { id: "mi-4", recipeId: "r-curd-rice", recipeName: "Curd Rice (Thayir Sadam)", quantity: 120, costPerServing: 11, lineCost: 6600, servings: 600 },
    ],
  },
  {
    id: "e-psg-apr12",
    clientId: "c-psg", clientName: "PSG College of Technology",
    eventDate: daysAgo(1),
    eventType: "Daily Hostel Meals",
    guestCount: 2500,
    status: "completed",
    totalCost: 118500, totalPrice: 137500, marginPercentage: 13.8,
    notes: "Saturday hostel meals. Slightly lower attendance (weekend). Special payasam for Saturday.",
    menuItems: [
      { id: "mi-1", recipeId: "r-plain-rice", recipeName: "Plain Steamed Rice", quantity: 625, costPerServing: 4.6, lineCost: 11500, servings: 2500 },
      { id: "mi-2", recipeId: "r-sambar", recipeName: "Sambar (Traditional Tamil)", quantity: 375, costPerServing: 9.6, lineCost: 24000, servings: 2500 },
      { id: "mi-3", recipeId: "r-poriyal", recipeName: "Beans Poriyal", quantity: 200, costPerServing: 5.6, lineCost: 14000, servings: 2500 },
      { id: "mi-4", recipeId: "r-payasam", recipeName: "Semiya Payasam", quantity: 300, costPerServing: 15.2, lineCost: 38000, servings: 2500, notes: "Saturday special" },
    ],
  },
];

// ==================== WASTE ENTRIES ====================
// Interface: { id, eventId?, ingredientId, ingredientName, quantity, unit, costPerUnit, totalCost, reason, date, notes? }
// reason: "spoilage" | "accident" | "prep-loss" | "other"
const wasteEntries = [
  { id: "w-1", ingredientId: "i-tomato", ingredientName: "Tomato (Thakkali)", quantity: 8, unit: "kg", costPerUnit: 30, totalCost: 240, reason: "spoilage", date: daysAgo(1), notes: "Overripe batch from Friday delivery. Summer heat accelerated spoilage." },
  { id: "w-2", ingredientId: "i-coriander", ingredientName: "Coriander Leaves (Kothamalli)", quantity: 1.5, unit: "kg", costPerUnit: 100, totalCost: 150, reason: "spoilage", date: daysAgo(1), notes: "Wilted - should have been used same day." },
  { id: "w-3", eventId: "e-psg-apr12", ingredientId: "i-ponni-rice", ingredientName: "Ponni Raw Rice", quantity: 12, unit: "kg", costPerUnit: 45, totalCost: 540, reason: "other", date: daysAgo(0), notes: "Overproduction - 40 students absent on weekend." },
  { id: "w-4", ingredientId: "i-drumstick", ingredientName: "Drumstick (Murungakkai)", quantity: 4, unit: "kg", costPerUnit: 40, totalCost: 160, reason: "prep-loss", date: daysAgo(0), notes: "Regular trim waste from sambar prep - ends and fibrous parts." },
  { id: "w-5", eventId: "e-roots-apr10", ingredientId: "i-chicken", ingredientName: "Chicken Curry Cut", quantity: 5, unit: "kg", costPerUnit: 190, totalCost: 950, reason: "other", date: daysAgo(3), notes: "Excess biryani - 20 fewer workers than expected. Donated to temple." },
  { id: "w-6", ingredientId: "i-curd", ingredientName: "Curd / Yogurt (Thayir)", quantity: 10, unit: "kg", costPerUnit: 45, totalCost: 450, reason: "spoilage", date: daysAgo(2), notes: "Soured overnight - refrigerator temp issue in Store Room 2." },
  { id: "w-7", eventId: "e-wedding-kumar", ingredientId: "i-onion", ingredientName: "Onion (Vengayam)", quantity: 15, unit: "kg", costPerUnit: 35, totalCost: 525, reason: "prep-loss", date: daysAgo(5), notes: "Regular peel/trim waste from 150kg onion prep for wedding." },
  { id: "w-8", ingredientId: "i-sunflower-oil", ingredientName: "Refined Sunflower Oil", quantity: 5, unit: "liter", costPerUnit: 140, totalCost: 700, reason: "accident", date: daysAgo(4), notes: "Oil overheated during vada frying. New trainee on fryer station." },
  { id: "w-9", ingredientId: "i-milk", ingredientName: "Full Cream Milk", quantity: 8, unit: "liter", costPerUnit: 48, totalCost: 384, reason: "spoilage", date: daysAgo(6), notes: "Power cut spoiled milk before payasam prep." },
  { id: "w-10", eventId: "e-wedding-kumar", ingredientId: "i-banana-leaf", ingredientName: "Banana Leaf", quantity: 50, unit: "each", costPerUnit: 3.5, totalCost: 175, reason: "prep-loss", date: daysAgo(5), notes: "Torn/damaged leaves sorted out before wedding service." },
  { id: "w-11", ingredientId: "i-ghee", ingredientName: "Pure Cow Ghee", quantity: 0.5, unit: "kg", costPerUnit: 500, totalCost: 250, reason: "accident", date: daysAgo(3), notes: "Spilled during kesari preparation. Container slipped." },
  { id: "w-12", ingredientId: "i-carrot", ingredientName: "Carrot (Kaarat)", quantity: 3, unit: "kg", costPerUnit: 40, totalCost: 120, reason: "prep-loss", date: daysAgo(4), notes: "Peeling waste from biryani prep." },
];

// ==================== INVENTORY ====================
// Interface: { id, ingredientId, ingredientName, currentQuantity, unit, reorderPoint, lastRestockedAt, costPerUnit?, updatedAt }
const inventoryRecords = [
  { id: "inv-1", ingredientId: "i-ponni-rice", ingredientName: "Ponni Raw Rice", currentQuantity: 380, unit: "kg", reorderPoint: 200, lastRestockedAt: daysAgo(1), costPerUnit: 45, updatedAt: new Date() },
  { id: "inv-2", ingredientId: "i-sona-masoori", ingredientName: "Sona Masoori Rice", currentQuantity: 65, unit: "kg", reorderPoint: 50, lastRestockedAt: daysAgo(1), costPerUnit: 55, updatedAt: new Date() },
  { id: "inv-3", ingredientId: "i-basmati-rice", ingredientName: "Basmati Rice", currentQuantity: 42, unit: "kg", reorderPoint: 25, lastRestockedAt: daysAgo(3), costPerUnit: 100, updatedAt: new Date() },
  { id: "inv-4", ingredientId: "i-toor-dal", ingredientName: "Toor Dal (Arhar)", currentQuantity: 45, unit: "kg", reorderPoint: 25, lastRestockedAt: daysAgo(4), costPerUnit: 130, updatedAt: new Date() },
  { id: "inv-5", ingredientId: "i-urad-dal", ingredientName: "Urad Dal (Black Gram)", currentQuantity: 28, unit: "kg", reorderPoint: 15, lastRestockedAt: daysAgo(4), costPerUnit: 120, updatedAt: new Date() },
  { id: "inv-6", ingredientId: "i-moong-dal", ingredientName: "Moong Dal", currentQuantity: 18, unit: "kg", reorderPoint: 10, lastRestockedAt: daysAgo(5), costPerUnit: 110, updatedAt: new Date() },
  { id: "inv-7", ingredientId: "i-chana-dal", ingredientName: "Chana Dal", currentQuantity: 22, unit: "kg", reorderPoint: 10, lastRestockedAt: daysAgo(5), costPerUnit: 90, updatedAt: new Date() },
  { id: "inv-8", ingredientId: "i-onion", ingredientName: "Onion (Vengayam)", currentQuantity: 120, unit: "kg", reorderPoint: 100, lastRestockedAt: daysAgo(0), costPerUnit: 35, updatedAt: new Date() },
  { id: "inv-9", ingredientId: "i-tomato", ingredientName: "Tomato (Thakkali)", currentQuantity: 35, unit: "kg", reorderPoint: 40, lastRestockedAt: daysAgo(0), costPerUnit: 30, updatedAt: new Date(), notes: "Below reorder point - order placed" },
  { id: "inv-10", ingredientId: "i-potato", ingredientName: "Potato (Urulaikizhangu)", currentQuantity: 85, unit: "kg", reorderPoint: 50, lastRestockedAt: daysAgo(2), costPerUnit: 30, updatedAt: new Date() },
  { id: "inv-11", ingredientId: "i-sunflower-oil", ingredientName: "Refined Sunflower Oil", currentQuantity: 45, unit: "liter", reorderPoint: 30, lastRestockedAt: daysAgo(3), costPerUnit: 140, updatedAt: new Date() },
  { id: "inv-12", ingredientId: "i-ghee", ingredientName: "Pure Cow Ghee", currentQuantity: 8, unit: "kg", reorderPoint: 10, lastRestockedAt: daysAgo(5), costPerUnit: 500, updatedAt: new Date(), notes: "Below reorder - ghee PO pending" },
  { id: "inv-13", ingredientId: "i-curd", ingredientName: "Curd / Yogurt (Thayir)", currentQuantity: 75, unit: "kg", reorderPoint: 50, lastRestockedAt: daysAgo(0), costPerUnit: 45, updatedAt: new Date() },
  { id: "inv-14", ingredientId: "i-milk", ingredientName: "Full Cream Milk", currentQuantity: 40, unit: "liter", reorderPoint: 20, lastRestockedAt: daysAgo(0), costPerUnit: 48, updatedAt: new Date() },
  { id: "inv-15", ingredientId: "i-chilli-powder", ingredientName: "Red Chilli Powder", currentQuantity: 12, unit: "kg", reorderPoint: 5, lastRestockedAt: daysAgo(7), costPerUnit: 240, updatedAt: new Date() },
  { id: "inv-16", ingredientId: "i-turmeric", ingredientName: "Turmeric Powder (Manjal)", currentQuantity: 8, unit: "kg", reorderPoint: 3, lastRestockedAt: daysAgo(7), costPerUnit: 160, updatedAt: new Date() },
  { id: "inv-17", ingredientId: "i-coriander-powder", ingredientName: "Coriander Powder (Malli)", currentQuantity: 10, unit: "kg", reorderPoint: 5, lastRestockedAt: daysAgo(7), costPerUnit: 140, updatedAt: new Date() },
  { id: "inv-18", ingredientId: "i-cumin", ingredientName: "Cumin Seeds (Jeeragam)", currentQuantity: 4, unit: "kg", reorderPoint: 3, lastRestockedAt: daysAgo(7), costPerUnit: 350, updatedAt: new Date() },
  { id: "inv-19", ingredientId: "i-mustard", ingredientName: "Mustard Seeds (Kadugu)", currentQuantity: 6, unit: "kg", reorderPoint: 3, lastRestockedAt: daysAgo(7), costPerUnit: 120, updatedAt: new Date() },
  { id: "inv-20", ingredientId: "i-sugar", ingredientName: "Sugar (Sakkarai)", currentQuantity: 95, unit: "kg", reorderPoint: 50, lastRestockedAt: daysAgo(5), costPerUnit: 42, updatedAt: new Date() },
  { id: "inv-21", ingredientId: "i-salt", ingredientName: "Iodized Salt", currentQuantity: 40, unit: "kg", reorderPoint: 15, lastRestockedAt: daysAgo(10), costPerUnit: 10, updatedAt: new Date() },
  { id: "inv-22", ingredientId: "i-tamarind", ingredientName: "Tamarind (Puli)", currentQuantity: 15, unit: "kg", reorderPoint: 10, lastRestockedAt: daysAgo(7), costPerUnit: 120, updatedAt: new Date() },
  { id: "inv-23", ingredientId: "i-coconut", ingredientName: "Coconut (Thengai)", currentQuantity: 150, unit: "each", reorderPoint: 100, lastRestockedAt: daysAgo(1), costPerUnit: 22, updatedAt: new Date() },
  { id: "inv-24", ingredientId: "i-chicken", ingredientName: "Chicken Curry Cut", currentQuantity: 0, unit: "kg", reorderPoint: 0, lastRestockedAt: daysAgo(3), costPerUnit: 190, updatedAt: new Date(), notes: "Ordered fresh daily as needed" },
  { id: "inv-25", ingredientId: "i-cashew", ingredientName: "Cashew Nuts (Mundiri)", currentQuantity: 5, unit: "kg", reorderPoint: 3, lastRestockedAt: daysAgo(5), costPerUnit: 800, updatedAt: new Date() },
  { id: "inv-26", ingredientId: "i-banana-leaf", ingredientName: "Banana Leaf", currentQuantity: 200, unit: "each", reorderPoint: 100, lastRestockedAt: daysAgo(1), costPerUnit: 3.5, updatedAt: new Date() },
  { id: "inv-27", ingredientId: "i-foil-container", ingredientName: "Aluminium Foil Container (750ml)", currentQuantity: 800, unit: "each", reorderPoint: 300, lastRestockedAt: daysAgo(7), costPerUnit: 6, updatedAt: new Date() },
];

// ==================== PURCHASE ORDERS ====================
// No usePurchaseOrders hook exists, but the page reads from "purchaseOrders" collection
// Using the page's expected structure
const purchaseOrders = [
  {
    id: "po-veg-apr14",
    vendorId: "v-koyambedu", vendorName: "Koyambedu Fresh Vegetables",
    weekStartDate: new Date(),
    status: "sent",
    eventIds: ["e-tidel-apr14", "e-psg-apr13", "e-amrita-apr13"],
    estimatedTotal: 28500, actualTotal: null,
    createdAt: daysAgo(2), updatedAt: new Date(),
    lines: [
      { id: "pol-1", ingredientId: "i-onion", ingredientName: "Onion (Vengayam)", quantityNeeded: 150, quantityNeededUnit: "kg", packSize: "50 kg bag", packsToOrder: 3, quantityOrdered: 150, expectedCostPerPack: 1750, expectedTotalCost: 5250 },
      { id: "pol-2", ingredientId: "i-tomato", ingredientName: "Tomato (Thakkali)", quantityNeeded: 80, quantityNeededUnit: "kg", packSize: "20 kg crate", packsToOrder: 4, quantityOrdered: 80, expectedCostPerPack: 600, expectedTotalCost: 2400 },
      { id: "pol-3", ingredientId: "i-drumstick", ingredientName: "Drumstick (Murungakkai)", quantityNeeded: 25, quantityNeededUnit: "kg", packSize: "10 kg bundle", packsToOrder: 3, quantityOrdered: 30, expectedCostPerPack: 400, expectedTotalCost: 1200 },
      { id: "pol-4", ingredientId: "i-beans", ingredientName: "French Beans (Avarakkai)", quantityNeeded: 60, quantityNeededUnit: "kg", packSize: "10 kg bag", packsToOrder: 6, quantityOrdered: 60, expectedCostPerPack: 500, expectedTotalCost: 3000 },
    ],
  },
  {
    id: "po-dairy-apr14",
    vendorId: "v-aavin", vendorName: "Aavin Dairy - Coimbatore Depot",
    weekStartDate: new Date(),
    status: "partially-received",
    eventIds: ["e-tidel-apr14", "e-psg-apr13", "e-wedding-murugan"],
    estimatedTotal: 18200, actualTotal: 9500,
    createdAt: daysAgo(3), updatedAt: new Date(),
    lines: [
      { id: "pol-1", ingredientId: "i-curd", ingredientName: "Curd / Yogurt (Thayir)", quantityNeeded: 120, quantityNeededUnit: "kg", packSize: "25 kg can", packsToOrder: 5, quantityOrdered: 125, expectedCostPerPack: 1125, expectedTotalCost: 5625, actualQuantityReceived: 125, actualCostPerPack: 1125, actualTotalCost: 5625, qualityFlag: "good" },
      { id: "pol-2", ingredientId: "i-milk", ingredientName: "Full Cream Milk", quantityNeeded: 60, quantityNeededUnit: "liter", packSize: "20 L can", packsToOrder: 3, quantityOrdered: 60, expectedCostPerPack: 960, expectedTotalCost: 2880, actualQuantityReceived: 60, actualCostPerPack: 960, actualTotalCost: 2880, qualityFlag: "good" },
      { id: "pol-3", ingredientId: "i-ghee", ingredientName: "Pure Cow Ghee", quantityNeeded: 12, quantityNeededUnit: "kg", packSize: "15 kg tin", packsToOrder: 1, quantityOrdered: 15, expectedCostPerPack: 7500, expectedTotalCost: 7500 },
    ],
  },
  {
    id: "po-rice-apr",
    vendorId: "v-ponni-rice", vendorName: "Sri Ponni Rice Mill - Thanjavur",
    weekStartDate: daysAgo(1),
    status: "fully-received",
    eventIds: ["e-psg-apr13", "e-tidel-apr14", "e-kpr-apr15", "e-wedding-murugan"],
    estimatedTotal: 32750, actualTotal: 33200,
    createdAt: daysAgo(5), updatedAt: daysAgo(1),
    lines: [
      { id: "pol-1", ingredientId: "i-ponni-rice", ingredientName: "Ponni Raw Rice", quantityNeeded: 500, quantityNeededUnit: "kg", packSize: "50 kg bag", packsToOrder: 10, quantityOrdered: 500, expectedCostPerPack: 2250, expectedTotalCost: 22500, actualQuantityReceived: 500, actualCostPerPack: 2300, actualTotalCost: 23000, qualityFlag: "good", receivingNotes: "Price up ₹50/bag this week" },
      { id: "pol-2", ingredientId: "i-basmati-rice", ingredientName: "Basmati Rice", quantityNeeded: 50, quantityNeededUnit: "kg", packSize: "25 kg bag", packsToOrder: 2, quantityOrdered: 50, expectedCostPerPack: 2500, expectedTotalCost: 5000, actualQuantityReceived: 50, actualCostPerPack: 2500, actualTotalCost: 5000, qualityFlag: "good" },
      { id: "pol-3", ingredientId: "i-sona-masoori", ingredientName: "Sona Masoori Rice", quantityNeeded: 75, quantityNeededUnit: "kg", packSize: "25 kg bag", packsToOrder: 3, quantityOrdered: 75, expectedCostPerPack: 1375, expectedTotalCost: 4125, actualQuantityReceived: 75, actualCostPerPack: 1400, actualTotalCost: 4200, qualityFlag: "good", receivingNotes: "Slight price increase" },
    ],
  },
];

// ==================== SEED FUNCTION ====================
async function seed() {
  console.log("🔐 Signing in...");
  const cred = await signInWithEmailAndPassword(auth, "rajesh@hfscatering.in", "HFSCoimbatore2024!");
  console.log("✅ Signed in as:", cred.user.email);

  // Clear existing data first
  console.log("\n🧹 Clearing existing data...");
  for (const col of ["vendors", "ingredients", "clients", "recipes", "events", "purchaseOrders", "wasteLog", "inventory"]) {
    await clearCollection(col);
    console.log(`  ✓ Cleared ${col}`);
  }

  // Vendors
  console.log("\n📦 Seeding vendors...");
  for (const v of vendors) {
    const { id, ...data } = v;
    await setDoc(doc(db, "vendors", id), { ...data, createdAt: daysAgo(180 + Math.floor(Math.random()*200)), updatedAt: new Date() });
    console.log(`  ✓ ${data.name}`);
  }

  // Ingredients
  console.log("\n🥬 Seeding ingredients...");
  for (const ing of ingredients) {
    const { id, ...data } = ing;
    await setDoc(doc(db, "ingredients", id), { ...data, createdAt: daysAgo(200), updatedAt: new Date() });
    console.log(`  ✓ ${data.name}`);
  }

  // Clients
  console.log("\n👥 Seeding clients...");
  for (const c of clients) {
    const { id, ...data } = c;
    await setDoc(doc(db, "clients", id), { ...data, createdAt: daysAgo(180 + Math.floor(Math.random()*300)), updatedAt: new Date() });
    console.log(`  ✓ ${data.name} (${data.company})`);
  }

  // Recipes with lines subcollection
  console.log("\n📖 Seeding recipes...");
  for (const r of recipes) {
    const { id, lines, ...data } = r;
    await setDoc(doc(db, "recipes", id), { ...data, createdAt: daysAgo(200), updatedAt: new Date() });
    if (lines) {
      for (const line of lines) {
        await setDoc(doc(db, "recipes", id, "lines", line.id), line);
      }
    }
    console.log(`  ✓ ${data.name} (${lines?.length || 0} ingredients, ₹${data.costPerServing}/serving)`);
  }

  // Events with menuItems subcollection
  console.log("\n🎪 Seeding events...");
  for (const e of events) {
    const { id, menuItems, ...data } = e;
    await setDoc(doc(db, "events", id), { ...data, createdAt: daysAgo(Math.floor(Math.random()*30)+5), updatedAt: new Date() });
    if (menuItems) {
      for (const mi of menuItems) {
        await setDoc(doc(db, "events", id, "menuItems", mi.id), mi);
      }
    }
    console.log(`  ✓ ${data.eventType} - ${data.clientName} (${data.guestCount} guests, ₹${data.totalPrice.toLocaleString()})`);
  }

  // Purchase Orders with lines
  console.log("\n🛒 Seeding purchase orders...");
  for (const po of purchaseOrders) {
    const { id, lines, ...data } = po;
    await setDoc(doc(db, "purchaseOrders", id), data);
    if (lines) {
      for (const line of lines) {
        await setDoc(doc(db, "purchaseOrders", id, "lines", line.id), line);
      }
    }
    console.log(`  ✓ PO: ${data.vendorName} (₹${data.estimatedTotal.toLocaleString()})`);
  }

  // Waste Entries
  console.log("\n🗑️ Seeding waste entries...");
  for (const w of wasteEntries) {
    const { id, ...data } = w;
    await setDoc(doc(db, "wasteLog", id), data);
    console.log(`  ✓ ${data.ingredientName}: ${data.quantity} ${data.unit} (₹${data.totalCost}) - ${data.reason}`);
  }

  // Inventory
  console.log("\n📊 Seeding inventory...");
  for (const inv of inventoryRecords) {
    const { id, ...data } = inv;
    await setDoc(doc(db, "inventory", id), data);
    console.log(`  ✓ ${data.ingredientName}: ${data.currentQuantity} ${data.unit}`);
  }

  console.log("\n🎉 Seed complete! Realistic Coimbatore catering data loaded.");
  console.log(`\n📊 Summary:`);
  console.log(`   ${vendors.length} vendors (Koyambedu, Aavin, Pollachi, Erode, etc.)`);
  console.log(`   ${ingredients.length} ingredients (rice, dal, spices, vegetables, meat, packaging)`);
  console.log(`   ${clients.length} clients (IT parks, colleges, weddings, hospitals, factories)`);
  console.log(`   ${recipes.length} recipes (sambar, biryani, poriyal, kesari, etc.)`);
  console.log(`   ${events.length} events spanning this week`);
  console.log(`   ${purchaseOrders.length} purchase orders`);
  console.log(`   ${wasteEntries.length} waste entries`);
  console.log(`   ${inventoryRecords.length} inventory records`);
  console.log(`\n💰 This week's revenue: ₹${events.reduce((s,e)=>s+e.totalPrice, 0).toLocaleString()}`);
  console.log(`🍽️ Total guests this week: ${events.reduce((s,e)=>s+e.guestCount, 0).toLocaleString()}`);

  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
