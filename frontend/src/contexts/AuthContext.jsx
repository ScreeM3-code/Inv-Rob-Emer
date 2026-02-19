import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

const getApiBase = () => {
  if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
  return '';
};
const API_BASE = getApiBase();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        // data.user contient maintenant username, role, group, permissions
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('[AuthContext] fetchMe error:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMe(); }, []);

  async function login(username, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Login failed');
    }

    const data = await res.json();

    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
    }

    // data.user contient username, role, group, permissions
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    localStorage.removeItem('access_token');
    setUser(null);
  }

  const value = {
    user,
    loading,
    login,
    logout,
    refresh: fetchMe,
    getToken: () => localStorage.getItem('access_token'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}