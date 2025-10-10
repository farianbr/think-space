import React, { useEffect, useState } from "react";
import { saveAuth, getToken, getUser, clearAuth } from "../lib/auth";
import { AuthContext } from "./authContext";
import { api } from "../lib/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser());
  const [token, setToken] = useState(() => getToken());

  // try to load current user if token present
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    let mounted = true;
    // use axios api client which handles the baseURL and auth headers
    api
      .get("/auth/me")
      .then((response) => {
        if (mounted) {
          // server now returns { user }
          setUser(response.data.user);
        }
      })
      .catch((err) => {
        // invalid token or network error
        console.debug("Auth check failed:", err?.message || err);
        clearAuth();
        setToken(null);
        setUser(null);
      });
    return () => (mounted = false);
  }, [token]);

  const login = async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    const data = response.data; // expect { token, user }
    if (data.token) {
      saveAuth(data);
      setToken(data.token);
      setUser(data.user || data);
    }
    return data;
  };

  const register = async (payload) => {
    const response = await api.post("/auth/register", payload);
    const data = response.data; // expect { token, user }
    if (data.token) {
      saveAuth(data);
      setToken(data.token);
      setUser(data.user || data);
    }
    return data;
  };

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
    // Optional: hit server logout endpoint
    api
      .post("/auth/logout")
      .catch((err) => console.debug("logout request failed", err));
    // Also disconnect sockets if you use them
    import("../lib/socket")
      .then((m) => m.disconnectSocket && m.disconnectSocket())
      .catch((err) => console.debug("socket disconnect failed", err));
  };
  return (
    <AuthContext.Provider
      value={{ user, setUser, token, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// useAuth is exported from ./authContext
