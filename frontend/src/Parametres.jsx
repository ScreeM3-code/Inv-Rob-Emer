import React, { useEffect, useState } from 'react';
import { useSettings } from './contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Mail, Settings2, CheckCircle2, FileText, Box, Layers, Barcode, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

export default function Parametres() {
  const { settings, loading: settingsLoading, refresh, setSettings } = useSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        ...settings,
        features: { ...settings.features }
      });
    }
  }, [settings]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateFeature = (feature, value) => {
    setForm(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: value,
      }
    }));
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/parametres`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Erreur sauvegarde paramètres');
      }
      const data = await response.json();
      setSettings(data);
      toast({ title: '✅ Paramètres sauvegardés', description: 'Les paramètres ont bien été enregistrés.' });
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    setTesting(true);
    try {
      const response = await fetch(`${API_BASE}/api/parametres/test-email`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Erreur lors du test SMTP');
      toast({ title: '✅ Test email envoyé', description: data.msg });
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  if (settingsLoading || !form) {
    return (
      <div className="flex items-center justify-center h-72">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configurez le site, la numérotation des bons de commande, le SMTP et les fonctionnalités activées.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving} className="bg-rio-red hover:bg-red-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />} 
            Enregistrer
          </Button>
          <Button variant="outline" onClick={testEmail} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />} Tester SMTP
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Général</CardTitle>
            <CardDescription>Nom du site et libellé des pièces.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nom du site</Label>
              <Input value={form.site_name || ''} onChange={e => updateField('site_name', e.target.value)} />
            </div>
            <div>
              <Label>Description Site</Label>
              <Input value={form.site_description || ''} onChange={e => updateField('site_description', e.target.value)} placeholder="Ex: Système de maintenance" />
            </div>
            <div>
              <Label>Libellé des pièces</Label>
              <Input value={form.piece_label || ''} onChange={e => updateField('piece_label', e.target.value)} placeholder="Ex: EPP, Items" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Bons de commande</CardTitle>
            <CardDescription>Format et numérotation des bons de commande.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Préfixe BC</Label>
              <Input value={form.bc_prefix || ''} onChange={e => updateField('bc_prefix', e.target.value)} />
            </div>
            <div>
              <Label>Format du numéro</Label>
              <Input value={form.bc_format || ''} onChange={e => updateField('bc_format', e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">Utilisez <code className="rounded bg-slate-100 px-1 py-0.5">{'{PREFIX}'}</code>, <code className="rounded bg-slate-100 px-1 py-0.5">{'{YEAR}'}</code> et <code className="rounded bg-slate-100 px-1 py-0.5">{'{SEQUENCE:04d}'}</code>.</p>
            </div>
            <div>
              <Label>Prochaine séquence</Label>
              <Input type="number" value={form.bc_next_sequence} onChange={e => updateField('bc_next_sequence', Number(e.target.value) || 1)} min="1" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Serveur SMTP</CardTitle>
            <CardDescription>Paramètres email stockés en base pour les notifications et le test SMTP.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Hôte SMTP</Label>
              <Input value={form.email_host || ''} onChange={e => updateField('email_host', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Port</Label>
                <Input type="number" value={form.email_port || 587} onChange={e => updateField('email_port', Number(e.target.value) || 587)} />
              </div>
              <div>
                <Label>Adresse expéditeur</Label>
                <Input value={form.email_from || ''} onChange={e => updateField('email_from', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Utilisateur SMTP</Label>
              <Input value={form.email_user || ''} onChange={e => updateField('email_user', e.target.value)} />
            </div>
            <div>
              <Label>Mot de passe SMTP</Label>
              <Input type="password" value={form.email_password || ''} onChange={e => updateField('email_password', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between gap-4">
                <Label>STARTTLS</Label>
                <Switch checked={form.email_tls} onCheckedChange={val => updateField('email_tls', val)} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label>SSL direct</Label>
                <Switch checked={form.email_ssl} onCheckedChange={val => updateField('email_ssl', val)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Fonctionnalités actives</CardTitle>
            <CardDescription>Activez ou désactivez les modules affichés dans l'interface.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'bon_de_commande', label: 'Bons de commande', icon: FileText },
              { key: 'ereq_sap', label: 'eReq / SAP fournisseur', icon: Box },
              { key: 'approbation', label: 'Approbation', icon: CheckCircle2 },
              { key: 'code_barre', label: 'Code barre', icon: Barcode },
              { key: 'groupes', label: 'Groupes', icon: Layers },
              { key: 'export_excel', label: 'Export Excel', icon: DollarSign },
            ].map(feature => (
              <div key={feature.key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <feature.icon className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{feature.label}</p>
                  </div>
                </div>
                <Switch checked={form.features?.[feature.key] ?? false} onCheckedChange={val => updateFeature(feature.key, val)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
