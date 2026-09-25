import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("lms-token"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("lms-user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    apiRequest("/auth/me")
      .then((data) => {
        setUser(data);
        localStorage.setItem("lms-user", JSON.stringify(data));
      })
      .catch(() => {
        localStorage.removeItem("lms-token");
        localStorage.removeItem("lms-user");
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      async login(identifier, password) {
        const data = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({ identifier, password })
        });
        localStorage.setItem("lms-token", data.token);
        localStorage.setItem("lms-user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data.user;
      },
      logout() {
        localStorage.removeItem("lms-token");
        localStorage.removeItem("lms-user");
        setToken(null);
        setUser(null);
      },
      refreshUser: async () => {
        const data = await apiRequest("/auth/me");
        localStorage.setItem("lms-user", JSON.stringify(data));
        setUser(data);
        return data;
      }
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

