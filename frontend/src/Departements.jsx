import React, { useEffect, useState } from 'react';
import { fetchJson } from './lib/utils';
import { usePermissions } from './hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, Building2 } from 'lucide-react';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

const COULEURS_PRESET = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#84cc16',
];

const EMPTY_DEPT = { NomDepartement: '', Description: '', Couleur: '#6366f1' };

export default function Departements() {
  const { isAdmin } = usePermissions();
  const navigate    = useNavigate();
  const [depts,    setDepts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [dialog,   setDialog]   = useState({ open: false, data: null });
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (!isAdmin) navigate('/inventaire');
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchJson(`${API}/departements`);
      setDepts(data || []);
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!dialog.data?.NomDepartement?.trim()) {
      toast({ title: 'Validation', description: 'Le nom est obligatoire', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!dialog.data.RefDepartement;
      const url    = isEdit ? `${API}/departements/${dialog.data.RefDepartement}` : `${API}/departements`;
      await fetchJson(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          NomDepartement: dialog.data.NomDepartement.trim(),
          Description:    dialog.data.Description   || '',
          Couleur:        dialog.data.Couleur        || '#6366f1',
        })
      });
      toast({ title: isEdit ? 'Département modifié' : 'Département créé' });
      setDialog({ open: false, data: null });
      load();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer ce département ? Les pièces associées perdront leur département.')) return;
    try {
      await fetchJson(`${API}/departements/${id}`, { method: 'DELETE' });
      toast({ title: 'Département supprimé' });
      load();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <AnimatedBackground />
      <div className="max-w-3xl mx-auto space-y-6 relative z-10">

        {/* En-tête */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Building2 className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Départements</h1>
              <p className="text-sm text-gray-500">{depts.length} département{depts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button
            onClick={() => setDialog({ open: true, data: { ...EMPTY_DEPT } })}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau département
          </Button>
        </div>

        {/* Liste */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-base">Liste des départements</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : depts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Building2 className="mx-auto h-10 w-10 mb-3 opacity-30" />
                <p>Aucun département. Créez-en un pour commencer.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {depts.map(d => (
                  <div
                    key={d.RefDepartement}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-gray-800 hover:shadow-sm transition-shadow"
                  >
                    {/* Couleur */}
                    <div
                      className="w-4 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: d.Couleur || '#6366f1' }}
                    />

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">{d.NomDepartement}</p>
                      {d.Description && (
                        <p className="text-xs text-gray-500 truncate">{d.Description}</p>
                      )}
                    </div>

                    {/* Badge couleur hex */}
                    <Badge variant="outline" className="font-mono text-xs hidden sm:flex">
                      {d.Couleur}
                    </Badge>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setDialog({ open: true, data: { ...d } })}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(d.RefDepartement)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog création / édition */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && setDialog({ open: false, data: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog.data?.RefDepartement ? 'Modifier le département' : 'Nouveau département'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Nom *</Label>
              <Input
                value={dialog.data?.NomDepartement || ''}
                onChange={e => setDialog(d => ({ ...d, data: { ...d.data, NomDepartement: e.target.value } }))}
                placeholder="Ex: Électrique, Mécanique..."
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={dialog.data?.Description || ''}
                onChange={e => setDialog(d => ({ ...d, data: { ...d.data, Description: e.target.value } }))}
                placeholder="Description optionnelle"
              />
            </div>

            <div>
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COULEURS_PRESET.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDialog(d => ({ ...d, data: { ...d.data, Couleur: c } }))}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                      dialog.data?.Couleur === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                {/* Couleur personnalisée */}
                <input
                  type="color"
                  value={dialog.data?.Couleur || '#6366f1'}
                  onChange={e => setDialog(d => ({ ...d, data: { ...d.data, Couleur: e.target.value } }))}
                  className="w-8 h-8 rounded-full cursor-pointer border-0 p-0"
                  title="Couleur personnalisée"
                />
              </div>
              {/* Aperçu */}
              <div className="mt-3">
                <Badge
                  className="text-white"
                  style={{ backgroundColor: dialog.data?.Couleur || '#6366f1' }}
                >
                  🏢 {dialog.data?.NomDepartement || 'Aperçu'}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, data: null })}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !dialog.data?.NomDepartement?.trim()}
              style={{ backgroundColor: dialog.data?.Couleur || '#6366f1' }}
              className="text-white hover:opacity-90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {dialog.data?.RefDepartement ? 'Sauvegarder' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
