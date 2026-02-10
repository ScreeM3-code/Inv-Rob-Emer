import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      console.log('[Login] Submitting form with username:', username);
      await auth.login(username, password);
      console.log('[Login] Login successful, navigating to inventaire');
      navigate('/inventaire');
    } catch (err) {
      console.error('[Login] Error:', err);
      setError(err.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Inventaire Robots</CardTitle>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">Connexion</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom d'utilisateur</label>
              <Input 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                placeholder="admin"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mot de passe</label>
              <Input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              Demo: admin / admin123 ou user / user123
            </p>
           </form>
        </CardContent>
      </Card>
    </div>
  );
}
