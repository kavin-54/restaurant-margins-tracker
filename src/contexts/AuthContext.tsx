"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthChange, type AppUser } from "@/lib/firebase/auth";
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

  useEffect(() => {
    console.log("[AuthProvider] useEffect running, pathname:", pathname);
    console.time("[AuthProvider] total auth resolution");
    let timeout: NodeJS.Timeout;

    // Safety timeout — if Firebase Auth doesn't respond in 1 second, stop loading
    timeout = setTimeout(() => {
      console.warn("[AuthProvider] TIMEOUT: Auth did not respond within 1s, forcing load");
      console.timeEnd("[AuthProvider] total auth resolution");
      setLoading(false);
    }, 1000);

    const unsubscribe = onAuthChange(async (firebaseUser: User | null) => {
      clearTimeout(timeout);
      console.log("[AuthProvider] Auth state received, user:", firebaseUser ? firebaseUser.uid : "null");

      if (firebaseUser) {
        // Set user IMMEDIATELY from Firebase Auth — don't block on Firestore
        const authUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "",
          role: "admin",
        };
        setUser(authUser);
        setLoading(false);
        console.timeEnd("[AuthProvider] total auth resolution");

        // Fetch Firestore user doc in the background to get real role
        getDocument<AppUser>("users", firebaseUser.uid)
          .then((userDoc) => {
            if (userDoc) {
              console.log("[AuthProvider] Background: user doc found, role:", userDoc.role);
              setUser(userDoc);
            }
          })
          .catch((err) => {
            console.warn("[AuthProvider] Background: user doc fetch failed:", err);
          });
      } else {
        console.log("[AuthProvider] No user, redirecting to /login");
        setUser(null);
        setLoading(false);
        console.timeEnd("[AuthProvider] total auth resolution");
        if (pathname !== "/login") {
          router.push("/login");
        }
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [pathname, router]);

  const handleSignIn = async (email: string, password: string) => {
    const { signIn } = await import("@/lib/firebase/auth");
    return signIn(email, password);
  };

  const handleSignOut = async () => {
    const { signOut } = await import("@/lib/firebase/auth");
    return signOut();
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };

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
