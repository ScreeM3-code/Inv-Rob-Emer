import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  // Token manquant dans l'URL
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <AnimatedBackground />
        <Card className="w-full max-w-md glass-card shadow-2xl border-0">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="font-medium text-gray-800 dark:text-white">Lien invalide</p>
              <p className="text-sm text-gray-500">Ce lien de réinitialisation est manquant ou corrompu.</p>
              <Link to="/login">
                <Button variant="outline" className="mt-2">Retour à la connexion</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (newPassword !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Erreur lors de la réinitialisation');
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
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
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Nouveau mot de passe
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Choisissez un mot de passe d'au moins 8 caractères
            </p>
          </div>
        </CardHeader>

        <CardContent>
          {done ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Mot de passe mis à jour !</p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Vous allez être redirigé vers la connexion dans quelques secondes...
                  </p>
                </div>
              </div>
              <Link to="/login">
                <Button variant="outline" className="w-full">Aller à la connexion</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="pl-10 pr-10 h-11 bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    disabled={loading}
                    required
                    className="pl-10 h-11 bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>

              {/* Indicateur de force du mot de passe */}
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          newPassword.length >= i * 3
                            ? newPassword.length >= 12 ? 'bg-green-500'
                              : newPassword.length >= 8 ? 'bg-yellow-500'
                              : 'bg-red-400'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {newPassword.length < 8 ? 'Trop court' : newPassword.length < 12 ? 'Acceptable' : 'Fort'}
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-rio-red to-red-600 dark:text-white hover:from-red-600 hover:to-rio-red transition-all duration-300 shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-gray rounded-full animate-spin" />
                    <span>Mise à jour...</span>
                  </div>
                ) : (
                  'Enregistrer le nouveau mot de passe'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
