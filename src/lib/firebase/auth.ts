import { auth } from "./config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

export async function signIn(email: string, password: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result;
  } catch (err) {
    console.error("[Auth] signIn failed:", err);
    throw err;
  }
}

export async function signUp(email: string, password: string) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result;
  } catch (err) {
    console.error("[Auth] signUp failed:", err);
    throw err;
  }
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, (user) => {
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
