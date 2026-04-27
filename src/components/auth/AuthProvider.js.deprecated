"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthChange } from "@/lib/firebase/auth";

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook truy cập auth state từ bất kỳ component nào trong cây
 */
export function useAuth() {
  return useContext(AuthContext);
}