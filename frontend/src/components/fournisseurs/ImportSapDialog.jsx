// frontend/src/components/fournisseurs/ImportSapDialog.jsx
// Dialog pour rechercher et importer des fournisseurs depuis SAP eReq
// Usage: <ImportSapDialog onImported={() => reloadFournisseurs()} />

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Search, Download, Loader2, CheckCircle, Building2, MapPin } from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

export default function ImportSapDialog({ open, onClose, onImported }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sapSession, setSapSession] = useState(
    localStorage.getItem('sap_session_id') || ''
  );

  const search = async () => {
    if (!query.trim()) return;
    if (!sapSession.trim()) {
      toast({ title: 'Session SAP requise', description: 'Entre ton SAP_SESSIONID_FIP_500', variant: 'destructive' });
      return;
    }
    setSearching(true);
    setResults([]);
    setSelected(new Set());
    try {
      const params = new URLSearchParams({ query: query.trim(), sap_cookies: sapSession.trim() });
      const resp = await fetch(`${API_URL}/fournisseurs/sap/search?${params}`);
      if (resp.status === 401) throw new Error('Session SAP expirée — recopie le cookie');
      if (!resp.ok) throw new Error(`Erreur ${resp.status}`);
      const data = await resp.json();
      setResults(data);
      if (data.length === 0) toast({ title: 'Aucun résultat', description: 'Essaie un autre terme' });
    } catch (e) {
      toast({ title: 'Erreur recherche SAP', description: e.message, variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (numSap) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(numSap) ? next.delete(numSap) : next.add(numSap);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(results.map(r => r.NumSap)));
  const clearAll = () => setSelected(new Set());

  const importSelected = async () => {
    const toImport = results.filter(r => selected.has(r.NumSap));
    if (!toImport.length) return;
    setImporting(true);
    try {
      const resp = await fetch(`${API_URL}/fournisseurs/sap/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fournisseurs: toImport }),
      });
      if (!resp.ok) throw new Error(`Erreur ${resp.status}`);
      const result = await resp.json();
      toast({
        title: '✅ Import terminé',
        description: `${result.created} créé(s), ${result.updated} mis à jour`,
      });
      onImported?.();
      onClose();
    } catch (e) {
      toast({ title: 'Erreur import', description: e.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-orange-500">SAP</span> — Importer des fournisseurs
          </DialogTitle>
        </DialogHeader>

        {/* Session SAP */}
        <details className="text-sm border rounded p-2 bg-gray-50 dark:bg-gray-900">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700 select-none">
            🔑 Session SAP {sapSession ? '(configurée ✓)' : '(requise)'}
          </summary>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-400">
              F12 → Application → Cookies → <code>fip.remote.riotinto.com</code> → valeur de <code>SAP_SESSIONID_FIP_500</code>
            </p>
            <Input
              value={sapSession}
              onChange={e => { setSapSession(e.target.value); localStorage.setItem('sap_session_id', e.target.value); }}
              placeholder="HRqCCc0WX3gh..."
              className="font-mono text-xs h-7"
            />
          </div>
        </details>

        {/* Barre de recherche */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Nom fournisseur, numéro SAP, ville..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              className="pl-9"
            />
          </div>
          <Button onClick={search} disabled={searching || !query.trim()} className="bg-orange-500 hover:bg-orange-600 text-white">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {/* Résultats */}
        {results.length > 0 && (
          <>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{results.length} résultat(s) actif(s)</span>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-blue-500 hover:underline text-xs">Tout sélectionner</button>
                <span>·</span>
                <button onClick={clearAll} className="text-gray-400 hover:underline text-xs">Tout désélectionner</button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-1 pr-1">
              {results.map(r => (
                <div
                  key={r.NumSap}
                  onClick={() => toggleSelect(r.NumSap)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selected.has(r.NumSap)
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {/* Checkbox visuelle */}
                  <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                    selected.has(r.NumSap) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}>
                    {selected.has(r.NumSap) && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>

                  <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{r.NomFournisseur}</span>
                      {r.IsAribaVendor && (
                        <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">Ariba</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span className="font-mono"># {r.NumSap}</span>
                      {r.Ville && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {r.Ville}{r.Province && `, ${r.Province}`}
                        </span>
                      )}
                      {r.Adresse && <span className="truncate">{r.Adresse}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer import */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-gray-500">
                {selected.size} fournisseur(s) sélectionné(s)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Annuler</Button>
                <Button
                  onClick={importSelected}
                  disabled={selected.size === 0 || importing}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {importing
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Import...</>
                    : <><Download className="w-4 h-4 mr-2" />Importer {selected.size > 0 ? `(${selected.size})` : ''}</>
                  }
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
