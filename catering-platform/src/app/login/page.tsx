"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { signIn, signUp } from "@/lib/firebase/auth";
import { addDocument } from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/config";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        const result = await signUp(email, password);
        // Create user document in Firestore with admin role (first user)
        await addDocument("users", {
          uid: result.user.uid,
          email: result.user.email,
          displayName: displayName || email.split("@")[0],
          role: "admin",
          createdAt: new Date(),
          lastLogin: new Date(),
        });
      } else {
        await signIn(email, password);
      }
      router.push("/");
    } catch (err: any) {
      if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password");
      } else if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Try signing in.");
      } else if (err.code === "auth/weak-password") {
        setError("Password must be at least 6 characters");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">HFS Catering</h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Your Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="e.g. Kavin"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={!isSignUp}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={isSignUp ? "At least 6 characters" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                isSignUp ? "Create Account" : "Sign In"
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Create one"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
