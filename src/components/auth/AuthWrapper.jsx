"use client";

import { AuthProvider } from "@/lib/auth";

/**
 * Client wrapper bọc AuthProvider cho root layout (vốn là Server Component).
 * @param {{ children: React.ReactNode }} props
 */
export default function AuthWrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}