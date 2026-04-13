import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const t0 = performance.now();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

console.log(`[⏱ Config] project=${firebaseConfig.projectId}, authDomain=${firebaseConfig.authDomain}`);

// Initialize Firebase (prevent re-initialization in dev hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
console.log(`[⏱ Config] App init: ${(performance.now() - t0).toFixed(1)}ms`);

export const auth = getAuth(app);
console.log(`[⏱ Config] Auth init: ${(performance.now() - t0).toFixed(1)}ms`);

// Initialize Firestore with:
// - experimentalForceLongPolling: Vercel blocks WebSocket connections to firestore.googleapis.com.
//   Without this, the SDK tries WebSocket first, hangs ~38s, then falls back. Forcing long polling
//   skips the broken WebSocket attempt entirely.
// - memoryLocalCache: Disables IndexedDB persistence. Without this, when the SDK is "offline"
//   (during the WebSocket hang), getDocs silently returns 0 docs from the empty local cache
//   instead of erroring. Memory-only cache ensures we always hit the network.
let db: Firestore;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: memoryLocalCache(),
  });
} catch {
  // Already initialized (hot reload) — just get the existing instance
  db = getFirestore(app);
}
export { db };
console.log(`[⏱ Config] Firestore init: ${(performance.now() - t0).toFixed(1)}ms`);

export const storage = getStorage(app);
console.log(`[⏱ Config] All services ready: ${(performance.now() - t0).toFixed(1)}ms`);

export default app;
