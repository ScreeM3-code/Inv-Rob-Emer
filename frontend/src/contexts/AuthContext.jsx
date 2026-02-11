import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

// Construire l'URL de base pour l'API
const getApiBase = () => {
  // En production, utiliser VITE_BACKEND_URL si disponible
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  // En dev, utiliser le proxy (/ redirige vers le backend)
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
    const res = await fetch(`${API_BASE}/api/auth/login`, {
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
    
    // Stocker le token aussi en localStorage comme fallback pour les requêtes cross-origin
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
    }
    
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
    // Helper pour obtenir le token (cookie ou localStorage)
    getToken: () => localStorage.getItem('access_token')
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
