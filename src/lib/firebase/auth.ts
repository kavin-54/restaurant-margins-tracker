import { auth } from "./config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

export async function signIn(email: string, password: string) {
  console.log("[Auth] signIn called for:", email);
  console.time("[Auth] signIn duration");
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.timeEnd("[Auth] signIn duration");
    console.log("[Auth] signIn success, uid:", result.user.uid);
    return result;
  } catch (err) {
    console.timeEnd("[Auth] signIn duration");
    console.error("[Auth] signIn failed:", err);
    throw err;
  }
}

export async function signUp(email: string, password: string) {
  console.log("[Auth] signUp called for:", email);
  console.time("[Auth] signUp duration");
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.timeEnd("[Auth] signUp duration");
    console.log("[Auth] signUp success, uid:", result.user.uid);
    return result;
  } catch (err) {
    console.timeEnd("[Auth] signUp duration");
    console.error("[Auth] signUp failed:", err);
    throw err;
  }
}

export async function signOut() {
  console.log("[Auth] signOut called");
  return firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  console.log("[Auth] onAuthChange listener registered");
  console.time("[Auth] first onAuthChange callback");
  let first = true;
  return onAuthStateChanged(auth, (user) => {
    if (first) {
      console.timeEnd("[Auth] first onAuthChange callback");
      first = false;
    }
    console.log("[Auth] onAuthChange fired, user:", user ? user.uid : "null");
    callback(user);
  });
}

export type UserRole = "admin" | "kitchen-manager" | "prep-cook";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}
