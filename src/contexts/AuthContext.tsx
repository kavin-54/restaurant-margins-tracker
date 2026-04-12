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
    let timeout: NodeJS.Timeout;

    // Safety timeout — if Firebase Auth doesn't respond in 1 second, stop loading
    timeout = setTimeout(() => {
      setLoading(false);
    }, 1000);

    const unsubscribe = onAuthChange(async (firebaseUser: User | null) => {
      clearTimeout(timeout);

      if (firebaseUser) {
        try {
          const userDoc = await getDocument<AppUser>("users", firebaseUser.uid);
          if (userDoc) {
            setUser(userDoc);
          } else {
            // Fallback if user document doesn't exist yet
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "",
              role: "admin",
            });
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          // Still set user from Firebase Auth data so they're not blocked
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "",
            role: "admin",
          });
        }
      } else {
        setUser(null);
        if (pathname !== "/login") {
          router.push("/login");
        }
      }
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

  // Show loading spinner briefly, then render children
  if (loading) {
    return (
      <AuthContext.Provider value={value}>
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="h-8 w-8 mx-auto mb-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading...</p>
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
