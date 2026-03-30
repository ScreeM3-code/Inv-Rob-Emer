import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { usePermissions } from './hooks/usePermissions';
import { fetchJson } from './lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import {
  Bug, RefreshCw, Trash2, Edit, Save, X, ChevronDown, ChevronRight,
  Send, Copy, CheckCircle, AlertCircle, Loader2, Search, Eye, Code,
  Database, Users, Package, Building2, History, ShoppingCart, Shield
} from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL + '/api';

// ── Utilitaire: copier dans le presse-papiers ──────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-2 text-gray-400 hover:text-gray-600 transition"
      title="Copier"
    >
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Visionneur JSON collapsible ────────────────────────────────
function JsonViewer({ data, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(depth > 1);
  if (data === null || data === undefined) return <span className="text-gray-400">null</span>;
  if (typeof data === 'boolean') return <span className="text-purple-500">{String(data)}</span>;
  if (typeof data === 'number') return <span className="text-blue-500">{data}</span>;
  if (typeof data === 'string') return <span className="text-green-600">"{data}"</span>;
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-gray-400">[]</span>;
    return (
      <span>
        <button onClick={() => setCollapsed(v => !v)} className="text-yellow-600 font-bold hover:underline">
          {collapsed ? '▶' : '▼'} [{data.length}]
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-gray-200 pl-2">
            {data.map((item, i) => (
              <div key={i} className="my-0.5">
                <span className="text-gray-400 text-xs">{i}: </span>
                <JsonViewer data={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span className="text-gray-400">{'{}'}</span>;
    return (
      <span>
        <button onClick={() => setCollapsed(v => !v)} className="text-orange-500 font-bold hover:underline">
          {collapsed ? '▶' : '▼'} {'{'}…{'}'}
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-gray-200 pl-2">
            {keys.map(k => (
              <div key={k} className="my-0.5">
                <span className="text-red-500 text-xs font-mono">{k}</span>
                <span className="text-gray-400">: </span>
                <JsonViewer data={data[k]} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }
  return <span>{String(data)}</span>;
}

// ── Ligne éditable d'une entité ────────────────────────────────
function EntityRow({ item, idField, nameField, endpoint, onRefresh, extraFields = [] }) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const id = item[idField];
  const name = item[nameField] || `#${id}`;

  async function handleSave() {
    setLoading(true);
    try {
      await fetchJson(`${API}/${endpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      toast({ title: '✅ Sauvegardé', description: name });
      setEditing(false);
      onRefresh();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${name}" ? Cette action est irréversible.`)) return;
    setLoading(true);
    try {
      await fetchJson(`${API}/${endpoint}/${id}`, { method: 'DELETE' });
      toast({ title: '🗑️ Supprimé', description: name });
      onRefresh();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50">
        <button onClick={() => setExpanded(v => !v)} className="text-gray-400">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <span className="font-mono text-xs text-gray-500 w-10 shrink-0">#{id}</span>
        <span className="flex-1 font-medium text-sm truncate">{name}</span>
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
            onClick={() => { setFormData({...item}); setEditing(v => !v); setExpanded(true); }}>
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
            onClick={handleDelete} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          {editing ? (
            <div className="space-y-2">
              {Object.entries(formData).filter(([k]) => k !== idField).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <label className="text-xs font-mono text-gray-500 w-40 shrink-0">{k}</label>
                  <Input
                    value={v ?? ''}
                    onChange={e => setFormData(p => ({...p, [k]: e.target.value}))}
                    className="h-7 text-xs font-mono"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={loading}>
                  <Save className="w-3 h-3 mr-1" /> Sauvegarder
                </Button>
                <Button size="sm" variant="outline" className="h-7" onClick={() => setEditing(false)}>
                  <X className="w-3 h-3 mr-1" /> Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div className="font-mono text-xs">
              <JsonViewer data={item} depth={1} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Onglet entité générique ────────────────────────────────────
function EntityTab({ endpoint, idField, nameField, label, icon: Icon }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list'); // list | raw

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJson(`${API}/${endpoint}`);
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      toast({ title: 'Erreur chargement', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const filtered = data.filter(item => {
    if (!search) return true;
    return JSON.stringify(item).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher dans les données..." className="pl-7 h-8 text-sm" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={view === 'list' ? 'default' : 'outline'} className="h-8" onClick={() => setView('list')}>
            <Eye className="w-3.5 h-3.5 mr-1" /> Liste
          </Button>
          <Button size="sm" variant={view === 'raw' ? 'default' : 'outline'} className="h-8" onClick={() => setView('raw')}>
            <Code className="w-3.5 h-3.5 mr-1" /> JSON brut
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <Badge variant="outline" className="text-xs">{filtered.length} / {data.length}</Badge>
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}

      {!loading && view === 'raw' && (
        <div className="bg-gray-950 text-green-400 rounded-lg p-4 font-mono text-xs max-h-[60vh] overflow-auto">
          <div className="flex justify-end mb-2">
            <CopyBtn text={JSON.stringify(filtered, null, 2)} />
          </div>
          <pre>{JSON.stringify(filtered, null, 2)}</pre>
        </div>
      )}

      {!loading && view === 'list' && (
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {filtered.length === 0
            ? <p className="text-center py-8 text-gray-400">Aucun élément</p>
            : filtered.map((item, i) => (
                <EntityRow
                  key={item[idField] ?? i}
                  item={item}
                  idField={idField}
                  nameField={nameField}
                  endpoint={endpoint}
                  onRefresh={load}
                />
              ))
          }
        </div>
      )}
    </div>
  );
}

// ── Testeur d'API ──────────────────────────────────────────────
function ApiTester() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('/api/pieces');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(null);

  const QUICK_ROUTES = [
    { label: 'GET pieces', method: 'GET', url: '/api/pieces' },
    { label: 'GET fournisseurs', method: 'GET', url: '/api/fournisseurs' },
    { label: 'GET fabricants', method: 'GET', url: '/api/fabricant' },
    { label: 'GET stats', method: 'GET', url: '/api/stats' },
    { label: 'GET historique', method: 'GET', url: '/api/historique' },
    { label: 'GET commandes', method: 'GET', url: '/api/commande' },
    { label: 'GET groupes', method: 'GET', url: '/api/groupes' },
    { label: 'GET soumissions', method: 'GET', url: '/api/soumissions' },
    { label: 'GET users', method: 'GET', url: '/api/auth/users' },
    { label: 'GET me', method: 'GET', url: '/api/auth/me' },
    { label: 'GET departements', method: 'GET', url: '/api/departements' },
    { label: 'GET toorders', method: 'GET', url: '/api/toorders' },
  ];

  async function send() {
    setLoading(true);
    setResponse(null);
    const start = Date.now();
    try {
      const token = localStorage.getItem('access_token');
      const opts = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body && method !== 'GET' ? { body } : {})
      };
      const res = await fetch(import.meta.env.VITE_BACKEND_URL + url, opts);
      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = text; }
      setElapsed(Date.now() - start);
      setResponse({ status: res.status, ok: res.ok, data: parsed });
    } catch (e) {
      setElapsed(Date.now() - start);
      setResponse({ status: 0, ok: false, data: e.message });
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      {/* Routes rapides */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Routes rapides</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ROUTES.map(r => (
            <button key={r.url}
              onClick={() => { setMethod(r.method); setUrl(r.url); setBody(''); }}
              className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 font-mono transition">
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Constructeur de requête */}
      <div className="flex gap-2">
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-24 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['GET','POST','PUT','PATCH','DELETE'].map(m => (
              <SelectItem key={m} value={m}><span className={
                m === 'GET' ? 'text-green-600' : m === 'DELETE' ? 'text-red-600' :
                m === 'POST' ? 'text-blue-600' : 'text-orange-600'
              }>{m}</span></SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={url} onChange={e => setUrl(e.target.value)}
          className="flex-1 h-9 font-mono text-sm" placeholder="/api/..." />
        <Button onClick={send} disabled={loading} className="h-9 bg-blue-600 hover:bg-blue-700">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {method !== 'GET' && (
        <Textarea value={body} onChange={e => setBody(e.target.value)}
          placeholder='{"key": "value"}' rows={4}
          className="font-mono text-xs" />
      )}

      {/* Réponse */}
      {response && (
        <div className={`rounded-lg border-2 ${response.ok ? 'border-green-400' : 'border-red-400'} overflow-hidden`}>
          <div className={`flex items-center gap-3 px-4 py-2 ${response.ok ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            {response.ok
              ? <CheckCircle className="w-4 h-4 text-green-600" />
              : <AlertCircle className="w-4 h-4 text-red-600" />}
            <Badge className={response.ok ? 'bg-green-600' : 'bg-red-600'}>{response.status}</Badge>
            <span className="text-xs text-gray-500">{elapsed}ms</span>
            <div className="ml-auto">
              <CopyBtn text={JSON.stringify(response.data, null, 2)} />
            </div>
          </div>
          <div className="p-4 bg-gray-950 font-mono text-xs text-green-400 max-h-80 overflow-auto">
            <pre>{JSON.stringify(response.data, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Onglet Auth/Session ────────────────────────────────────────
function AuthTab() {
  const auth = useAuth();
  const { permissions, role } = usePermissions();
  const [tokenDecoded, setTokenDecoded] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setTokenDecoded(payload);
      } catch { setTokenDecoded(null); }
    }
  }, []);

  const token = localStorage.getItem('access_token');

  return (
    <div className="space-y-4">
      {/* Infos utilisateur */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Utilisateur connecté</CardTitle></CardHeader>
        <CardContent className="font-mono text-xs space-y-1">
          <div><span className="text-gray-500">username: </span><span className="text-green-600">{auth.user?.username}</span></div>
          <div><span className="text-gray-500">role: </span><span className="text-blue-600">{auth.user?.role}</span></div>
          <div><span className="text-gray-500">group: </span><span className="text-purple-600">{auth.user?.group}</span></div>
        </CardContent>
      </Card>

      {/* Token JWT */}
      {token && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Token JWT</CardTitle>
              <CopyBtn text={token} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 rounded p-2 break-all text-gray-500 mb-3">
              {token.substring(0, 60)}…
            </div>
            {tokenDecoded && (
              <div className="space-y-1 font-mono text-xs">
                {Object.entries(tokenDecoded).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-red-500">{k}</span>
                    <span className="text-gray-400">: </span>
                    <span className="text-green-600">
                      {k === 'exp' || k === 'iat'
                        ? `${new Date(v * 1000).toLocaleString('fr-CA')} (${k === 'exp' ? 'expire' : 'émis'})`
                        : JSON.stringify(v)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Permissions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Permissions ({Object.values(permissions).filter(Boolean).length} actives)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(permissions).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs">
                <div className={`w-2 h-2 rounded-full ${v ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={`font-mono ${v ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>{k}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Env vars */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Variables d'environnement (frontend)</CardTitle></CardHeader>
        <CardContent className="font-mono text-xs space-y-1">
          <div><span className="text-gray-500">VITE_BACKEND_URL: </span><span className="text-green-600">{import.meta.env.VITE_BACKEND_URL || '(vide)'}</span></div>
          <div><span className="text-gray-500">MODE: </span><span className="text-blue-600">{import.meta.env.MODE}</span></div>
          <div><span className="text-gray-500">window.location.origin: </span><span className="text-purple-600">{window.location.origin}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────
const TABS = [
  { key: 'api',          label: 'Testeur API',    icon: Send,        component: ApiTester },
  { key: 'auth',         label: 'Auth / Session', icon: Shield,      component: AuthTab },
  { key: 'pieces',       label: 'Pièces',         icon: Package,     component: () => <EntityTab endpoint="pieces" idField="RéfPièce" nameField="NomPièce" label="Pièces" icon={Package} /> },
  { key: 'fournisseurs', label: 'Fournisseurs',   icon: Building2,   component: () => <EntityTab endpoint="fournisseurs" idField="RéfFournisseur" nameField="NomFournisseur" label="Fournisseurs" icon={Building2} /> },
  { key: 'fabricants',   label: 'Fabricants',     icon: Database,    component: () => <EntityTab endpoint="fabricant" idField="RefFabricant" nameField="NomFabricant" label="Fabricants" icon={Database} /> },
  { key: 'commandes',    label: 'Commandes',      icon: ShoppingCart,component: () => <EntityTab endpoint="commande" idField="RéfPièce" nameField="NomPièce" label="Commandes" icon={ShoppingCart} /> },
  { key: 'historique',   label: 'Historique',     icon: History,     component: () => <EntityTab endpoint="historique" idField="id" nameField="nompiece" label="Historique" icon={History} /> },
  { key: 'groupes',      label: 'Groupes',        icon: Database,    component: () => <EntityTab endpoint="groupes" idField="RefGroupe" nameField="NomGroupe" label="Groupes" icon={Database} /> },
];

export default function DebugPage() {
  const [activeTab, setActiveTab] = useState('api');
  const { can } = usePermissions();

  if (!can('debug_access')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <Card className="glass-card max-w-md border-0">
          <CardContent className="pt-6 text-center">
            <Bug className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">Accès refusé</p>
            <p className="text-sm text-gray-400 mt-1">La permission <code className="font-mono">debug_access</code> est requise.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ActiveComponent = TABS.find(t => t.key === activeTab)?.component;

  return (
    <div className="min-h-screen p-4 md:p-6">
      <AnimatedBackground />
      <Toaster />
      <div className="max-w-6xl mx-auto relative z-10 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10">
            <Bug className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Debug Center</h1>
            <p className="text-sm text-gray-500">Accès direct aux données — modifications en temps réel</p>
          </div>
          <div className="ml-auto">
            <Badge className="bg-red-500 text-white animate-pulse">⚠ Mode Debug</Badge>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Contenu de l'onglet actif */}
        <Card className="glass-card border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {(() => { const t = TABS.find(t => t.key === activeTab); const Icon = t?.icon; return Icon ? <Icon className="h-4 w-4" /> : null; })()}
              {TABS.find(t => t.key === activeTab)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ActiveComponent && <ActiveComponent />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}