import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, StarOff, Trash2, Plus, Search } from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

export default function PieceFournisseursEditor({ fournisseurs = [], allFournisseurs = [], onChange }) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [numPiece, setNumPiece] = useState('');
  const [prixUnitaire, setPrixUnitaire] = useState('');

  // Fournisseurs déjà liés (par RéfFournisseur)
  const liaisonsIds = new Set(fournisseurs.map(f => f.RéfFournisseur));

  // Fournisseurs disponibles pour ajout (non encore liés)
  const disponibles = allFournisseurs.filter(f =>
    !liaisonsIds.has(f.RéfFournisseur) &&
    (search === '' ||
      f.NomFournisseur?.toLowerCase().includes(search.toLowerCase()) ||
      f.NumSap?.toLowerCase().includes(search.toLowerCase()))
  );

  const setPrincipal = (refFournisseur) => {
    const updated = fournisseurs.map(f => ({
      ...f,
      EstPrincipal: f.RéfFournisseur === refFournisseur,
    }));
    onChange(updated);
  };

  const retirer = (refFournisseur) => {
    const updated = fournisseurs.filter(f => f.RéfFournisseur !== refFournisseur);
    // Si on retirait le principal et qu'il reste des fournisseurs, le premier devient principal
    if (updated.length > 0 && !updated.some(f => f.EstPrincipal)) {
      updated[0].EstPrincipal = true;
    }
    onChange(updated);
  };

  const ajouter = () => {
    const id = parseInt(selectedId);
    if (!id) return;
    const fourn = allFournisseurs.find(f => f.RéfFournisseur === id);
    if (!fourn) return;

    const estPremier = fournisseurs.length === 0;
    const nouveau = {
      RéfFournisseur: fourn.RéfFournisseur,
      NomFournisseur: fourn.NomFournisseur,
      NuméroTél: fourn.NuméroTél || '',
      NumSap: fourn.NumSap || '',
      EstPrincipal: estPremier, // premier ajouté = principal par défaut
      NumPièceFournisseur: numPiece,
      PrixUnitaire: parseFloat(prixUnitaire) || 0,
      DelaiLivraison: '',
    };
    onChange([...fournisseurs, nouveau]);
    setSelectedId('');
    setNumPiece('');
    setPrixUnitaire('');
    setSearch('');
  };

  return (
    <div className="space-y-3">
      {/* Liste des fournisseurs liés */}
      {fournisseurs.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Aucun fournisseur lié</p>
      ) : (
        <div className="space-y-2">
          {fournisseurs.map((f) => (
            <div
              key={f.RéfFournisseur}
              className={`flex items-center gap-3 p-2 rounded-lg border ${
                f.EstPrincipal ? 'border-blue-300 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 bg-gray-50 dark:bg-gray-800'
              }`}
            >
              {/* Bouton principal */}
              <button
                type="button"
                onClick={() => setPrincipal(f.RéfFournisseur)}
                title={f.EstPrincipal ? 'Fournisseur principal' : 'Définir comme principal'}
                className="text-yellow-500 hover:text-yellow-600 flex-shrink-0"
              >
                {f.EstPrincipal ? <Star className="w-4 h-4 fill-yellow-400" /> : <StarOff className="w-4 h-4" />}
              </button>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{f.NomFournisseur}</span>
                  {f.EstPrincipal && <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">Principal</Badge>}
                  {f.NumSap && <Badge variant="outline" className="text-xs font-mono">{f.NumSap}</Badge>}
                </div>
                <div className="flex gap-4 text-xs text-gray-500 mt-0.5">
                  {f.NumPièceFournisseur && <span>Ref: <span className="font-mono">{f.NumPièceFournisseur}</span></span>}
                  {f.PrixUnitaire > 0 && <span>{f.PrixUnitaire.toFixed(2)} $</span>}
                  {f.DelaiLivraison && <span>⏱ {f.DelaiLivraison}</span>}
                </div>
              </div>

              {/* Retirer */}
              <button
                type="button"
                onClick={() => retirer(f.RéfFournisseur)}
                className="text-red-400 hover:text-red-600 flex-shrink-0"
                title="Retirer ce fournisseur"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire d'ajout */}
      <div className="border rounded-lg p-3 space-y-2 bg-gray-50 dark:bg-gray-900">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ajouter un fournisseur</p>

        {/* Recherche + sélection */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Rechercher un fournisseur..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedId(''); }}
            className="pl-7 text-sm h-8"
          />
        </div>

        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Sélectionner..." />
          </SelectTrigger>
          <SelectContent>
            {disponibles.slice(0, 50).map(f => (
              <SelectItem key={f.RéfFournisseur} value={String(f.RéfFournisseur)}>
                {f.NomFournisseur}
                {f.NumSap && <span className="text-gray-400 ml-2 font-mono text-xs">{f.NumSap}</span>}
              </SelectItem>
            ))}
            {disponibles.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">Aucun résultat</div>
            )}
          </SelectContent>
        </Select>

        {/* Champs optionnels */}
        {selectedId && (
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Réf. pièce chez ce fourn."
                value={numPiece}
                onChange={(e) => setNumPiece(e.target.value)}
                className="text-sm h-8"
              />
            </div>
            <div className="w-28">
              <Input
                placeholder="Prix $"
                type="number"
                step="0.01"
                value={prixUnitaire}
                onChange={(e) => setPrixUnitaire(e.target.value)}
                className="text-sm h-8"
              />
            </div>
          </div>
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={ajouter}
          disabled={!selectedId}
          className="w-full h-8 text-sm"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Ajouter
        </Button>
      </div>
    </div>
  );
}
