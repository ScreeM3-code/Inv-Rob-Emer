import React, { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { usePermissions } from './hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import { toast } from '@/hooks/use-toast';
import {
  Users, UserPlus, Shield, Trash2, AlertCircle, Mail,
  Pencil, X, Check, Loader2, Plus, ShieldCheck, ChevronDown, ChevronUp
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// ── Labels lisibles pour chaque permission ───────────────────
const PERMISSION_LABELS = {
  inventaire_view:           "Voir l'inventaire",
  inventaire_create:         'Ajouter des pièces',
  inventaire_update:         'Modifier des pièces',
  inventaire_delete:         'Supprimer des pièces',
  inventaire_sortie_rapide:  'Sortie rapide',
  groupes_view:              'Voir les groupes',
  groupes_create:            'Créer des groupes',
  groupes_update:            'Modifier des groupes',
  groupes_delete:            'Supprimer des groupes',
  fournisseur_view:          'Voir les fournisseurs',
  fournisseur_create:        'Créer des fournisseurs',
  fournisseur_update:        'Modifier des fournisseurs',
  fournisseur_delete:        'Supprimer des fournisseurs',
  fabricant_view:            'Voir les fabricants',
  fabricant_create:          'Créer des fabricants',
  fabricant_update:          'Modifier des fabricants',
  fabricant_delete:          'Supprimer des fabricants',
  commandes_view:            'Voir les commandes',
  commandes_create:          'Créer des commandes',
  commandes_update:          'Modifier des commandes',
  soumissions_view:          'Voir les soumissions',
  soumissions_create:        'Créer des soumissions',
  soumissions_update:        'Modifier des soumissions',
  receptions_view:           'Voir les réceptions',
  receptions_create:         'Créer des réceptions',
  receptions_update:         'Modifier des réceptions',
  historique_view:           "Voir l'historique",
  can_delete_any:            'Supprimer (tous modules)',
  can_manage_users:          'Gérer les utilisateurs',
  can_approve_orders:        'Approuver les commandes',
  can_submit_approval:       'Soumettre pour approbation',
};

const PERMISSION_SECTIONS = [
  { label: 'Inventaire',     keys: ['inventaire_view','inventaire_create','inventaire_update','inventaire_delete','inventaire_sortie_rapide'] },
  { label: 'Groupes',        keys: ['groupes_view','groupes_create','groupes_update','groupes_delete'] },
  { label: 'Fournisseurs',   keys: ['fournisseur_view','fournisseur_create','fournisseur_update','fournisseur_delete'] },
  { label: 'Fabricants',     keys: ['fabricant_view','fabricant_create','fabricant_update','fabricant_delete'] },
  { label: 'Commandes',      keys: ['commandes_view','commandes_create','commandes_update','soumissions_view','soumissions_create','soumissions_update','receptions_view','receptions_create','receptions_update'] },
  { label: 'Historique',     keys: ['historique_view'] },
  { label: 'Administration', keys: ['can_delete_any','can_manage_users','can_approve_orders','can_submit_approval'] },
];

// ── Grille de permissions ─────────────────────────────────────
function PermissionsGrid({ permissions, onChange, readOnly = false }) {
  const [collapsed, setCollapsed] = useState({});

  function toggle(key) {
    if (readOnly) return;
    onChange({ ...permissions, [key]: !permissions[key] });
  }

  function toggleSection(section, newVal) {
    if (readOnly) return;
    const updated = { ...permissions };
    section.keys.forEach(k => { updated[k] = newVal; });
    onChange(updated);
  }

  return (
    <div className="space-y-2">
      {PERMISSION_SECTIONS.map(section => {
        const allChecked  = section.keys.every(k => permissions[k]);
        const someChecked = section.keys.some(k => permissions[k]);
        const isCollapsed = collapsed[section.label];

        return (
          <div key={section.label} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Header section */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                {!readOnly && (
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                    onChange={e => toggleSection(section, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 accent-rio-red cursor-pointer"
                  />
                )}
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{section.label}</span>
                <span className="text-xs text-gray-400">
                  ({section.keys.filter(k => permissions[k]).length}/{section.keys.length})
                </span>
              </div>
              <button onClick={() => setCollapsed(p => ({ ...p, [section.label]: !p[section.label] }))} className="text-gray-400 hover:text-gray-600">
                {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </button>
            </div>

            {!isCollapsed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                {section.keys.map(key => (
                  <label
                    key={key}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                      readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!permissions[key]}
                      onChange={() => toggle(key)}
                      disabled={readOnly}
                      className="h-4 w-4 rounded border-gray-300 accent-rio-red"
                    />
                    <span className={permissions[key] ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}>
                      {PERMISSION_LABELS[key] || key}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Carte d'un rôle ───────────────────────────────────────────
function RoleCard({ group, onSave, onDelete }) {
  const SYSTEM = ['admin', 'user', 'acheteur'];
  const isSystem = SYSTEM.includes(group.name);

  const [editing,  setEditing]  = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [perms,    setPerms]    = useState({});
  const [desc,     setDesc]     = useState('');
  const [saving,   setSaving]   = useState(false);

  const rawPerms = typeof group.permissions === 'string'
    ? JSON.parse(group.permissions)
    : group.permissions || {};
  const activeCount = Object.values(rawPerms).filter(Boolean).length;

  function startEdit() {
    setPerms({ ...rawPerms });
    setDesc(group.description || '');
    setEditing(true);
    setExpanded(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/groups/${group.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, permissions: perms })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Erreur sauvegarde');
      }
      toast({ title: '✅ Rôle mis à jour', description: group.name });
      setEditing(false);
      onSave();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={`glass-card border-0 shadow-md ${!isSystem ? 'border-l-4 border-l-rio-red/40' : ''}`}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ShieldCheck className={`h-5 w-5 shrink-0 ${isSystem ? 'text-gray-400' : 'text-rio-red'}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 dark:text-white">{group.name}</span>
                {isSystem && <Badge variant="outline" className="text-xs">Système</Badge>}
                <span className="text-xs text-gray-400">{activeCount} droit(s) actif(s)</span>
              </div>
              {group.description && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{group.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setExpanded(v => !v)} className="p-1 text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {!isSystem && !editing && (
              <>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600" onClick={startEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-600" onClick={() => onDelete(group)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {editing && (
              <>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3">
            {editing && (
              <div>
                <label className="text-xs font-medium text-gray-500">Description</label>
                <Input value={desc} onChange={e => setDesc(e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
            )}
            <PermissionsGrid
              permissions={editing ? perms : rawPerms}
              onChange={editing ? setPerms : () => {}}
              readOnly={!editing || isSystem}
            />
            {isSystem && (
              <p className="text-xs text-gray-400 text-center italic">Les groupes système ne peuvent pas être modifiés</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Formulaire nouveau rôle ───────────────────────────────────
function NewRoleForm({ onSave, onCancel }) {
  const [name,    setName]  = useState('');
  const [desc,    setDesc]  = useState('');
  const [perms,   setPerms] = useState({});
  const [saving,  setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/groups`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim().toLowerCase(), description: desc, permissions: perms })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Erreur création');
      }
      toast({ title: '✅ Rôle créé', description: name });
      onSave();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass-card border-2 border-dashed border-rio-red/30 border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4 text-rio-red" /> Nouveau rôle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Nom du rôle *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="ex: superviseur" required className="mt-1 h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Description</label>
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Courte description..." className="mt-1 h-9" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">Permissions</label>
            <PermissionsGrid permissions={perms} onChange={setPerms} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
            <Button type="submit" size="sm" className="bg-gradient-to-r from-rio-red to-red-600 dark:text-white" disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Créer le rôle
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════
export default function UsersPage() {
  const auth = useAuth();
  const { isAdmin } = usePermissions();

  const [activeTab,    setActiveTab]    = useState('users');
  const [users,        setUsers]        = useState([]);
  const [groups,       setGroups]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showNewRole,  setShowNewRole]  = useState(false);
  const [newUser,      setNewUser]      = useState({ username: '', password: '', email: '', group_id: '' });
  const [submitting,   setSubmitting]   = useState(false);
  const [editingUser,  setEditingUser]  = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [uRes, gRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/auth/users`,  { credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/auth/groups`, { credentials: 'include' }),
      ]);
      if (!uRes.ok) throw new Error('Accès refusé');
      const uData = await uRes.json();
      const gData = gRes.ok ? await gRes.json() : { groups: [] };
      setUsers(uData.users  || []);
      setGroups(gData.groups || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createUser(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedGroup = groups.find(g => g.id.toString() === newUser.group_id);
      const res = await fetch(`${BACKEND_URL}/api/auth/users`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          email:    newUser.email || null,
          role:     selectedGroup?.name || 'user',
          group_id: newUser.group_id ? parseInt(newUser.group_id) : null,
        })
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Erreur'); }
      toast({ title: '✅ Utilisateur créé', description: newUser.username });
      setNewUser({ username: '', password: '', email: '', group_id: '' });
      await load();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteUser(username) {
    if (!confirm(`Supprimer "${username}" ?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/users/${username}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Impossible de supprimer');
      toast({ title: '✅ Supprimé', description: username });
      await load();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  }

  async function saveEdit() {
    if (!editingUser) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/users/${editingUser.username}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editingUser.email || null, group_id: editingUser.group_id ? parseInt(editingUser.group_id) : null })
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Erreur'); }
      toast({ title: '✅ Mis à jour', description: editingUser.username });
      setEditingUser(null);
      await load();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  }

  async function deleteGroup(group) {
    if (!confirm(`Supprimer le rôle "${group.name}" ?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/groups/${group.id}`, { method: 'DELETE', credentials: 'include' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || 'Impossible de supprimer');
      toast({ title: '✅ Rôle supprimé', description: group.name });
      await load();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <Card className="glass-card max-w-md border-0">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
            <p className="font-semibold">Accès administrateurs seulement</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <AnimatedBackground />
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">

        {/* En-tête */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rio-red/10">
            <Shield className="h-6 w-6 text-rio-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des utilisateurs</h1>
            <p className="text-sm text-gray-500">{users.length} utilisateur(s) · {groups.length} rôle(s)</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {[
            { key: 'users', label: 'Utilisateurs',        icon: Users },
            { key: 'roles', label: 'Rôles & Permissions', icon: ShieldCheck },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        {/* ═══ ONGLET UTILISATEURS ═══ */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Utilisateurs existants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-2 font-medium text-gray-500">Utilisateur</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-500">Email</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-500">Rôle</th>
                          <th className="py-3 px-2 w-20"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => {
                          const isEditing = editingUser?.username === u.username;
                          return (
                            <tr key={u.username} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-full ${u.role === 'admin' ? 'bg-rio-red/10' : 'bg-blue-500/10'}`}>
                                    <Shield className={`h-3.5 w-3.5 ${u.role === 'admin' ? 'text-rio-red' : 'text-blue-500'}`} />
                                  </div>
                                  <span className="font-medium">{u.username}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                {isEditing ? (
                                  <Input type="email" value={editingUser.email || ''} onChange={e => setEditingUser(p => ({ ...p, email: e.target.value }))} className="h-8 text-sm w-48" placeholder="email@exemple.com" />
                                ) : (
                                  <span className="text-gray-500 text-xs flex items-center gap-1">
                                    {u.email ? <><Mail className="h-3 w-3" />{u.email}</> : <span className="italic">Non défini</span>}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-2">
                                {isEditing ? (
                                  <Select value={editingUser.group_id?.toString() || ''} onValueChange={val => setEditingUser(p => ({ ...p, group_id: val }))}>
                                    <SelectTrigger className="h-8 text-sm w-36"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                                    <SelectContent>
                                      {groups.map(g => <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge className={`text-xs ${u.role === 'admin' ? 'bg-rio-red/10 text-rio-red border-rio-red/20' : 'bg-blue-50 text-blue-700 border-blue-200'}`} variant="outline">
                                    {u.group_name || u.role}
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-1 justify-end">
                                  {isEditing ? (
                                    <>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={saveEdit}><Check className="h-3.5 w-3.5" /></Button>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400" onClick={() => setEditingUser(null)}><X className="h-3.5 w-3.5" /></Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600" onClick={() => setEditingUser({ username: u.username, email: u.email || '', group_id: u.group_id?.toString() || '' })}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      {u.username !== auth.user?.username && (
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-red-600" onClick={() => deleteUser(u.username)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Créer utilisateur */}
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" /> Créer un utilisateur</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Nom d'utilisateur *</label>
                    <Input placeholder="username" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Mot de passe *</label>
                    <Input type="password" placeholder="Minimum 8 caractères" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Email</label>
                    <Input type="email" placeholder="email@exemple.com" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Rôle</label>
                    <Select value={newUser.group_id} onValueChange={val => setNewUser({ ...newUser, group_id: val })}>
                      <SelectTrigger><SelectValue placeholder="Choisir un rôle..." /></SelectTrigger>
                      <SelectContent>
                        {groups.map(g => <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-rio-red to-red-600 dark:text-white">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                      Créer l'utilisateur
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ ONGLET RÔLES ═══ */}
        {activeTab === 'roles' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowNewRole(v => !v)} className="bg-gradient-to-r from-rio-red to-red-600 dark:text-white">
                <Plus className="h-4 w-4 mr-2" /> Nouveau rôle
              </Button>
            </div>

            {showNewRole && (
              <NewRoleForm onSave={() => { setShowNewRole(false); load(); }} onCancel={() => setShowNewRole(false)} />
            )}

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
            ) : (
              <div className="space-y-3">
                {groups.map(group => (
                  <RoleCard key={group.id} group={group} onSave={load} onDelete={deleteGroup} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
