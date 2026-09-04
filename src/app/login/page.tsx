"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppAuth } from "@/lib/auth-context";
import { SignIn } from "@clerk/nextjs";

const isClerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function LoginPage() {
  const { isSignedIn, isLoading, refresh } = useAppAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Redirect to dashboard if logged in
  useEffect(() => {
    if (!isLoading && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (isClerkEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
        <SignIn routing="hash" signUpUrl="/register" forceRedirectUrl="/dashboard" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      await refresh();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-tr from-black via-zinc-950 to-zinc-900">
      <div className="w-full max-w-md space-y-8 glass-panel p-8 rounded-xl shadow-2xl border border-zinc-800/80 transition-all-300">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-zinc-100">
            Sign in to <span className="text-primary">Syntrix</span>
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Or{" "}
            <Link href="/register" className="font-medium text-primary hover:text-indigo-400">
              create a new account
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-500/50 text-red-200 text-sm rounded-md p-3">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md px-3 py-2 bg-zinc-900/60 border border-zinc-700 text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md px-3 py-2 bg-zinc-900/60 border border-zinc-700 text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all-300 shadow-lg shadow-indigo-600/20"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </div>


        </form>
      </div>
    </div>
  );
}
