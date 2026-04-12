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
        // Build fallback user immediately from Firebase Auth
        const fallbackUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "",
          role: "admin",
        };

        // Try to fetch Firestore user doc with a 1.5s timeout
        try {
          console.time("[AuthProvider] Firestore user doc fetch");
          const userDocPromise = getDocument<AppUser>("users", firebaseUser.uid);
          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Firestore user doc fetch timeout (1.5s)")), 1500)
          );
          const userDoc = await Promise.race([userDocPromise, timeoutPromise]);
          console.timeEnd("[AuthProvider] Firestore user doc fetch");
          if (userDoc) {
            console.log("[AuthProvider] User doc found:", userDoc.role);
            setUser(userDoc);
          } else {
            console.log("[AuthProvider] No user doc, using fallback from Firebase Auth");
            setUser(fallbackUser);
          }
        } catch (error) {
          console.warn("[AuthProvider] User doc fetch failed/timed out, using fallback:", error);
          setUser(fallbackUser);
        }
      } else {
        console.log("[AuthProvider] No user, redirecting to /login");
        setUser(null);
        if (pathname !== "/login") {
          router.push("/login");
        }
      }
      console.timeEnd("[AuthProvider] total auth resolution");
      setLoading(false);
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
