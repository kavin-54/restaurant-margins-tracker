# Catering Operations Platform — Technical Architecture

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 15 (App Router) | Server components for fast page loads, API routes for backend logic, excellent Vercel integration |
| Language | TypeScript | Type safety across the entire codebase — critical for complex cost calculations that can't silently fail |
| UI | Tailwind CSS + shadcn/ui | Modern, polished component library. Accessible, responsive, customizable without fighting a design system |
| Database | Cloud Firestore | NoSQL with real-time listeners (live cost updates), offline persistence (kitchen wifi), hierarchical data (recipes with sub-recipes), generous free tier |
| Auth | Firebase Authentication | Email/password for staff accounts, custom claims for role-based access (admin/kitchen manager/prep cook) |
| Storage | Firebase Storage | Recipe photos, portioning spec images, exported proposal PDFs |
| PDF Generation | @react-pdf/renderer | Server-side proposal PDF generation from event data |
| Hosting | Vercel | Zero-config Next.js deployment, preview deployments per branch, edge functions, custom domains |
| State Management | React Context + Firestore real-time listeners | No Redux needed — Firestore's onSnapshot handles real-time state, Context handles auth/role state |
| Forms | React Hook Form + Zod | Fast, validated forms — critical for the data-entry-heavy nature of this app |
| Charts/Analytics | Recharts | Lightweight, React-native charting for dashboards and reporting |

---

## Firestore Data Model

Firestore is a document/collection NoSQL database. The data model is designed around how the app reads data, not how a relational DB would normalize it.

### Collections

```
/ingredients/{ingredientId}
  - name: string
  - category: string (enum)
  - primaryUnit: string
  - trimYield: number (0-100, percentage)
  - cookingYield: number (0-100, percentage)
  - shelfLife: string (enum: "same-day" | "2-3-days" | "1-week" | "2-weeks" | "shelf-stable")
  - allergens: string[] (from Big 9)
  - dietaryTags: string[] ("vegan", "vegetarian", "gluten-free", "halal", "kosher")
  - customConversions: { unit: string, weightOz: number }[]
  - createdAt: timestamp
  - updatedAt: timestamp

  /ingredients/{ingredientId}/vendors/{vendorRecordId}
    - vendorId: string (ref to /vendors)
    - vendorName: string (denormalized for read speed)
    - packSize: string (e.g., "40 lb case")
    - packUnit: string
    - packQuantity: number (e.g., 40)
    - packQuantityUnit: string (e.g., "lb")
    - costPerPack: number
    - costPerBaseUnit: number (auto-calculated)
    - leadTimeDays: number
    - isPreferred: boolean
    - updatedAt: timestamp

  /ingredients/{ingredientId}/priceHistory/{entryId}
    - vendorId: string
    - costPerPack: number
    - costPerBaseUnit: number
    - recordedAt: timestamp

/recipes/{recipeId}
  - name: string
  - category: string
  - cuisineTags: string[]
  - totalYieldQuantity: number
  - totalYieldUnit: string
  - portionSize: number
  - portionUnit: string
  - numberOfPortions: number (calculated)
  - prepTimeMinutes: number
  - cookTimeMinutes: number
  - equipment: string[]
  - instructions: string (rich text or markdown)
  - portionPhotoUrl: string (Firebase Storage URL)
  - allergens: string[] (rolled up from ingredients)
  - dietaryClassification: string[] (rolled up)
  - totalCost: number (calculated, denormalized for read speed)
  - costPerPortion: number (calculated, denormalized)
  - currentVersion: number
  - createdAt: timestamp
  - updatedAt: timestamp

  /recipes/{recipeId}/lines/{lineId}
    - type: "ingredient" | "sub-recipe"
    - referenceId: string (ingredientId or recipeId)
    - referenceName: string (denormalized)
    - quantity: number
    - unit: string
    - prepNote: string
    - lineCost: number (calculated, denormalized)
    - sortOrder: number

  /recipes/{recipeId}/versions/{versionId}
    - versionNumber: number
    - changes: string (description of what changed)
    - totalCost: number (cost at time of snapshot)
    - costPerPortion: number
    - lines: array (snapshot of all ingredient lines at this version)
    - createdAt: timestamp

/events/{eventId}
  - name: string
  - clientId: string (ref to /clients)
  - clientName: string (denormalized)
  - date: timestamp
  - venue: string
  - serviceStyle: string (enum)
  - headcount: number
  - dietaryAccommodations: { type: string, count: number }[]
  - bufferPercentage: number
  - adjustedHeadcount: number (calculated)
  - eventDurationHours: number (required for cocktail style)
  - tableSize: number (required for family style)
  - status: string (enum: "inquiry" | "proposed" | "confirmed" | "in-prep" | "in-progress" | "completed" | "reconciled")
  - costs: {
      food: number (calculated)
      labor: number
      laborHoursEstimated: number
      laborHoursActual: number (filled at reconciliation)
      disposables: number
      transport: number
      equipmentRental: number
      overhead: number
      total: number (calculated)
    }
  - pricing: {
      perHeadPrice: number
      totalPrice: number
      targetMarginPercent: number
      actualMarginPercent: number (calculated post-reconciliation)
    }
  - reconciliation: {
      actualHeadcount: number
      actualFoodCost: number
      actualLaborCost: number
      notes: string
      reconciledAt: timestamp
      reconciledBy: string
    }
  - notes: string
  - duplicatedFrom: string (eventId, if duplicated)
  - createdAt: timestamp
  - updatedAt: timestamp

  /events/{eventId}/menuItems/{menuItemId}
    - recipeId: string
    - recipeName: string (denormalized)
    - category: string (protein, starch, vegetable, salad, dessert, bread, appetizer, beverage, condiment)
    - popularityWeight: number (0-100, percentage within category)
    - scaledQuantity: number (calculated: total needed for this item)
    - scaledUnit: string
    - portionsNeeded: number (calculated)
    - cost: number (calculated)
    - isDietaryAccommodation: boolean
    - dietaryType: string (if accommodation: "vegan", "gluten-free", etc.)
    - sortOrder: number

  /events/{eventId}/disposables/{disposableId}
    - ingredientId: string (disposable items are ingredients)
    - name: string
    - quantityNeeded: number
    - unit: string
    - cost: number

  /events/{eventId}/proposals/{proposalId}
    - version: number
    - pdfUrl: string (Firebase Storage)
    - serviceNotes: string
    - createdAt: timestamp

  /events/{eventId}/wasteLog/{wasteId}
    - ingredientId: string
    - ingredientName: string
    - quantity: number
    - unit: string
    - category: string (enum: "trim" | "overproduction" | "spoilage" | "error")
    - costOfWaste: number (calculated)
    - note: string
    - loggedBy: string (userId)
    - loggedAt: timestamp

/clients/{clientId}
  - name: string
  - organization: string
  - phone: string
  - email: string
  - address: string
  - dietaryPreferences: string
  - notes: string
  - eventCount: number (denormalized counter)
  - createdAt: timestamp
  - updatedAt: timestamp

/vendors/{vendorId}
  - name: string
  - phone: string
  - email: string
  - deliveryDays: string[]
  - minimumOrder: number
  - notes: string
  - createdAt: timestamp
  - updatedAt: timestamp

/purchaseOrders/{poId}
  - weekStartDate: timestamp (purchasing window)
  - vendorId: string
  - vendorName: string (denormalized)
  - status: string (enum: "draft" | "sent" | "partially-received" | "fully-received")
  - eventIds: string[] (which events this PO serves)
  - estimatedTotal: number
  - actualTotal: number (filled on receiving)
  - createdAt: timestamp
  - updatedAt: timestamp

  /purchaseOrders/{poId}/lines/{lineId}
    - ingredientId: string
    - ingredientName: string (denormalized)
    - quantityNeeded: number (raw calculated need)
    - quantityNeededUnit: string
    - packSize: string
    - packsToOrder: number (rounded up)
    - quantityOrdered: number (packs × pack quantity)
    - overageQuantity: number
    - overageCost: number
    - expectedCostPerPack: number
    - expectedTotalCost: number
    - actualQuantityReceived: number (filled on receiving)
    - actualCostPerPack: number (filled on receiving)
    - actualTotalCost: number (filled on receiving)
    - qualityFlag: string (enum: "good" | "acceptable" | "poor" | "rejected")
    - receivingNotes: string

/inventory/{ingredientId}
  - ingredientId: string
  - ingredientName: string (denormalized)
  - quantityOnHand: number
  - unit: string
  - lastUpdated: timestamp
  - lastPhysicalCount: timestamp

  /inventory/{ingredientId}/adjustments/{adjustmentId}
    - type: string (enum: "received" | "event-deduction" | "reconciliation-correction" | "manual-adjustment")
    - quantity: number (positive for additions, negative for deductions)
    - reason: string
    - relatedEventId: string (optional)
    - relatedPOId: string (optional)
    - adjustedBy: string (userId)
    - adjustedAt: timestamp

/disposableTemplates/{templateId}
  - name: string (e.g., "Buffet Standard")
  - serviceStyle: string
  - items: {
      ingredientId: string,
      ingredientName: string,
      perPersonMultiplier: number,
      unit: string,
      notes: string
    }[]
  - createdAt: timestamp
  - updatedAt: timestamp

/systemConfig/settings (single document)
  - bufferDefaults: { [serviceStyle: string]: number }
  - quantityTargets: { [category: string]: { min: number, max: number, unit: string } }
  - weeklyPayroll: number
  - weeklyLaborHours: number
  - blendedHourlyRate: number (calculated)
  - defaultOverheadPercent: number
  - priceDeviationThreshold: number (percentage)
  - equipmentCapacities: { name: string, capacity: number, unit: string }[]

/users/{userId}
  - email: string
  - displayName: string
  - role: string (enum: "admin" | "kitchen-manager" | "prep-cook")
  - createdAt: timestamp
  - lastLogin: timestamp
```

### Key Denormalization Decisions

Firestore charges per document read, not per query complexity. We denormalize (duplicate) data strategically to minimize reads:

- **Ingredient names on recipe lines** — so viewing a recipe doesn't require N additional reads for ingredient names.
- **Client name on events** — so the event list view doesn't need to join to clients.
- **Vendor name on PO** — same principle.
- **Recipe cost on recipe document** — so the recipe list can show costs without reading all ingredient lines.
- **Event food cost on event document** — so the dashboard can show event costs without reading all menu items.

When a denormalized field changes (e.g., ingredient name is edited), a Cloud Function or batch update propagates the change to all documents that reference it.

---

## Application Structure

```
/catering-platform
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (auth provider, nav)
│   │   ├── page.tsx                  # Dashboard (home)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── ingredients/
│   │   │   ├── page.tsx              # Ingredient list
│   │   │   ├── new/page.tsx          # Add ingredient
│   │   │   └── [id]/page.tsx         # Edit ingredient, vendor records, price history
│   │   ├── recipes/
│   │   │   ├── page.tsx              # Recipe catalog
│   │   │   ├── new/page.tsx          # Create recipe
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # View/edit recipe
│   │   │       └── scale/page.tsx    # Scale recipe (standalone)
│   │   ├── events/
│   │   │   ├── page.tsx              # Event list + calendar view
│   │   │   ├── new/page.tsx          # Create event
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Event overview
│   │   │       ├── menu/page.tsx     # Menu builder
│   │   │       ├── prep-sheet/page.tsx
│   │   │       ├── packing/page.tsx
│   │   │       ├── execute/page.tsx  # Event day (mobile-optimized)
│   │   │       ├── reconcile/page.tsx
│   │   │       └── proposal/page.tsx # Generate/view proposals
│   │   ├── purchasing/
│   │   │   ├── page.tsx              # Weekly purchase planning
│   │   │   └── [poId]/
│   │   │       ├── page.tsx          # PO detail
│   │   │       └── receive/page.tsx  # Receiving workflow
│   │   ├── inventory/
│   │   │   └── page.tsx              # On-hand inventory + adjustments
│   │   ├── clients/
│   │   │   ├── page.tsx              # Client list
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx         # Client detail + event history
│   │   ├── vendors/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── waste/
│   │   │   ├── page.tsx              # Waste dashboard
│   │   │   └── log/page.tsx          # Quick waste logging (mobile-optimized)
│   │   ├── reports/
│   │   │   ├── page.tsx              # Reports hub
│   │   │   ├── event-pnl/page.tsx
│   │   │   ├── food-cost/page.tsx
│   │   │   ├── waste-analysis/page.tsx
│   │   │   ├── vendor-analysis/page.tsx
│   │   │   └── margin-trends/page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx              # System configuration
│   │   │   ├── users/page.tsx        # User management
│   │   │   └── templates/page.tsx    # Disposable templates
│   │   └── api/                      # API routes
│   │       ├── recipes/
│   │       │   └── recalculate/route.ts  # Batch cost recalculation
│   │       ├── events/
│   │       │   ├── generate-po/route.ts  # PO generation logic
│   │       │   └── generate-proposal/route.ts  # PDF generation
│   │       ├── purchasing/
│   │       │   └── consolidate/route.ts  # Weekly purchase consolidation
│   │       └── reports/
│   │           └── generate/route.ts     # Report data aggregation
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   └── RoleGuard.tsx         # Permission wrapper
│   │   ├── ingredients/
│   │   │   ├── IngredientForm.tsx
│   │   │   ├── IngredientList.tsx
│   │   │   ├── VendorRecordForm.tsx
│   │   │   └── PriceHistoryChart.tsx
│   │   ├── recipes/
│   │   │   ├── RecipeForm.tsx
│   │   │   ├── RecipeLineEditor.tsx  # Add/edit ingredient lines
│   │   │   ├── RecipeCostBreakdown.tsx
│   │   │   ├── RecipeScaler.tsx
│   │   │   └── SubRecipePicker.tsx
│   │   ├── events/
│   │   │   ├── EventForm.tsx
│   │   │   ├── MenuBuilder.tsx       # Drag/add recipes, set weightings
│   │   │   ├── CostBreakdown.tsx
│   │   │   ├── BuffetQuantityModel.tsx
│   │   │   ├── PrepSheet.tsx
│   │   │   ├── PackingChecklist.tsx
│   │   │   ├── ReconciliationForm.tsx
│   │   │   └── EventCalendar.tsx
│   │   ├── purchasing/
│   │   │   ├── POGenerator.tsx
│   │   │   ├── POLineEditor.tsx
│   │   │   └── ReceivingForm.tsx
│   │   ├── waste/
│   │   │   ├── WasteLogForm.tsx      # Quick-entry, big buttons
│   │   │   └── WasteDashboard.tsx
│   │   ├── reports/
│   │   │   ├── EventPnLReport.tsx
│   │   │   ├── FoodCostChart.tsx
│   │   │   ├── MarginTrendChart.tsx
│   │   │   └── VendorComparisonTable.tsx
│   │   └── shared/
│   │       ├── SearchBar.tsx
│   │       ├── UnitConverter.tsx
│   │       ├── CostDisplay.tsx       # Formats currency, hides from restricted roles
│   │       ├── IngredientPicker.tsx   # Searchable ingredient selector
│   │       └── StatusBadge.tsx
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── config.ts             # Firebase initialization
│   │   │   ├── auth.ts               # Auth helpers
│   │   │   ├── firestore.ts          # Firestore helpers + typed converters
│   │   │   └── storage.ts            # Storage upload/download helpers
│   │   ├── calculations/
│   │   │   ├── yield.ts              # AP → EP → cooked yield calculations
│   │   │   ├── recipeCost.ts         # Recipe cost calculation with sub-recipe rollup
│   │   │   ├── buffetQuantity.ts     # Buffet quantity model
│   │   │   ├── platedQuantity.ts     # Plated quantity model
│   │   │   ├── cocktailQuantity.ts   # Cocktail pieces-per-hour model
│   │   │   ├── familyStyleQuantity.ts
│   │   │   ├── dropoffQuantity.ts
│   │   │   ├── stationQuantity.ts
│   │   │   ├── eventCost.ts          # Total event cost aggregation
│   │   │   ├── purchaseAggregation.ts # Recipe explosion → ingredient aggregation
│   │   │   ├── unitConversion.ts     # Unit conversion engine
│   │   │   └── laborAllocation.ts    # Blended rate calculation
│   │   ├── types/
│   │   │   ├── ingredient.ts
│   │   │   ├── recipe.ts
│   │   │   ├── event.ts
│   │   │   ├── client.ts
│   │   │   ├── vendor.ts
│   │   │   ├── purchaseOrder.ts
│   │   │   ├── inventory.ts
│   │   │   ├── waste.ts
│   │   │   └── systemConfig.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts            # Auth state + role
│   │   │   ├── useFirestore.ts       # Generic Firestore CRUD hook
│   │   │   ├── useIngredients.ts
│   │   │   ├── useRecipes.ts
│   │   │   ├── useEvents.ts
│   │   │   ├── useInventory.ts
│   │   │   └── useRoleGuard.ts       # Permission checking
│   │   ├── constants/
│   │   │   ├── allergens.ts
│   │   │   ├── dietaryTags.ts
│   │   │   ├── serviceStyles.ts
│   │   │   ├── foodCategories.ts
│   │   │   ├── wasteCategories.ts
│   │   │   ├── units.ts              # All supported units + conversion factors
│   │   │   └── defaultQuantityTargets.ts
│   │   └── utils/
│   │       ├── formatCurrency.ts
│   │       ├── formatWeight.ts
│   │       └── permissions.ts        # Role → allowed actions mapping
│   └── styles/
│       └── globals.css               # Tailwind base + custom variables
├── public/
│   └── icons/                        # App icons, logo
├── firebase/
│   ├── firestore.rules               # Security rules (role-based access)
│   ├── storage.rules
│   └── seed/                         # Optional seed data for dev
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local                        # Firebase config (not committed)
```

---

## Security: Firestore Rules

Role-based access is enforced at two levels:

1. **Client-side** — UI hides features based on role (RoleGuard component).
2. **Server-side** — Firestore security rules enforce access at the database level. Even if someone manipulates the frontend, the database rejects unauthorized reads/writes.

```
// Simplified rule structure:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function getRole() {
      return request.auth.token.role;
    }

    function isAdmin() {
      return getRole() == 'admin';
    }

    function isKitchenManager() {
      return getRole() == 'kitchen-manager';
    }

    function isPrepCook() {
      return getRole() == 'prep-cook';
    }

    function isAdminOrKitchenManager() {
      return isAdmin() || isKitchenManager();
    }

    // Ingredients: admin + kitchen manager can read/write, prep cook read-only (no costs shown in UI)
    match /ingredients/{ingredientId} {
      allow read: if isAuthenticated();
      allow write: if isAdminOrKitchenManager();

      match /vendors/{vendorId} {
        allow read: if isAdminOrKitchenManager();
        allow write: if isAdminOrKitchenManager();
      }

      match /priceHistory/{entryId} {
        allow read: if isAdminOrKitchenManager();
        allow write: if isAdminOrKitchenManager();
      }
    }

    // Recipes: all authenticated can read, admin + kitchen manager can write
    match /recipes/{recipeId} {
      allow read: if isAuthenticated();
      allow write: if isAdminOrKitchenManager();
      match /{subcollection}/{docId} {
        allow read: if isAuthenticated();
        allow write: if isAdminOrKitchenManager();
      }
    }

    // Events: admin full access, kitchen manager can read event details for prep
    match /events/{eventId} {
      allow read: if isAdminOrKitchenManager();
      allow write: if isAdmin();
      // Exception: kitchen manager can update prep-related fields
      allow update: if isKitchenManager() &&
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['status', 'reconciliation', 'costs.laborHoursActual']);

      match /wasteLog/{wasteId} {
        allow read: if isAdminOrKitchenManager();
        allow create: if isAuthenticated(); // prep cooks can log waste
      }

      match /menuItems/{itemId} {
        allow read: if isAdminOrKitchenManager();
        allow write: if isAdmin();
      }
    }

    // Clients: admin only
    match /clients/{clientId} {
      allow read, write: if isAdmin();
    }

    // Inventory: admin + kitchen manager full access, prep cook can read + adjust
    match /inventory/{ingredientId} {
      allow read: if isAuthenticated();
      allow write: if isAdminOrKitchenManager();
      match /adjustments/{adjustmentId} {
        allow read: if isAdminOrKitchenManager();
        allow create: if isAuthenticated();
      }
    }

    // System config: admin only
    match /systemConfig/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Users: admin only
    match /users/{userId} {
      allow read: if isAuthenticated() && (isAdmin() || request.auth.uid == userId);
      allow write: if isAdmin();
    }
  }
}
```

---

## Calculation Engine Architecture

The cost calculations are the core of the product. They must be deterministic, testable, and correct.

### Calculation Flow

```
Ingredient Price Change
  → Recalculate EP cost (apply trim yield)
  → Recalculate cooked cost (apply cooking yield)
  → For each recipe using this ingredient:
    → Recalculate line cost
    → Recalculate total recipe cost + cost per portion
    → For each recipe that uses THIS recipe as a sub-recipe:
      → Recursive recalculation (max depth ~3-4 in practice)
    → For each event using this recipe:
      → Recalculate event food cost
      → Recalculate event total cost and margins
```

This cascade is triggered by:
1. **Real-time on edit** — when viewing a single recipe or event, recalculate in the browser for instant feedback.
2. **Batch via API route** — when an ingredient price changes and needs to propagate across many recipes/events, an API route runs the batch update server-side to avoid client-side overload.

### Unit Conversion Engine

```typescript
// Core conversion: everything normalizes to a base unit per measurement type
// Weight → ounces (oz)
// Volume → fluid ounces (fl oz)
// Count → each

convert(quantity: number, fromUnit: string, toUnit: string, ingredientId?: string): number

// If ingredientId is provided, custom conversions are checked first
// e.g., convert(2, "cup", "oz", "flour_123") → 8.5 oz (using flour's custom 4.25 oz/cup)
// Without ingredientId, volume-to-weight conversion throws an error (ambiguous without density)
```

---

## Key Pages: What They Do

### Dashboard (Home)
- This week's events (calendar strip)
- Overall food cost % (this week vs. last week)
- Events needing attention (un-reconciled, approaching, missing POs)
- Waste cost this week
- Ingredient price alerts (recent price jumps)

### Menu Builder (Event → Menu)
- Left panel: recipe catalog (searchable, filterable by category)
- Right panel: event menu being built, organized by food category
- Per-category: popularity weighting sliders that must sum to 100%
- Live cost calculation updating as items are added/removed/weighted
- Bottom bar: total food cost, labor, disposables, transport, overhead, total, margin

### Prep Sheet (Event → Prep Sheet)
- Sequenced list of every recipe to prep
- Sub-recipes consolidated and listed first
- Scaled quantities for each ingredient line
- Equipment needed column
- Print-friendly layout
- If multiple same-day events: merged view with event color-coding

### Receiving (PO → Receive)
- PO lines listed with expected quantities and prices
- Each line: actual quantity input, actual price input, quality dropdown
- Deviation alerts highlighted in red
- Submit updates inventory and price history

### Waste Log (Mobile-Optimized)
- Big tap targets
- Ingredient search (type 2 letters, get suggestions)
- Quantity + unit input
- Category select (4 big buttons: trim, overproduction, spoilage, error)
- Optional note
- Submit in under 15 seconds

---

## Build Phases

### Phase 1: Foundation (must build first)
1. Project scaffolding (Next.js + Firebase + Tailwind + shadcn/ui)
2. Authentication (Firebase Auth + role-based custom claims)
3. Layout shell (sidebar, header, mobile nav, role guard)
4. System configuration page
5. Ingredient CRUD (with vendor records and price history)
6. Unit conversion engine
7. Recipe CRUD (with sub-recipe support, cost calculation, versioning)

### Phase 2: Event Operations
8. Client CRUD
9. Vendor CRUD
10. Event CRUD (with all service styles)
11. Menu builder (with quantity models and cost calculation)
12. Proposal PDF generation

### Phase 3: Purchasing & Prep
13. Purchase order generation (recipe explosion, aggregation, vendor splitting)
14. Receiving workflow
15. Inventory tracking
16. Prep sheet generation
17. Packing checklist

### Phase 4: Execution & Analysis
18. Event execution (mobile-optimized day-of screen)
19. Post-event reconciliation
20. Waste logging (mobile-optimized)
21. Waste dashboard and analytics
22. Reporting suite (event P&L, food cost trends, vendor analysis, margin trends)
23. Dashboard (home page with key metrics)

---

## Deployment Pipeline

### Development
- `npm run dev` — local Next.js dev server
- Firebase Emulator Suite for local Firestore/Auth/Storage testing
- Environment: `.env.local` with Firebase config

### Preview
- Every git push to a branch → Vercel creates a preview deployment
- Preview deployments connect to a Firebase staging project (separate from production)

### Production
- Merge to `main` → Vercel auto-deploys to production
- Production connects to the production Firebase project
- Custom domain configured in Vercel

---

## What's Needed Before Building

### From Ramesh (manual steps):

1. **Create a Google account** (if you don't have one) — needed for Firebase
2. **Create a Firebase project** at https://console.firebase.google.com
   - Enable Firestore Database (start in test mode, we'll add rules)
   - Enable Authentication → Email/Password sign-in method
   - Enable Storage
   - Create a web app in the project to get config keys
3. **Create a Vercel account** at https://vercel.com (sign up with GitHub recommended)
4. **Create a GitHub account** (if you don't have one) — Vercel deploys from GitHub
5. **Share Firebase config values** with me:
   - apiKey
   - authDomain
   - projectId
   - storageBucket
   - messagingSenderId
   - appId

### What I'll handle:
- Scaffold the Next.js project
- Install all dependencies
- Set up TypeScript, Tailwind, shadcn/ui
- Configure Firebase SDK
- Write Firestore security rules
- Build all pages, components, and calculation logic
- Deploy to Vercel

---

## Performance Considerations

- **Firestore pagination** — ingredient and recipe lists paginate at 25 items per page to keep reads low.
- **Denormalized costs** — recipe costs and event costs are stored on the document so list views never need to calculate on-the-fly.
- **Server components** — pages that don't need interactivity (reports, prep sheets) render server-side for speed.
- **Image optimization** — recipe photos served through Next.js Image component with automatic resizing.
- **Offline support** — Firestore's `enablePersistence()` allows recipe viewing and waste logging when wifi drops. Writes sync when connection returns.
