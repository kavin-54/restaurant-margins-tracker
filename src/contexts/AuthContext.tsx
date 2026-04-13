"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthChange, signIn, signOut, type AppUser } from "@/lib/firebase/auth";
import { getDocument } from "@/lib/firebase/firestore";
import { User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Auth listener — subscribe once, not on every route change
  useEffect(() => {
    const authStart = performance.now();
    console.log(`[⏱ Auth] useEffect running, subscribing to onAuthChange`);
    let timeout: NodeJS.Timeout;

    // Safety timeout — if Firebase Auth doesn't respond in 1 second, stop loading
    timeout = setTimeout(() => {
      console.warn(`[⏱ Auth] TIMEOUT after 1s — no auth response, forcing loading=false`);
      setLoading(false);
    }, 1000);

    const unsubscribe = onAuthChange(async (firebaseUser: User | null) => {
      clearTimeout(timeout);
      const elapsed = (performance.now() - authStart).toFixed(1);

      if (firebaseUser) {
        console.log(`[⏱ Auth] User received in ${elapsed}ms — uid=${firebaseUser.uid}, email=${firebaseUser.email}`);
        const authUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "",
          role: "admin",
        };
        setUser(authUser);
        setLoading(false);
        console.log(`[⏱ Auth] loading=false set at ${(performance.now() - authStart).toFixed(1)}ms`);

        // Fetch Firestore user doc in the background to get real role
        const bgStart = performance.now();
        getDocument<AppUser>("users", firebaseUser.uid)
          .then((userDoc) => {
            if (userDoc) {
              console.log(`[⏱ Auth] Background user doc fetched in ${(performance.now() - bgStart).toFixed(1)}ms, role=${userDoc.role}`);
              setUser(userDoc);
            } else {
              console.log(`[⏱ Auth] Background user doc not found (${(performance.now() - bgStart).toFixed(1)}ms)`);
            }
          })
          .catch((err) => {
            console.warn(`[⏱ Auth] Background user doc FAILED in ${(performance.now() - bgStart).toFixed(1)}ms:`, err.message || err);
          });
      } else {
        console.log(`[⏱ Auth] No user (signed out) at ${elapsed}ms`);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Handle routing separately — redirect to login when not authenticated
  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      console.log(`[⏱ Auth] Redirecting to /login (no user, pathname=${pathname})`);
      router.push("/login");
    }
  }, [loading, user, pathname, router]);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    return signIn(email, password);
  }, []);

  const handleSignOut = useCallback(async () => {
    return signOut();
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    signIn: handleSignIn,
    signOut: handleSignOut,
  }), [user, loading, handleSignIn, handleSignOut]);

  if (loading) {
    return (
      <AuthContext.Provider value={value}>
        <div className="flex h-screen items-center justify-center bg-[#f8f9fa]">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center animate-pulse mx-auto mb-3">
              <span className="material-symbols-outlined text-blue-600 text-2xl">restaurant</span>
            </div>
            <p className="text-sm font-medium text-gray-400 tracking-wide">Loading...</p>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
