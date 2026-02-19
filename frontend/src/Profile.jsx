// frontend/src/Profile.jsx
import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Mail, Save, CheckCircle, AlertCircle, Loader2, ShoppingCart, ClipboardCheck, XCircle, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { useAuth } from './contexts/AuthContext';
import { usePermissions } from './hooks/usePermissions';


const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const NOTIF_OPTIONS = [
  {
    key: 'pieces_a_commander',
    label: 'Pièces à commander',
    description: 'Quand une pièce atteint son seuil minimum et doit être commandée.',
    icon: ShoppingCart,
    color: 'text-orange-500',
  },
  {
    key: 'demande_approbation',
    label: 'Demande d\'approbation',
    description: 'Quand une pièce est soumise pour approbation (admins).',
    icon: ClipboardCheck,
    color: 'text-yellow-500',
    adminOnly: true,
  },
  {
    key: 'approbation_accordee',
    label: 'Approbation accordée',
    description: 'Quand une de vos pièces est approuvée.',
    icon: CheckCircle,
    color: 'text-green-500',
  },
  {
    key: 'approbation_refusee',
    label: 'Approbation refusée',
    description: 'Quand une de vos pièces est refusée.',
    icon: XCircle,
    color: 'text-red-500',
  },
  {
    key: 'piece_commandee',
    label: 'Commande passée',
    description: 'Quand une pièce est commandée dans le système.',
    icon: Package,
    color: 'text-blue-500',
  },
];

export default function Profile() {
  const auth = useAuth();
  const { isAdmin } = usePermissions();

  const [email, setEmail]         = useState('');
  const [prefs, setPrefs]         = useState({});
  const [hasEmail, setHasEmail]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [testSending, setTestSending] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me/notification-prefs`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Erreur chargement');
      const data = await res.json();
      setEmail(data.email || '');
      setPrefs(data.prefs || {});
      setHasEmail(data.has_email);
    } catch (e) {
      toast({ title: 'Erreur', description: 'Impossible de charger vos préférences.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function saveEmail(e) {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me/email`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error('Erreur');
      setHasEmail(!!email);
      toast({ title: '✅ Email sauvegardé', description: `Votre email a été mis à jour.` });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder l\'email.', variant: 'destructive' });
    } finally {
      setSavingEmail(false);
    }
  }

  async function savePrefs() {
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me/notification-prefs`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs)
      });
      if (!res.ok) throw new Error('Erreur');
      toast({ title: '✅ Préférences sauvegardées', description: 'Vos préférences de notification ont été mises à jour.' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function sendTestEmail() {
    setTestSending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/test-email`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur');
      toast({
        title: '✅ Email de test envoyé',
        description: `Vérifiez la boîte de ${email}. Si rien n'arrive dans 2 min, consultez les logs backend.`
      });
    } catch (e) {
      toast({ title: '❌ Échec', description: e.message, variant: 'destructive' });
    } finally {
      setTestSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const visibleOptions = NOTIF_OPTIONS.filter(o => !o.adminOnly || isAdmin);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <Toaster />
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mon profil</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez votre email et vos préférences de notification.</p>
      </div>

      {/* ── Email ── */}
      <Card className="glass-card border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" />
            Adresse email
          </CardTitle>
          <CardDescription>
            Utilisée pour recevoir les notifications et réinitialiser votre mot de passe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveEmail} className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="flex-1"
            />
            <Button type="submit" disabled={savingEmail} className="shrink-0">
              {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Sauvegarder
            </Button>
          </form>

          {!hasEmail && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 text-sm text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Sans email, vous ne recevrez aucune notification. Ajoutez-en un pour activer les alertes.</span>
            </div>
          )}

          {/* Bouton test email (admin seulement) */}
          {isAdmin && hasEmail && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-2">Zone admin — diagnostiquer la configuration SMTP</p>
              <Button
                variant="outline"
                size="sm"
                onClick={sendTestEmail}
                disabled={testSending}
              >
                {testSending
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Envoi...</>
                  : <><Mail className="h-3.5 w-3.5 mr-1" /> Envoyer un email de test</>
                }
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Préférences notifications ── */}
      <Card className="glass-card border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-orange-500" />
            Notifications par email
          </CardTitle>
          <CardDescription>
            Choisissez quels événements déclenchent un email.
            {!hasEmail && <span className="text-yellow-600 ml-1">⚠️ Ajoutez un email pour activer.</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {visibleOptions.map(option => {
            const Icon = option.icon;
            const enabled = prefs[option.key] ?? (option.key === 'piece_commandee' ? false : true);
            return (
              <div
                key={option.key}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  enabled
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${option.color}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{option.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  disabled={!hasEmail}
                  onCheckedChange={val =>
                    setPrefs(prev => ({ ...prev, [option.key]: val }))
                  }
                />
              </div>
            );
          })}

          <div className="pt-2">
            <Button
              onClick={savePrefs}
              disabled={saving || !hasEmail}
              className="w-full bg-rio-red hover:bg-red-700 dark:text-white"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sauvegarde...</>
                : <><Save className="h-4 w-4 mr-2" /> Sauvegarder mes préférences</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Infos compte ── */}
      <Card className="glass-card border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informations du compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>Nom d'utilisateur</span>
            <span className="font-medium text-gray-900 dark:text-white">{auth.user?.username}</span>
          </div>
          <div className="flex justify-between">
            <span>Rôle</span>
            <span className="font-medium text-gray-900 dark:text-white capitalize">{auth.user?.role}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
