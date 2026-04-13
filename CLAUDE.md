# HFS Catering Platform

## Project Overview
Internal catering operations platform for a Coimbatore, India-based catering company doing ~5,000 meals/day. Manages the full lifecycle from ingredient purchasing through event reconciliation. Tracks costs, margins, waste, and generates client proposals. All currency is in Indian Rupees (₹).

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
│   │       ├── ingredients/    # Ingredient CRUD + favorites + price trends
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
│       └── utils.ts            # formatCurrency (INR), formatPercent, cn()
├── scripts/
│   └── seed-coimbatore-data.mjs  # Seed script for realistic demo data
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

## Demo Data (Coimbatore Catering, ~5,000 meals/day)
The database is populated with realistic data for a South Indian catering operation:

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
node scripts/seed-coimbatore-data.mjs
```
This clears all existing data and re-populates. Requires the demo account to exist.

## Key Architecture Decisions

### Firestore Timestamp Handling
`useFirestore.ts` has a `convertTimestamps()` helper that recursively converts all Firestore `Timestamp` objects to JS `Date` objects when reading documents. This is critical — without it, date methods like `.getFullYear()` fail at runtime.

### Non-blocking Auth Pattern
`AuthContext.tsx` sets user state IMMEDIATELY from Firebase Auth data, then fetches the Firestore user document in the background with `.then()`. This prevents the 1-3s loading delay that blocking auth patterns cause.

### Hook-defined Types vs src/lib/types/
The hooks in `src/lib/hooks/` define their OWN simpler interfaces (e.g., `Event` in `useEvents.ts` has `eventDate`, `guestCount`, `totalCost`). The more complex types in `src/lib/types/` were an earlier design that is NOT what the pages use. Always match the hook interfaces when seeding data or adding features.

### Key Hook Interface Fields
- **Event:** `clientId, clientName, eventDate, eventType, guestCount, status (inquiry|proposal|confirmed|completed|cancelled), totalCost, totalPrice, marginPercentage`
- **Recipe:** `name, servings, costPerServing, totalRecipeCost, category, description` + `lines` subcollection
- **Ingredient:** `name, unit, costPerUnit, supplier, category`
- **Client:** `name, email, phone, company, address, city, state, notes`
- **Vendor:** `name, email, phone, address, city, state, contactPerson, specialties[], leadTime, minimumOrder, notes`
- **WasteEntry:** `ingredientId, ingredientName, quantity, unit, costPerUnit, totalCost, reason (spoilage|accident|prep-loss|other), date`
- **InventoryItem:** `ingredientId, ingredientName, currentQuantity, unit, reorderPoint, lastRestockedAt, costPerUnit`

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
- `npm run build` — production build (run before pushing to catch errors)
- `npm run lint` — ESLint check
- `node scripts/seed-coimbatore-data.mjs` — re-seed demo data
- `firebase deploy --only firestore:rules` — deploy Firestore security rules

## Git Conventions
- Use semantic versioning for commits (semver)
- Format: `type(scope): description` (e.g., `feat(events): add menu builder`)
- Types: feat, fix, docs, style, refactor, test, chore
- Always run `npm run build` before committing to catch TypeScript errors
- Co-author line: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

## Known Issues / Gotchas
- Firestore on Vercel requires `experimentalAutoDetectLongPolling` — without it, WebSocket connections fail ("client is offline")
- Auth timeout is 1s, Firestore timeout is 2s — prevents indefinite loading screens
- Hot reload can cause webpack "Cannot find module './82.js'" — fix by clearing `.next` and restarting dev server
- `initializeFirestore` can only be called once — wrapped in try/catch to handle hot reload re-initialization
- No `usePurchaseOrders` hook exists — purchasing page reads directly from `purchaseOrders` collection
