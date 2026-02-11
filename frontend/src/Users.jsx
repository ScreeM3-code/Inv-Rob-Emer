import React, { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Shield, User, Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import { toast } from '@/hooks/use-toast';

export default function UsersPage() {
  const auth = useAuth();
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Utiliser l'URL complète du backend
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
      const res = await fetch(`${BACKEND_URL}/api/auth/users`, { 
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Accès refusé');
      }
      
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      setError(e.message);
      toast({
        title: 'Erreur',
        description: e.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createUser(e) {
    e.preventDefault();
    if (!newUser.username || !newUser.password) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
      const res = await fetch(`${BACKEND_URL}/api/auth/users`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Impossible de créer l\'utilisateur');
      }
      
      await load();
      setNewUser({ username: '', password: '', role: 'user' });
      
      toast({
        title: 'Succès',
        description: 'Utilisateur créé avec succès',
      });
    } catch (e) {
      setError(e.message);
      toast({
        title: 'Erreur',
        description: e.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteUser(username) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ?`)) {
      return;
    }

    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
      const res = await fetch(`${BACKEND_URL}/api/auth/users/${username}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Impossible de supprimer');
      }
      
      await load();
      toast({
        title: 'Succès',
        description: 'Utilisateur supprimé',
      });
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e.message,
        variant: 'destructive'
      });
    }
  }

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-rio-red" />
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <Card className="glass-card max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-rio-red" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Accès non autorisé</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Veuillez vous connecter pour accéder à cette page.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (auth.user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <Card className="glass-card max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Shield className="h-12 w-12 text-yellow-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Accès réservé aux administrateurs</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Vous n'avez pas les permissions nécessaires.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <AnimatedBackground />
      
      <div className="max-w-6xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-gradient-to-br from-rio-red to-red-600">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestion des utilisateurs</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Gérez les accès à l'application</p>
          </div>
        </div>

        {/* Liste des utilisateurs */}
        <Card className="glass-card shadow-xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Utilisateurs actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-rio-red" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Aucun utilisateur trouvé
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                        Utilisateur
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                        Rôle
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr 
                        key={u.username}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${u.role === 'admin' ? 'bg-rio-red/10' : 'bg-blue-500/10'}`}>
                              {u.role === 'admin' ? (
                                <Shield className="h-4 w-4 text-rio-red" />
                              ) : (
                                <User className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">{u.username}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            u.role === 'admin' 
                              ? 'bg-rio-red/10 text-rio-red border border-rio-red/20' 
                              : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                          }`}>
                            {u.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUser(u.username)}
                            disabled={u.username === auth.user?.username}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulaire de création */}
        <Card className="glass-card shadow-xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Créer un nouvel utilisateur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nom d'utilisateur
                  </label>
                  <Input
                    placeholder="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    disabled={submitting}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mot de passe
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    disabled={submitting}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rôle
                </label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                  disabled={submitting}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Utilisateur</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>Administrateur</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-gradient-to-r from-rio-red to-red-600 hover:from-red-600 hover:to-rio-red transition-all duration-300"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Création...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    <span>Créer l'utilisateur</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}