import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Lock, User, AlertCircle } from 'lucide-react';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

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
      await auth.login(username, password);
      navigate('/inventaire');
    } catch (err) {
      setError(err.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AnimatedBackground />
      
      <Card className="w-full max-w-md glass-card shadow-2xl border-0">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-rio-red to-red-600">
              <Package className="h-12 w-12 text-white" />
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
              Inventaire Robots
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Système de gestion de pièces
            </p>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  disabled={loading}
                  className="pl-10 h-11 bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mot de passe
                </label>

              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  disabled={loading}
                  className="pl-10 h-11 bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600"
                />
              </div>
            </div>
            
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              </div>
            )}
              <Link
                  to="/forgot-password"
                  className="flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-rio-red to-red-600 text-black border-gray-300 dark:border-gray-600 dark:text-white hover:from-red-600 hover:to-rio-red transition-all duration-300 shadow-lg hover:shadow-xl" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-gray rounded-full animate-spin" />
                  <span>Connexion...</span>
                </div>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
