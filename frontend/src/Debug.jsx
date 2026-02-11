// Debug.jsx - Composant pour tester l'authentification
import React, { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DebugAuth() {
  const auth = useAuth();
  const [meResult, setMeResult] = useState(null);
  const [usersResult, setUsersResult] = useState(null);

  const testMe = async () => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await res.json();
      setMeResult({ status: res.status, data });
    } catch (error) {
      setMeResult({ error: error.message });
    }
  };

  const testUsers = async () => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/users`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await res.json();
      setUsersResult({ status: res.status, data });
    } catch (error) {
      setUsersResult({ error: error.message });
    }
  };

  const checkCookies = () => {
    console.log('📦 Cookies:', document.cookie);
    console.log('🔑 LocalStorage token:', localStorage.getItem('access_token'));
  };

  return (
    <div className="p-8 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Debug Authentification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-bold">État Auth Context:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify({ 
                user: auth.user, 
                loading: auth.loading 
              }, null, 2)}
            </pre>
          </div>

          <div className="flex gap-2">
            <Button onClick={testMe}>Test /api/auth/me</Button>
            <Button onClick={testUsers}>Test /api/auth/users</Button>
            <Button onClick={checkCookies}>Check Cookies</Button>
          </div>

          {meResult && (
            <div>
              <h3 className="font-bold">Résultat /me:</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(meResult, null, 2)}
              </pre>
            </div>
          )}

          {usersResult && (
            <div>
              <h3 className="font-bold">Résultat /users:</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(usersResult, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <h3 className="font-bold">Variables d'environnement:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs">
              VITE_BACKEND_URL: {import.meta.env.VITE_BACKEND_URL || '(vide)'}
            </pre>
          </div>

          <div>
            <h3 className="font-bold">URL actuelles:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs">
              Origin: {window.location.origin}
              {'\n'}Backend: {import.meta.env.VITE_BACKEND_URL || 'proxy local'}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}