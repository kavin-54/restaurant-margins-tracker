# Catering Operations Platform — Product Requirements

## Product Summary

An internal operations platform for a catering-dominant business that manages the entire lifecycle from ingredient purchasing through event reconciliation. It serves as both the operational playbook (standardized recipes, prep sheets, purchasing) and the financial control system (cost tracking, margin analysis, waste visibility). It also generates client-facing proposals, but the system itself is only used by internal staff.

---

## Business Context

- **Primary business:** Catering (5+ buffet events per week), with future potential to add restaurant operations
- **Dominant service style:** Buffet (with support for plated, cocktail, drop-off, family-style, and food stations)
- **Recipe state:** Starting from scratch — the system will help build the recipe book, not just store an existing one
- **Cost tracking maturity:** No current system — this is the first time systematically tracking costs
- **Kitchen team:** Full-time salaried staff (labor is overhead allocated to events, not per-event hires)
- **Procurement:** Vendors deliver; vendor relationships still being established
- **Dietary approach:** Combination of built-in options on every menu and on-request accommodations per event
- **POS integration:** Not now, but architecture should support it in the future
- **Product scope:** Internal tool for this business only (not SaaS)

---

## Core Entities

### Ingredients

The atomic unit of the system. Every cost calculation traces back to ingredients.

**Required fields:**
- Name
- Category (protein, produce, dairy, dry goods, spice, condiment, oil/fat, grain/starch, beverage, disposable, packaging, etc.)
- Primary unit of measure
- AP-to-EP yield percentage (as-purchased to edible-portion — accounts for peeling, trimming, deboning, etc.)
- Cooking yield percentage (raw usable to cooked/finished — accounts for moisture loss, reduction, etc.)
- Shelf life / perishability class (e.g., same-day, 2-3 days, 1 week, shelf-stable)
- Allergen flags (Big 9: milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soy, sesame)
- Dietary tags (vegan, vegetarian, gluten-free, halal, kosher, etc.)

**Vendor records (multiple per ingredient):**
- Vendor name
- Pack size and unit (e.g., "40 lb case", "6 × 1 gallon", "#10 can")
- Unit cost (cost per pack)
- Cost per base unit (auto-calculated — e.g., $/lb)
- Last updated date
- Lead time (days)
- Price history over time (every price entry is timestamped)
- Preferred vendor flag

**System behaviors:**
- When any ingredient price changes, all recipes using that ingredient recalculate their costs automatically
- The system always distinguishes between AP cost (what you pay) and EP cost (what it actually costs per usable unit after yield loss)
- Two-stage yield: AP → raw usable (trim yield) → cooked/finished (cooking yield). Both are tracked because they compound. Example: buy chicken at $2.10/lb AP, 75% trim yield = $2.80/lb raw usable, 75% cooking yield = $3.73/lb cooked. If the portion spec is 6oz cooked, the true ingredient cost for that portion is $1.40, not $0.79.

---

### Recipes

Hierarchical — recipes can contain both raw ingredients and other recipes (sub-recipes). This is critical because catering menus share base components: stocks, sauces, marinades, dressings, and prep components appear across many dishes.

**Required fields:**
- Name
- Category/tags (appetizer, main, side, dessert, sauce, base, marinade, beverage, etc.)
- Cuisine tags (for searchability)
- Ingredient lines, each with: ingredient or sub-recipe reference, quantity, unit of measure, and prep note (e.g., "diced," "julienned")
- Total yield: quantity and unit (e.g., "makes 5 quarts" or "makes 24 portions")
- Portion size and unit (e.g., "6 oz" or "1 cup" or "1 piece")
- Number of portions (auto-calculated from total yield ÷ portion size)
- Prep time estimate
- Cook time estimate
- Equipment needed (oven, stovetop, blast chiller, mixer, etc.)
- Prep instructions / method
- Portioning spec with photo (what a correct portion looks like)
- Allergen rollup (auto-calculated from all ingredients and sub-recipes)
- Dietary classification (auto-calculated)
- Version history: the system auto-saves a new version snapshot whenever ingredient lines are added, removed, or have their quantities changed (i.e., changes that affect recipe cost). Edits to instructions, tags, or photos do not trigger a new version. Each version records: timestamp, what changed, and the recipe cost at that point. This allows cost trending per recipe over time without creating noise from non-cost edits.

**System behaviors:**
- Auto-calculates: total recipe cost, cost per portion
- Supports unit conversion across weight, volume, and count — with per-ingredient custom conversions (a "cup" of flour weighs different than a "cup" of sugar)
- Recipes scale: enter a target number of portions or a target total yield, and every ingredient line adjusts proportionally
- Sub-recipe costs roll up: if a vinaigrette recipe costs $4.20/quart and a salad recipe uses 2 oz of vinaigrette per portion, that $0.26 flows into the salad's portion cost
- Recipe entry should be fast and forgiving — allow rough entry ("about 3 lbs chicken") and refinement later. A recipe should be usable after a 2-minute quick-add, not require perfection upfront.
- Batch size awareness: flag when scaled quantities exceed common equipment capacities (e.g., "this scales to 22 gallons — your stock pot holds 20, plan for two batches")
- Recipe duplication: one-click copy of an existing recipe to create a variant (e.g., a gluten-free version of an existing dish). The duplicate starts as an independent recipe with all fields pre-filled from the original.

---

### Events

The operational unit for catering. Everything flows through events.

**Required fields:**
- Event name / description
- Client (linked to client record)
- Date and time
- Venue / location
- Service style: buffet, plated, cocktail/passed, drop-off, family-style, food stations
- Confirmed headcount
- Dietary accommodation counts (e.g., 8 vegan, 4 gluten-free, 2 nut allergy)
- Buffer percentage (configurable per event, defaults by service style — e.g., 7% for buffet, 5% for plated)
- Adjusted headcount (auto-calculated: headcount + buffer). All guests receive the same serving size regardless of age.
- Event menu (selected recipes with per-item details — see Menu Building below)
- Cost breakdown:
  - Food cost (auto-calculated from recipes × adjusted quantities)
  - Labor cost (estimated prep hours × blended hourly rate — see Labor Cost Allocation below)
  - Disposables cost (auto-calculated from disposable template × headcount, adjustable)
  - Transport cost (manual entry)
  - Equipment/rental cost (manual entry)
  - Overhead allocation (configurable percentage or flat amount)
  - **Total event cost**
- Pricing:
  - Per-head price to client
  - Total event price
  - Target margin percentage
  - Actual margin (calculated post-reconciliation)
- Status (maps to lifecycle steps):
  - **inquiry** — event created, details being gathered (Step 1: Inquiry & Event Creation)
  - **proposed** — menu built, costs calculated, proposal generated and sent to client (Step 2: Menu Building & Quoting)
  - **confirmed** — client agreed, event locked in, ready for purchasing (triggers Step 3: Purchase Planning)
  - **in-prep** — ingredients purchased/received, kitchen is actively prepping (Steps 3-5: Purchase Planning → Receiving → Prep & Production)
  - **in-progress** — event day, food is packed/in-transit/being served (Steps 6-7: Packing & Transport → Event Execution)
  - **completed** — event is finished, awaiting reconciliation
  - **reconciled** — post-event reconciliation done, actual costs and margin calculated (Step 8: Post-Event Reconciliation)
- **Note:** Invoicing and payment tracking are out of scope for now but may be added in the future. The data model should accommodate this extension.
- Notes
- Event duplication: one-click copy of a past event (or any existing event) as a starting template for a new event. Copies the menu, service style, and cost structure — user updates the client, date, headcount, and any menu tweaks. At 5+ events per week, many are similar, and this eliminates redundant data entry.

**Quantity Models by Service Style:**

Each service style calculates food quantities differently. The system must support all of them.

**Buffet (primary model — most complex):**

1. Define per-person quantity targets by category (configurable defaults):
   - Protein: 6-8 oz per person
   - Starch/grain: 4-6 oz per person
   - Vegetables: 3-4 oz per person
   - Salad: 2-3 oz per person
   - Dessert: 1 piece or 4-6 oz per person
   - Bread/rolls: 1.5 pieces per person
   - Appetizers/dips/spreads: 2-3 oz per person (or 3-4 pieces per person for finger food)
   - Beverages: tracked by volume per person (e.g., 2-3 drinks per person) or handled as a flat allocation per event
   - Condiments/sauces: flat quantity based on headcount tier (e.g., 1 gallon of sauce per 50 guests), not per-person weight

2. When multiple items exist in a category, split the per-person target by popularity weighting:
   - Example: 3 proteins offered. Short ribs (45% popularity), chicken (35%), vegetable curry (20%)
   - For 100 adjusted guests at 7oz protein/person = 700 oz total protein needed
   - Short ribs: 315 oz (19.7 lbs) → scale the short ribs recipe to yield this amount
   - Chicken: 245 oz (15.3 lbs) → scale accordingly
   - Vegetable curry: 140 oz (8.75 lbs) → scale accordingly

3. Popularity weightings should be adjustable per event and learn from actual consumption data over time (future enhancement).

4. Replenishment strategy: the system should let you specify what percentage is put out immediately vs. held in reserve (e.g., 75% out / 25% reserve for buffet).

**Plated / Sit-Down:**
- Simplest model: 1 portion per guest per course, scaled to adjusted headcount.
- If offering a choice (e.g., "chicken or fish"), client provides the split or the system defaults to even distribution. The split works identically to buffet popularity weightings.
- No replenishment strategy needed — portions are pre-plated.

**Cocktail / Passed Hors d'Oeuvres:**
- Measured in pieces per person per hour (not weight-based).
- Default: 6-8 pieces per person for the first hour, 4-5 pieces for each subsequent hour (consumption tapers).
- Each menu item gets a share of the total piece count, split by popularity weighting.
- Example: 3-hour cocktail reception, 100 guests. Total pieces = (8 × 100) + (5 × 100) + (4 × 100) = 1,700 pieces, split across the offered items.
- Event duration (hours) is a required input for this service style.

**Food Stations:**
- Treated as mini-buffets. Each station has its own per-person quantity targets and popularity weightings.
- Total per-person food quantity is distributed across stations rather than across categories within one buffet line.
- Example: 3 stations, system allocates roughly equal per-person totals to each station, then each station uses buffet-style category logic internally.

**Family Style:**
- Recipes are scaled to table-level serving vessels (e.g., "1 platter serves 8-10").
- System calculates: adjusted headcount ÷ table size = number of tables → number of platters per recipe.
- Table size / guests per table is a required input for this service style.

**Drop-Off:**
- Quantities are calculated identically to buffet (per-person targets by category with popularity weightings).
- No replenishment strategy — all food is delivered at once.
- Packing is in disposable catering trays/pans rather than chafing dishes. The system should calculate the number of trays needed based on tray capacity vs. total quantity per item.

**Dietary accommodation handling:**

- Built-in dietary items: some menu items are inherently vegetarian/vegan/GF and serve the whole guest list
- On-request accommodations: separate dishes prepared for specific guests with dietary needs
- Each accommodation creates its own mini-menu within the event, with separate recipe scaling based on the count of guests needing that accommodation (plus a small buffer)
- Dietary items have their own cost rollup that feeds into the total event food cost
- Allergen cross-reference: the system should flag if a menu item contains allergens that conflict with stated dietary accommodations

**Disposables and service supplies:**

Disposables are a cost category that's easy to forget in quoting. Rather than building a complex auto-calculation engine, the system handles disposables as follows:

- Disposable templates: reusable configurations per service style that define which items are needed and their per-person multiplier. Example: a "Buffet Standard" template includes dinner plates (1.1 per person, accounting for breakage), salad plates (1 per person), napkins (2 per person), cutlery sets (1.1 per person), chafing fuel cans (1 per 2 chafing dishes), serving utensils (1 per menu item).
- When an event is created, the system applies the matching template and auto-calculates quantities from headcount. These can be manually adjusted.
- Each disposable item is an ingredient in the system (category: "disposable" or "packaging") with its own vendor/cost record, so disposable costs flow through the same purchasing and costing engine as food ingredients.
- For events that use rental equipment instead of disposables (e.g., real china), the rental cost is entered as a manual line item under equipment/rental cost.

**Labor cost allocation:**

Since the kitchen team is full-time salaried (not hired per event), labor cost is allocated to events as a share of overhead rather than a direct expense. The system uses this method:

- **System configuration:** Admin enters total weekly kitchen payroll (all-in: wages, benefits, taxes) and total available kitchen labor hours per week. The system calculates a blended hourly rate (e.g., $12,000 payroll ÷ 200 hours = $60/hour blended rate).
- **Per event:** During menu building, the system estimates prep hours based on the sum of prep time + cook time for each recipe at the event's scaled quantity. This estimate can be manually adjusted (e.g., "this event is more complex than the recipes suggest, add 4 hours").
- **Event labor cost** = estimated prep hours × blended hourly rate.
- **Post-event:** During reconciliation, actual prep hours can be logged to calculate actual labor cost vs. estimated.
- The blended hourly rate is updated whenever payroll or staffing levels change — it is not recalculated per-event.

---

### Clients

**Required fields:**
- Name (individual and/or organization)
- Contact info (phone, email, address)
- Company/organization
- Event history (linked to all past events)
- Dietary preferences / standing requirements
- Notes / preferences (e.g., "always wants extra dessert station," "very price-sensitive," "requires halal proteins")

---

### Purchase Orders

Generated from confirmed events. Aggregate ingredient needs across a purchasing window.

**System behaviors:**
- Explode every event's menu recipes down to raw ingredients
- Apply both yield percentages (trim and cooking) to calculate true AP quantities needed
- Scale to adjusted headcounts (with buffer and popularity weightings)
- Aggregate across all confirmed events in the purchasing window (typically a week)
- Subtract current inventory on hand
- Group by preferred vendor
- Round up to nearest purchasable pack size — and show the overage cost
- Flag ingredients with long lead times that need early ordering
- Flag potential cross-event ingredient sharing: when purchasing for the week, the system identifies ingredients where pack-size rounding for an earlier event produces overage that a later event could use. Example: "Tuesday's event needs 11 lbs parsley (buying 12 lbs in 3-lb bunches = 1 lb overage). Wednesday's event needs 2 lbs parsley. Consider reducing Wednesday's order by 1 lb." This is a suggestion, not a guarantee — actual leftover depends on Tuesday's prep going to plan.
- Show estimated total purchase cost per vendor and overall
- Track PO status: draft → sent → partially received → fully received

---

### Inventory (Basic On-Hand Tracking)

A lightweight inventory layer that tracks what's currently in the kitchen. This is not a full perpetual inventory system — it's focused on supporting purchase planning and waste prevention.

**How inventory moves:**
- **In:** When a delivery is received and logged against a PO, the received quantities are added to on-hand inventory for each ingredient.
- **Out (planned):** When an event moves to "in-prep" status, the system calculates the theoretical ingredient usage from the event's scaled recipes and deducts it from on-hand inventory. This is a projected deduction, not actual.
- **Out (actual):** During post-event reconciliation, actual usage and waste logs replace the projected deduction with real numbers. Any difference adjusts inventory accordingly.
- **Manual adjustments:** Staff can manually adjust inventory counts at any time (for spoilage discovered outside an event, physical counts, corrections). Each adjustment requires a reason (spoilage, theft/loss, physical count correction, transferred to another use).

**Per-ingredient inventory record:**
- Ingredient (linked)
- Quantity on hand (number + unit)
- Last updated timestamp
- Last physical count date

**System behaviors:**
- Purchase order generation subtracts current on-hand inventory from calculated needs before creating PO lines.
- Perishability alerts use on-hand quantity + shelf life to flag items at risk of expiring before they can be used.
- The system does NOT attempt to track inventory at the batch/lot level (e.g., "the chicken received on Monday" vs. "the chicken received on Wednesday"). It tracks aggregate quantity per ingredient. Batch-level tracking is a future enhancement.

---

### Proposals

- Generated from event data
- Client-facing: shows menu items (names and descriptions, not recipes), per-head price, service style, headcount, event date/venue, and total price
- Never shows internal cost data (ingredient costs, margins, yield percentages, or any operational detail)
- Supports revision tracking (proposal v1, v2, etc. as client requests changes)
- Exportable as PDF
- Optional: notes/custom text field for service details (setup time, staffing provided, what's included/excluded)

---

## The Full Catering Lifecycle

### 1. Inquiry & Event Creation
Create event with client info, date, venue, service style, estimated headcount. System prompts for dietary accommodation counts and auto-applies buffer based on service style.

### 2. Menu Building & Quoting
Select recipes for the event menu. For buffet events, assign popularity weightings per item within each category. System calculates total food cost, adds labor/disposables/transport/equipment/overhead estimates. Shows per-head cost, total cost, and recommended price at target margin. Generates client-facing proposal. Event status moves to "confirmed" when menu and headcount are locked in.

### 3. Purchase Planning
System explodes recipes to raw ingredients, scales to adjusted headcount, aggregates across the week's events, checks inventory, generates vendor-specific purchase orders with optimal pack sizes. Flags lead time issues and cross-event sharing opportunities.

### 4. Receiving
Team member checks delivered items against PO. Logs: actual quantity received, actual invoice price vs. expected price, quality flags. Price discrepancies update the event's actual cost tracking and the ingredient's price history. System alerts if price deviation exceeds configurable threshold (e.g., >5%).

### 5. Prep & Production
System generates sequenced prep sheets: every recipe and sub-recipe at scaled quantities, with time estimates, equipment needs, portioning specs. Shared sub-recipes consolidated across items. If prepping for multiple same-day events, prep sheets can merge with items flagged by event. During prep, staff can log: actual quantities used, waste events (categorized), recipe deviations.

### 6. Packing & Transport
System generates packing checklist: all food items with quantities and holding instructions (hot/cold/ambient), disposables (from the event's disposable template, scaled to headcount), serving equipment, transport containers. Distinguishes "initial service" vs. "reserve/backup" quantities for buffet.

### 7. Event Execution
Minimal data entry (phone/tablet-friendly): actual headcount served, any on-site menu changes, service notes. This must be fast — nobody does data entry during a live event.

### 8. Post-Event Reconciliation
Quick workflow (target: under 5 minutes for routine events): confirm actual headcount, log leftover quantities (return to inventory or log as waste), note any issues. System auto-calculates: planned vs. actual food cost, labor cost, total event P&L, actual margin. Leftovers either return to general inventory or are categorized as waste.

---

## Waste Prevention & Tracking

### Waste Categories
The system distinguishes between types of waste because each has a different cause and fix:
- **Trim waste:** Unavoidable, built into yield percentages. Monitor to ensure actual trim aligns with expected yield.
- **Overproduction waste:** Made more than needed. Caused by poor scaling, rounding, or buffer miscalculation.
- **Spoilage waste:** Product expired or degraded before use. Caused by over-purchasing, poor rotation, or insufficient cross-event utilization.
- **Error waste:** Burned, dropped, contaminated, incorrect preparation. Caused by training or process gaps.

### Waste Prevention Features
- **Purchasing optimization:** Flag when you're buying more than confirmed events need. Show overage from pack-size rounding.
- **Perishability alerts:** Flag inventory items approaching shelf-life expiry. Suggest upcoming events where they could be used.
- **Cross-event utilization:** When leftover ingredients from one event could serve another, surface the opportunity.
- **Theoretical vs. actual comparison:** Compare what recipes say should have been used against what was actually used. The gap is your operational inefficiency — typically 3-8% in well-run operations, 12-15% in poorly managed ones.
- **Portioning drift detection:** If actual ingredient usage consistently exceeds recipe specs for a particular item, flag it as likely over-portioning.
- **Waste cost dashboard:** Always show waste in dollars, not just weight. "$34.80 of chicken wasted this week" hits harder than "12 lbs."
- **Waste trending:** Track waste by category, ingredient, event type, and time period to identify patterns.

---

## Reporting & Analytics

The system must answer these questions:

### Event-Level
- Did this specific event make or lose money, and by how much?
- Where did actual costs deviate from planned costs, and why?
- What was the actual food cost percentage vs. target?
- How much waste occurred and in what categories?

### Operational
- What is our overall food cost percentage this week/month/quarter?
- Where is the biggest gap between theoretical and actual food cost?
- What are our highest-waste ingredients and categories?
- Which recipes or menu configurations are most/least profitable?
- How are ingredient prices trending — what's getting more expensive?
- Which vendors give the best pricing and most consistent quality/accuracy?

### Strategic
- What's our average margin by event type, service style, headcount range?
- How accurate are our quotes vs. actuals — are we consistently over or under-estimating?
- What is the dollar value of waste, and is it trending up or down?
- Where are the biggest opportunities to improve margin — pricing, purchasing, waste reduction, or portion control?

---

## User Roles & Permissions

### Admin / Owner
Full access to everything: financials, pricing, margins, client data, event P&L, system configuration, user management, all reports.

### Kitchen Manager / Head Chef
Recipe creation and editing, prep sheet generation, receiving and delivery verification, waste logging, ingredient cost visibility, inventory management. **Cannot see:** client-facing pricing, event margins, proposals, or client contact details.

### Prep Cook / Line Staff
Read-only recipe access, waste logging, inventory counts. **Cannot see:** any cost or financial data, client information, event details beyond their prep assignments.

---

## Unit Conversion Engine

The system must handle conversions across weight, volume, and count — with per-ingredient custom conversions.

**Standard conversions:**
- Weight: oz ↔ lb ↔ g ↔ kg
- Volume: tsp ↔ tbsp ↔ fl oz ↔ cup ↔ pint ↔ quart ↔ gallon ↔ ml ↔ liter
- Count: each, dozen, case

**Per-ingredient custom conversions:**
- A "cup" of flour = 4.25 oz by weight
- A "cup" of sugar = 7 oz by weight
- A "bunch" of parsley = approximately 2 oz
- A "head" of lettuce = approximately 1.5 lbs

These custom conversions allow recipes to use practical kitchen units ("2 cups flour") while the purchasing system works in purchasable units ("50 lb bag").

---

## Technical Considerations (Non-Code)

- **Mobile/tablet friendly:** Receiving, waste logging, and event-day tracking must work well on mobile devices in a kitchen environment (grease, water, gloves).
- **Speed of data entry:** The system lives or dies on whether busy kitchen staff actually use it. Every input screen should be optimized for minimum taps/clicks.
- **Offline resilience:** Kitchen environments have unreliable wifi. Critical functions (recipe viewing, prep sheets) should work offline or degrade gracefully.
- **Data model for future POS integration:** Menu items should have fields for external IDs (PLU/SKU). Sales data model should accept both manual input and future API feeds.
- **Multi-event calendar view:** At 5+ events per week, the team needs to see the week at a glance — what's being prepped, what's being delivered, what's happening on-site.
- **Search and filtering:** With 30-80 recipes growing over time, robust search by name, category, ingredient, allergen, and dietary tag is essential.

---

## Out of Scope (For Now)
- Restaurant menu management and plate-level food cost tracking
- Tiered catering packages (Bronze/Silver/Gold)
- Client-facing system access or roles
- Invoicing and payment tracking (architecture should support adding later)
- POS integration (architecture ready, not implemented)
- Inventory perpetual tracking (basic on-hand tracking included, full perpetual inventory is future)
- Multi-location support

---

## Open Questions & Future Considerations
- What specific proposal templates/branding are needed?
- Are there regulatory or compliance requirements (health department, food safety logs)?
- What's the preferred approach to recipe photos and plating standards documentation?
