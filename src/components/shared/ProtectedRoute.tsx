// src/components/shared/ProtectedRoute.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import type { UserRole } from "@/lib/types";

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles = [] }: Props) {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
    router.push("/dashboard");
    return null;
  }

  return <>{children}</>;
}