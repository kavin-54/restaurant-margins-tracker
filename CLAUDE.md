# HFS Catering Platform

## Project Overview
Internal catering operations platform for a Coimbatore, India-based catering company doing ~5,000 meals/day. Manages the full lifecycle from ingredient purchasing through event reconciliation. Tracks costs, margins, waste, and generates client proposals. All currency is in Indian Rupees (₹).

### Detailed Documentation
- [PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md) — Detailed business requirements and entity models.
- [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) — Deep dive into technical design and Firestore schema.
- [GEMINI.md](./GEMINI.md) — Project status and recent architectural audit results.

## Tech Stack
- **Framework:** Next.js 15 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui + Material Design 3 (Google Stitch design system)
- **Icons:** Material Symbols Outlined (not Lucide)
- **Database:** Cloud Firestore (real-time listeners with `experimentalAutoDetectLongPolling`)
- **Auth:** Firebase Authentication (email/password)
- **Storage:** Firebase Storage
- **Hosting:** Vercel (auto-deploys from `main` branch)
- **State:** React Context + Firestore `onSnapshot`
- **Forms:** React Hook Form + Zod
- **Charts:** CSS-only (conic-gradient pie charts, div-based bar charts)
- **Currency:** INR (₹) — formatted via `formatCurrency()` in `src/lib/utils.ts` using `en-IN` locale
- **Excel parsing:** `xlsx` (SheetJS) — used by the recipe importer at `/recipes/import`

## Project Structure
```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── login/page.tsx      # Login/signup page
│   │   └── (app)/              # Auth-protected route group
│   │       ├── layout.tsx      # App shell (sidebar + header + FloatingActionButton)
│   │       ├── page.tsx        # Operations Dashboard (food cost %, margins, alerts)
│   │       ├── events/         # Event CRUD + calendar view + menu builder
│   │       │   ├── page.tsx    # Calendar/timeline view with capacity indicators
│   │       │   ├── [id]/       # Event detail + menu builder + allergen cross-ref
│   │       │   ├── new/        # Create event
│   │       │   └── prep/       # Prep sheets (station-grouped, printable)
│   │       ├── recipes/        # Recipe catalog + ingredient costing lines
│   │       │   ├── page.tsx    # List view with "Import from Excel" + "New Recipe" buttons
│   │       │   ├── new/        # Manual recipe creation
│   │       │   ├── import/     # Excel (.xlsx) upload → parse → preview → create recipe
│   │       │   └── [id]/       # Detail + editable ingredient lines with per-line unit selector
│   │       ├── ingredients/    # Ingredient CRUD + favorites + price trends
│   │       │   ├── page.tsx    # List + "Import Ingredients" + "Add Ingredient" buttons
│   │       │   ├── new/        # Quick Add form (dropdown unit picker)
│   │       │   ├── import/     # Excel bulk importer (Store List / Consumption Report / generic headered)
│   │       │   └── [id]/       # Detail with price history + vendor comparison + edit form (dropdown unit picker)
│   │       ├── menu-planner/   # Budget-constrained menu generator (veg/non-veg + category counts)
│   │       ├── clients/        # Client CRUD + revenue analytics + segments
│   │       ├── vendors/        # Vendor CRUD + order history + price comparison
│   │       ├── purchasing/     # Purchase orders + smart PO aggregation
│   │       ├── inventory/      # Quick count mode + bulk save
│   │       ├── waste/          # Waste logging + kiosk mode (tablet 3-step flow)
│   │       ├── reports/        # Full analytics (margins, costs, waste, vendor spend)
│   │       └── settings/       # System configuration
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── layout/             # Sidebar, Header, PageHeader, EmptyState, LoadingScreen, FloatingActionButton
│   │   └── ProductionDashboard.tsx  # Production overview component
│   ├── contexts/
│   │   └── AuthContext.tsx      # Auth state + role management (non-blocking pattern)
│   └── lib/
│       ├── firebase/
│       │   ├── config.ts       # Firebase init with `experimentalAutoDetectLongPolling`
│       │   ├── auth.ts         # Sign in/up/out helpers
│       │   └── firestore.ts    # CRUD helpers (addDocument, updateDocument, etc.)
│       ├── hooks/
│       │   ├── useFirestore.ts # Base hooks: useCollection<T>, useDocument<T> (auto-converts Firestore Timestamps to JS Dates)
│       │   ├── useEvents.ts    # Event hook + EventMenuItem subcollection
│       │   ├── useRecipes.ts   # Recipe hook + RecipeLine subcollection
│       │   ├── useIngredients.ts
│       │   ├── useClients.ts
│       │   ├── useVendors.ts
│       │   ├── useWaste.ts
│       │   ├── useInventory.ts
│       │   └── useSystemConfig.ts
│       ├── types/              # TypeScript types (NOTE: hooks define their own simpler interfaces)
│       ├── constants/          # Allergens, categories, units, defaults
│       ├── menuPlanner.ts      # Pure generator: veg inference + branch-and-bound menu enumeration
│       └── utils.ts            # formatCurrency (INR), formatPercent, cn()
├── scripts/
│   ├── seed-coimbatore-data.mjs           # Legacy: fictional South Indian demo data
│   ├── clear-data.mjs                     # Wipe all demo collections (preserves users, systemConfig)
│   ├── clear-ingredients.mjs              # Wipe only the `ingredients` collection
│   ├── seed-hfs-ingredients.mjs           # Seed 199 real HFS ingredients from consumption report
│   ├── seed-store-list-ingredients.mjs    # Seed unique food ingredients from "Store list.xls" (dedupe by item code)
│   ├── fix-pack-units.mjs                 # Convert PKT/BOT ingredients to real weight/volume units
│   ├── audit-unit-mismatches.mjs          # Read-only: flag recipe lines whose unit is unknown or cross-type
│   ├── fix-curd-line.mjs                  # One-off: normalize a known cross-type curd line (historical)
│   └── fix-grm-unit-lines.mjs             # One-off: rename recipe-line unit "grm" → "g" (historical)
├── firestore.rules             # Firestore security rules (authenticated users)
├── firebase.json               # Firebase project config
├── .firebaserc                 # Firebase project alias
└── .env.local                  # Firebase credentials (NOT committed)
```

## Firebase Project
- **Project ID:** `resteraunt-margins-tracker`
- **Auth:** Email/Password enabled
- **Firestore:** Rules allow read/write for authenticated users
- **Web App:** HFS Margins
- **Firestore Config:** Uses `initializeFirestore()` with `experimentalAutoDetectLongPolling: true` for Vercel compatibility

## Demo Account
- **Email:** `rajesh@hfscatering.in`
- **Password:** `HFSCoimbatore2024!`
- **Role:** Admin
- **Persona:** Rajesh Kumar, owner of HFS Catering in Coimbatore, Tamil Nadu

## Current Firestore Data
**As of the latest re-seed, the database contains only ingredients** — vendors, clients, recipes, events, purchase orders, waste, and inventory were all cleared to give both logins a blank operational slate. The most recent seed came from `scripts/seed-store-list-ingredients.mjs` — it reads `~/Downloads/Store list.xls`, filters to food categories (Dairy / Frozen Foods / Grocery / Kitchen F&B / Meat & Fish — skipping Cleaning / Laundry / Office / Packaging / Gas / Guest Supply), dedupes by HFS item code keeping the most recent non-zero rate, and writes ~146 ingredients with doc IDs `hfs-<code>`. Categories are inferred from the XLS category plus keyword heuristics (e.g., `rice|atta|flour` → `grain-starch`, `banana|apple|mango` → `produce`, `cucumber|cabbage|onion` → `vegetable`, `ghee|oil` → `oil-fat`).

Historical alternative: `scripts/seed-hfs-ingredients.mjs` produces a hand-curated 199-item list from the 01/04/2026–18/04/2026 Consumption Report with `scripts/fix-pack-units.mjs` normalizing packet/bottle items to `kg`/`liter` with per-unit pricing.

## Legacy Demo Data (not currently seeded)
The following describes what `scripts/seed-coimbatore-data.mjs` produces if you run it. It is NOT in Firestore unless you explicitly re-seed.

### Vendors (10)
Koyambedu Fresh Vegetables, Sri Ponni Rice Mill (Thanjavur), Aavin Dairy, Pollachi Masala Traders, Kovai Oil & Ghee, Erode Provision Stores, Nilgiris Fresh Meat & Poultry, Coimbatore Packaging, Palakkad Coconut Traders, Coimbatore Flower Market

### Ingredients (65)
Grains (Ponni/Sona Masoori/Basmati rice, rava, atta), Dals (toor, urad, moong, chana), Vegetables (18 items with Tamil names), Dairy (Aavin curd/milk/ghee/paneer), Oils (sunflower, gingelly, coconut), Spices (10 types), Proteins (chicken ₹190/kg, mutton ₹750/kg, seer fish ₹800/kg), Packaging

### Clients (8)
- Tidel Park IT Companies — 1,200 meals/day corporate cafeteria
- PSG College of Technology — 2,500 meals/day hostel mess
- Kovai Wedding Planners — premium weddings, 800-3000 guests
- Roots Industries — 800 meals/day factory canteen
- District Collector Office — government VIP events
- Amrita Hospital — 600 meals/day patient + staff
- Isha Foundation — sattvic ashram meals, retreats
- KPR Mill — 1,500 meals/day textile factory

### Recipes (12)
Sambar, Rasam, Veg Biryani, Chicken Biryani (Dindigul), Plain Rice, Curd Rice, Beans Poriyal, Coconut Chutney, Rava Kesari, Medu Vada, Semiya Payasam, Chettinad Mutton Curry — all with full ingredient lines and costing

### Events (11 for current week)
Mix of daily meals (PSG, Tidel, Amrita), factory shifts (KPR, Roots), weddings (2,500 guests), retreats (Isha 1,500), VIP government events. Statuses: confirmed, proposal, completed.

### Also seeded: 3 purchase orders, 12 waste entries, 27 inventory records

### Re-seeding Data
```bash
# Wipe all demo collections (preserves users & systemConfig)
node scripts/clear-data.mjs

# Wipe only the ingredients collection
node scripts/clear-ingredients.mjs

# Current default: bulk-load deduped food ingredients from ~/Downloads/Store list.xls
node scripts/seed-store-list-ingredients.mjs

# Historical alternative: hand-curated 199-item seed + packet-unit normalization
node scripts/seed-hfs-ingredients.mjs
node scripts/fix-pack-units.mjs

# (Legacy) Re-seed fictional Coimbatore demo across all collections
node scripts/seed-coimbatore-data.mjs
```
All scripts sign in as `rajesh@hfscatering.in` using the password in the script itself; Firestore rules require an authenticated user.

## Key Architecture Decisions

### Firestore Timestamp Handling
`useFirestore.ts` has a `convertTimestamps()` helper that recursively converts all Firestore `Timestamp` objects to JS `Date` objects when reading documents. It is optimized for deep objects and arrays. This is critical — without it, date methods like `.getFullYear()` fail at runtime.

### Next.js 15 Performance & Server Components
- **Server Component Layout:** `AppLayout` is a Server Component, rendering Client Components (`MainLayout`, `AuthProvider`) as children to reduce JS payload and improve LCP.
- **Loading & Error Handling:** Standardized `loading.tsx` (skeleton/spinner) and `error.tsx` (error boundary) are used in the `(app)` group for better UX and robustness.

### Firestore Hook Optimization
- **Stable Keys:** `useFirestore.ts` uses stable `constraintKey` generation logic to prevent infinite re-subscription loops when passing query constraints.
- **Error Handling:** Enhanced error reporting for Firestore subscription failures.

### Dashboard Performance
- **Query Limits:** `limit()` constraints are added to dashboard data fetches (events, recipes, inventory, waste) to prevent memory issues.
- **Memoized Constraints:** Hook constraints are memoized in components to ensure stability and prevent unnecessary Firestore reads.

### Calculation Logic Reconciliation
- **Consistent Model:** `recipeCost.ts` is fully compatible with the hook-based data model (`RecipeLine` with `ingredientId`).
- **Sub-recipe Support:** Preserved hierarchical cost rollups even while using the simplified data model used by the UI pages.

### Non-blocking Auth Pattern
`AuthContext.tsx` sets user state IMMEDIATELY from Firebase Auth data, then fetches the Firestore user document in the background with `.then()`. This prevents the 1-3s loading delay that blocking auth patterns cause.

### Hook-defined Types vs src/lib/types/
The hooks in `src/lib/hooks/` define their OWN simpler interfaces (e.g., `Event` in `useEvents.ts` has `eventDate`, `guestCount`, `totalCost`). The more complex types in `src/lib/types/` were an earlier design that is NOT what the pages use. Always match the hook interfaces when seeding data or adding features.

### Key Hook Interface Fields
- **Event:** `clientId, clientName, eventDate, eventType, guestCount, status (inquiry|proposal|confirmed|completed|cancelled), totalCost, totalPrice, marginPercentage`
- **Recipe:** `name, servings, servingUnit? ("people" | "liter"), costPerServing, totalRecipeCost, category` + `lines` subcollection. `servingUnit` is optional; missing/empty is treated as `"people"` so existing recipes render unchanged. (`description?` still exists on the TypeScript type for back-compat with legacy docs but is no longer set or displayed by any UI — the field was removed from `/recipes/new`, `/recipes/[id]` edit, and `/recipes/import` forms.)
- **Ingredient:** `name, unit, costPerUnit, supplier, category`
- **Client:** `name, email, phone, company, address, city, state, notes`
- **Vendor:** `name, email, phone, address, city, state, contactPerson, specialties[], leadTime, minimumOrder, notes`
- **WasteEntry:** `ingredientId, ingredientName, quantity, unit, costPerUnit, totalCost, reason (spoilage|accident|prep-loss|other), date`
- **InventoryItem:** `ingredientId, ingredientName, currentQuantity, unit, reorderPoint, lastRestockedAt, costPerUnit`

### Recipe Yield Unit — People vs Liters (`servingUnit`)
Recipes can be measured by head count OR by liquid yield. The field is optional on the Recipe type; `undefined` renders as "people" everywhere for back-compat.

- **Where it's exposed:** `/recipes/new` (Quick Add form), `/recipes/[id]` (edit form), `/recipes/import` (per-file card). Each has a two-option dropdown next to the Servings input.
- **Auto-detection on import:** `parseServingUnitFromTitle()` in `src/app/(app)/recipes/import/page.tsx` flips the unit to `liter` when the title contains `N L` / `liter(s)` / `litre(s)` (e.g., `Ghee 5L` → `servings=5, servingUnit=liter`).
- **Display adaptation:** the cost-summary card, recipe-list card, and importer header all swap labels from "Servings" / "Cost per Serving" to "Yield" / "Cost per Liter" (and show `5 L` instead of `5`) when `servingUnit === "liter"`. Math is identical (totalCost / servings).
- **Typeable servings input:** on `/recipes/import` the Servings field stores a number but the `<Input>` shows empty when 0, so select-all + type "500" works in one keystroke. Validation rejects `<= 0` only at import time.

### Ingredient Excel Importer (`/ingredients/import`)
Bulk-upload ingredients from an XLSX/XLS. Entry is the "Import Ingredients" button next to "Add Ingredient" on `/ingredients`. Mirrors the recipe importer's drop zone + per-file card + preview-then-commit flow, but one row = one ingredient and the preview is a flat editable table.

- **Layout auto-detection (three branches in `parseWorkbook()`):**
  1. **HFS Store List** (`looksLikeStoreList()`) — headerless; detects transaction-id + DD/MM/YYYY date in col 0, item code in col 1. Parses `code=col1, name=col3, category=col4, unit=col6, rate=col9`.
  2. **HFS Consumption Report** (`looksLikeConsumptionReport()`) — headerless; detects a unit keyword in col 2 plus numeric qty/cost in cols 3-4. Parses `name=col0, unit=col2, cost=col4` (no category or code in this format — inferred).
  3. **Generic headered** — scans the first 20 rows for one containing `Ingredient|Item Name|Name|Product`, then `detectColumns()` maps whatever headers exist (name/category/unit/cost/supplier/code, any order).
- **Unit normalization:** `UNIT_ALIASES` handles `nos/pcs/gm/lit/pkt/bot/bun/…` → canonical units. `UNIT_TOKEN` gates the Consumption Report detector and filters rows whose unit column isn't recognized.
- **Category inference:** `guessCategory(xlsCat, rawName)` first matches the XLS category string (e.g., `DAIRY PRODUCTS` → `dairy`, `MEAT AND FISH` → `protein`), then falls back to name keyword heuristics covering spices, grains, pulses, condiments, oils, fruits (`produce`), and vegetables (`vegetable`). Fruit/vegetable heuristics are specifically tuned to the HFS catalog (banana, pappaya, chow chow, ladies finger, etc.).
- **Non-food filter:** `FOOD_ONLY_SKIP` drops Store List categories like CATERING SUPPLIES / CLEANING / LAUNDRY / OFFICE / GUEST SUPPLY / HLP-GAS / COST CENTRE rows during Store List parse.
- **Dedupe within file:** keyed by `code || name.toLowerCase()`, keeping the highest non-zero rate.
- **Existing-ingredient detection:** case-insensitive name match against the live `ingredients` collection. Duplicates get a per-row dropdown (default `Skip`, alternative `Update existing`) plus "Skip all / Update all" bulk buttons in the file header. Honors the earlier "only upload each ingredient one time" preference.
- **Per-row editing:** Name, Category, Unit, Cost, Supplier are all editable in the preview before commit. Rows with any missing required field are caught pre-import and block the commit with a toast.

### Recipe Excel Importer (`/recipes/import`)
Employees upload an `.xlsx` file and the page parses it client-side with `xlsx` (SheetJS), then shows a preview before writing to Firestore.

- **Expected file shape:** first non-empty row is the recipe title (e.g., `Rasam Recipe (10 Pax)` → name `Rasam`, servings `10`). Then a header row containing `Ingredient | Quantity | Unit`, followed by one ingredient per row.
- **Quantity parsing:** accepts numbers or ranges (`25-30` or `25–30` → midpoint `27.5`).
- **Unit aliasing:** `UNIT_ALIASES` in `src/app/(app)/recipes/import/page.tsx` normalizes `nos/pcs/gm/lit/…` to canonical units from `src/lib/constants/units.ts`.
- **Ingredient matching:** case-insensitive exact → substring fallback against the live `ingredients` collection. Unmatched rows are highlighted amber and the user picks a replacement (or skips) from a dropdown in the preview.
- **Cost math:** uses `convertCostPerUnit()` so a kg-stored ingredient used with grams on a line still prices correctly. Unmatched rows are skipped during import; total & per-serving costs come from the matched lines.
- **Duplicates:** recipe name collisions are allowed (appends a new doc). There is no per-user scoping, so any employee's import is visible to every logged-in user.

### Per-line Universal Unit Selector (`/recipes/[id]`)
The Add/Edit Ingredient Line flow on the recipe detail page exposes a Unit dropdown next to Quantity.

- **Filtering:** `unitsForIngredient()` filters the dropdown to units of the same measurement type as the ingredient's stored unit (weight ↔ weight, volume ↔ volume, count ↔ count). A `kg`-stored ingredient only offers weight units (oz, lb, g, kg) — not volume or count. If you want cross-type picks, remove the filter in that helper.
- **Conversion:** `convertCostPerUnit(baseUnit, baseCost, targetUnit)` multiplies by `target.toBase / base.toBase` and returns `number | null`. It returns `null` when either unit is unrecognized (typos like `grm`) or when they belong to different measurement families — callers MUST treat `null` as an error rather than silently falling back, which is what used to cause 1000× line-cost bugs. `handleAddLine`/`handleUpdateLine` reject the write with a toast; the inline editor reddens the Unit Select and shows "Unit mismatch" in place of the Line Cost; the importer blocks `handleImportAll` on any mismatched line.
- **Read-only row warnings:** each rendered ingredient line cross-checks `line.unit` against the ingredient's stored unit via `isLineUnitConsistent`. When inconsistent, the ingredient name gets a red `warning` icon and the Unit + Line Cost columns render in red — this surfaces legacy bad data instead of letting it look fine.
- **Storage:** recipe lines save a snapshot of `unit`, `costPerUnit` (converted), `quantity`, and `lineCost`. Editing the ingredient's base price later does NOT retroactively update existing lines.
- **Sticky Actions column:** the rightmost Actions cell in the ingredient-lines table is `position: sticky; right: 0` with a subtle left shadow. The edit-mode row widens enough to push buttons off-screen on narrow viewports, so the save/cancel/edit/delete controls pin to the right edge and stay visible regardless of horizontal scroll.

### Menu Planner (`/menu-planner`, `src/lib/menuPlanner.ts`)
Budget-constrained menu generator. The page lets users pick Vegetarian vs Non-Vegetarian (required, top of form), set a Max ₹/person, optionally enter a guest count, and adjust per-category dish counts (Appetizer · Soup · Main · Side · Bread · Sauce · Dessert · Beverage). Generated results surface as three archetype cards — Budget Pick / Best Value / Premium — with an expandable "Show all N" list.

- **Dietary inference (no per-recipe flag):** a recipe is classified non-veg iff any line references an ingredient with `category === "protein"`. This works reliably with the current HFS ingredient catalog where proteins (chicken, mutton, fish, eggs, etc.) are all tagged `protein` and dairy is its own category. Adding a separate `dietaryType` field was rejected in favor of inference to avoid a data-migration step and the risk of un-tagged recipes.
- **Algorithm:** `generateMenus()` in `src/lib/menuPlanner.ts` is a pure function that buckets matching recipes by category, then enumerates combinations via branch-and-bound using a cheapest-remainder lower bound to prune any branch whose projected total exceeds the budget. Result cap defaults to 2000 internally; the UI picks three archetypes plus an optional full list capped at 50.
- **Availability counts:** each category stepper shows live `N available` after applying the veg filter, and the + button disables when the count would exceed availability — users can't request 3 desserts when only 2 exist.
- **No Firestore writes:** the planner is read-only. Saving a chosen menu as an event is intentionally deferred — the path there is to add a "Use this menu" button that routes to `/events/new` with the menu pre-encoded, so all mutation stays in the existing event-creation flow.

### Global Search (`src/components/layout/Header.tsx`)
The header search input filters across `events`, `recipes`, `clients`, `ingredients`, and `vendors` on every keystroke (client-side — the collections are already in memory from the relevant hooks). Results are grouped and each entry links to the item's detail page. Escape or outside-click dismisses the dropdown.

### No Per-User Data Scoping
The app's Firestore collections (vendors, ingredients, clients, recipes, events, purchaseOrders, wasteLog, inventory, inventoryAdjustments) are **shared across all authenticated users**. `firestore.rules` allows any signed-in user to read/write any document, and no hook filters by `auth.currentUser.uid`. Implications:

- Any employee's recipe/ingredient/event edits are immediately visible to every other login.
- You cannot "blank-slate" one account while preserving another's data — a clear wipes it for everyone.
- If multi-tenant behavior is needed later, every hook and every write must add an `ownerId`/`orgId` filter, and `firestore.rules` must enforce it.

### Design System
Material Design 3 / Google Stitch tokens applied globally:
- Material Symbols Outlined font (not Lucide icons)
- `PageHeader` and `EmptyState` use `icon: string` (Material icon name), not React nodes
- Glass-panel effects, ambient shadows, gradient buttons
- Sidebar with slate-50 bg, blue-50 active state, user avatar initials

## Deployment
- **Production URL:** https://catering-platform-sigma.vercel.app
- **GitHub Repo:** https://github.com/kavin-54/restaurant-margins-tracker
- Push to `main` → auto-deploys to Vercel
- Check deploy status: `gh api repos/kavin-54/restaurant-margins-tracker/deployments --jq '.[0]'`

## Commands
- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build (run before pushing to catch errors; delete `.next/` first if you hit stale trace errors)
- `npm run lint` — ESLint check
- `node scripts/clear-data.mjs` — wipe demo collections (keeps users + systemConfig)
- `node scripts/clear-ingredients.mjs` — wipe only the ingredients collection
- `node scripts/seed-store-list-ingredients.mjs` — bulk-seed from ~/Downloads/Store list.xls (current default)
- `node scripts/seed-hfs-ingredients.mjs` — hand-curated 199-item seed
- `node scripts/fix-pack-units.mjs` — normalize PKT/BOT items to kg/liter
- `node scripts/audit-unit-mismatches.mjs` — read-only: list recipe lines with unknown or cross-type units
- `node scripts/seed-coimbatore-data.mjs` — legacy fictional demo (clears + re-seeds everything)
- `firebase deploy --only firestore:rules` — deploy Firestore security rules

## Git Conventions
- Use semantic versioning for commits (semver)
- Format: `type(scope): description` (e.g., `feat(events): add menu builder`)
- Types: feat, fix, docs, style, refactor, test, chore
- Always run `npm run build` before committing to catch TypeScript errors
- Co-author line: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

## Known Issues / Gotchas
- Firestore on Vercel requires `experimentalAutoDetectLongPolling` — without it, WebSocket connections fail ("client is offline")
- Auth timeout is 1s, Firestore timeout is 2s — prevents indefinite loading screens
- Hot reload can cause webpack "Cannot find module './82.js'" — fix by clearing `.next` and restarting dev server
- `initializeFirestore` can only be called once — wrapped in try/catch to handle hot reload re-initialization
- No `usePurchaseOrders` hook exists — purchasing page reads directly from `purchaseOrders` collection
- `npm run build` sometimes emits stale trace/MODULE_NOT_FOUND errors from `.next/` after large file changes; `rm -rf .next && npm run build` clears it. Vercel builds are always fresh so this is a local-only annoyance.
- Recipe lines store a snapshot of the ingredient's price at creation time. Re-seeding or editing an ingredient's `costPerUnit` does NOT update existing recipe/event costs until you delete & re-add the line.
- The Excel importer expects ONE recipe per file (first sheet). Multi-sheet workbooks will silently ignore sheets 2+.
- **Cross-type / unknown-unit lines (legacy data hazard):** earlier, `convertCostPerUnit()` silently returned the base cost unchanged when the line's unit was unrecognized (typos like `grm`) or in a different measurement family than the ingredient's stored unit — producing line costs off by ~1000x. Since commit `507b481` the function returns `null` in those cases, all writers (add/edit/import) refuse to save such lines, and the recipe-detail table shows a red warning icon + red Unit/Line-Cost columns for legacy rows that were already written. Use `node scripts/audit-unit-mismatches.mjs` to list anything still broken. Weight-only fixes (e.g., `grm` → `g`) can be auto-migrated; cross-type cases (`each` vs `kg` for bananas/chillies, `g` vs `liter` for curd) need human judgment — usually either repricing the ingredient per-piece or rewriting the line in the ingredient's unit family.
