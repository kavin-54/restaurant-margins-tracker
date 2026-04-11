# HFS Catering Platform

## Project Overview
Internal catering operations platform for managing the full lifecycle from ingredient purchasing through event reconciliation. Tracks costs, margins, waste, and generates client proposals.

## Tech Stack
- **Framework:** Next.js 15 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui + Lucide icons
- **Database:** Cloud Firestore (real-time listeners)
- **Auth:** Firebase Authentication (email/password)
- **Storage:** Firebase Storage
- **Hosting:** Vercel (auto-deploys from `main` branch)
- **State:** React Context + Firestore `onSnapshot`
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts

## Project Structure
```
catering-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── login/page.tsx      # Login/signup page
│   │   └── (app)/              # Auth-protected route group
│   │       ├── layout.tsx      # App shell (sidebar + header)
│   │       ├── page.tsx        # Dashboard
│   │       ├── events/         # Event CRUD + menu builder
│   │       ├── recipes/        # Recipe catalog + ingredient lines
│   │       ├── ingredients/    # Ingredient CRUD + vendor records
│   │       ├── clients/        # Client CRUD
│   │       ├── vendors/        # Vendor CRUD
│   │       ├── purchasing/     # Purchase orders + receiving
│   │       ├── inventory/      # On-hand inventory tracking
│   │       ├── waste/          # Waste logging + dashboard
│   │       ├── reports/        # Reports hub (placeholders)
│   │       └── settings/       # System configuration
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives
│   │   └── layout/             # Sidebar, Header, PageHeader, EmptyState, LoadingScreen
│   ├── contexts/
│   │   └── AuthContext.tsx      # Auth state + role management
│   └── lib/
│       ├── firebase/           # Firebase config, auth, firestore helpers
│       ├── calculations/       # Cost, yield, quantity model engines
│       ├── hooks/              # Firestore CRUD hooks per entity
│       ├── types/              # TypeScript types for all entities
│       ├── constants/          # Allergens, categories, units, defaults
│       └── utils/              # Formatting, permissions
├── firebase.json               # Firebase project config
├── .firebaserc                 # Firebase project alias
└── .env.local                  # Firebase credentials (NOT committed)
```

## Firebase Project
- **Project ID:** `resteraunt-margins-tracker`
- **Auth:** Email/Password enabled
- **Firestore:** Test mode (needs security rules for production)
- **Web App:** HFS Margins

## Key Conventions
- All app pages are `"use client"` (client components using Firestore real-time listeners)
- Shared layout components: `PageHeader`, `EmptyState`, `LoadingScreen`
- Hooks pattern: `useCollection<T>()` / `useDocument<T>()` for Firestore
- Entity-specific hooks: `useIngredients()`, `useRecipes()`, `useEvents()`, etc.
- Role-based permissions: admin, kitchen-manager, prep-cook
- First user created via signup gets `admin` role

## Commands
- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint check
- Push to `main` branch → auto-deploys to Vercel

## Git Conventions
- Use semantic versioning for commits (semver)
- Format: `type(scope): description` (e.g., `feat(events): add menu builder`)
- Types: feat, fix, docs, style, refactor, test, chore
