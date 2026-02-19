import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Erreur lors de la demande');
      }
      setSent(true);
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
              Mot de passe oublié
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Entrez votre adresse email pour recevoir un lien de réinitialisation
            </p>
          </div>
        </CardHeader>

        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Email envoyé !</p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Si un compte est associé à <strong>{email}</strong>, vous recevrez un lien sous peu. Vérifiez aussi vos courriers indésirables.
                  </p>
                </div>
              </div>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la connexion
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    disabled={loading}
                    required
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

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-rio-red to-red-600 dark:text-white hover:from-red-600 hover:to-rio-red transition-all duration-300 shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-gray rounded-full animate-spin" />
                    <span>Envoi en cours...</span>
                  </div>
                ) : (
                  'Envoyer le lien'
                )}
              </Button>

              <Link to="/login" className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                <ArrowLeft className="h-3 w-3" />
                Retour à la connexion
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
