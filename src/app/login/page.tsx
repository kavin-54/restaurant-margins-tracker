"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/firebase/auth";
import { addDocument } from "@/lib/firebase/firestore";

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
    <div className="relative min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 overflow-hidden">
      {/* Decorative blur circles */}
      <div className="fixed -bottom-32 -left-32 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
      <div className="fixed -top-32 -right-32 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />

      <div
        className="relative z-10 w-full max-w-md rounded-xl border border-gray-200/15 px-8 py-10"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0px 10px 40px rgba(45,51,53,0.06)",
        }}
      >
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/10">
          <span className="material-symbols-outlined text-blue-700" style={{ fontSize: 32 }}>
            restaurant
          </span>
        </div>

        {/* Title */}
        <h1 className="text-center text-3xl font-extrabold tracking-tight text-gray-900">
          HFS Catering
        </h1>
        <p className="mt-1 text-center text-base font-medium text-gray-500">
          {isSignUp ? "Create your account" : "Sign in to your account"}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {isSignUp && (
            <div className="space-y-1.5">
              <label
                htmlFor="displayName"
                className="block text-sm font-semibold tracking-tight text-gray-500"
              >
                Your Name
              </label>
              <input
                id="displayName"
                type="text"
                placeholder="e.g. Kavin"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
                className="block w-full h-12 rounded-lg border-none bg-gray-50 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-semibold tracking-tight text-gray-500"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus={!isSignUp}
              className="block w-full h-12 rounded-lg border-none bg-gray-50 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-semibold tracking-tight text-gray-500"
              >
                Password
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  className="text-xs font-bold text-blue-700 hover:text-blue-800"
                >
                  Forgot?
                </button>
              )}
            </div>
            <input
              id="password"
              type="password"
              placeholder={isSignUp ? "At least 6 characters" : "Enter your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full h-12 rounded-lg border-none bg-gray-50 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-900 text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>
                progress_activity
              </span>
            ) : null}
            {loading
              ? isSignUp
                ? "Creating account..."
                : "Signing in..."
              : isSignUp
                ? "Create Account"
                : "Sign In"}
            {!loading && (
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                arrow_forward
              </span>
            )}
          </button>
        </form>

        {/* Toggle sign-in / sign-up */}
        <p className="mt-6 text-center text-sm text-gray-500">
          {isSignUp ? "Already have an account? " : "Don\u2019t have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="font-bold text-blue-700 hover:text-blue-800"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>

        {/* System status badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          <span>System Online</span>
          <span className="text-gray-300">|</span>
          <span>v2.4.0</span>
        </div>
      </div>
    </div>
  );
}
