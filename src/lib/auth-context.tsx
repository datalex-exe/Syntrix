"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClerkProvider, useUser, useClerk } from "@clerk/nextjs";

export interface UnifiedUser {
  id: string;
  email: string;
}

export interface UnifiedAuthContextType {
  user: UnifiedUser | null;
  isSignedIn: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType>({
  user: null,
  isSignedIn: false,
  isLoading: true,
  signOut: async () => {},
  refresh: async () => {},
});

export const useAppAuth = () => useContext(UnifiedAuthContext);

const isClerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Clerk Bridge Component
function ClerkBridge({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const router = useRouter();

  const user: UnifiedUser | null = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || "",
  } : null;

  const signOut = async () => {
    await clerkSignOut();
    router.push("/login");
  };

  return (
    <UnifiedAuthContext.Provider
      value={{
        user,
        isSignedIn: !!clerkUser,
        isLoading: !isLoaded,
        signOut,
        refresh: async () => {},
      }}
    >
      {children}
    </UnifiedAuthContext.Provider>
  );
}

// Local Mock Auth Provider
function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const signOut = async () => {
    setIsLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setIsLoading(false);
    router.push("/login");
  };

  return (
    <UnifiedAuthContext.Provider
      value={{
        user,
        isSignedIn: !!user,
        isLoading,
        signOut,
        refresh: fetchUser,
      }}
    >
      {children}
    </UnifiedAuthContext.Provider>
  );
}

export function AppAuthProvider({ children }: { children: React.ReactNode }) {
  if (isClerkEnabled) {
    return (
      <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
        <ClerkBridge>{children}</ClerkBridge>
      </ClerkProvider>
    );
  }

  return <MockAuthProvider>{children}</MockAuthProvider>;
}
