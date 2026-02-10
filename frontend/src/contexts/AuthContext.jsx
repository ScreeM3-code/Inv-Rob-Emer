import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
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

  useEffect(() => {
    fetchMe();
  }, []);

  async function login(username, password) {
    console.log('[AuthContext] Attempting login:', username);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    console.log('[AuthContext] Login response status:', res.status);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('[AuthContext] Login error:', errorData);
      throw new Error(errorData.detail || 'Login failed');
    }
    
    const data = await res.json();
    console.log('[AuthContext] Login successful, user:', data.user);
    // cookie HttpOnly already set by backend; update user state
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }

  const value = { user, loading, login, logout, refresh: fetchMe };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
