import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import GroupeCard from '@/components/groupes/GroupeCard';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  Plus, Trash2, Edit, Layers, FolderTree, Package, 
  ChevronDown, ChevronRight, Loader2 
} from 'lucide-react';
import { fetchJson } from './lib/utils';
import { toast } from '@/hooks/use-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

export default function Groupes() {
  const [categories, setCategories] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const { can, isAdmin } = usePermissions();
  
  // États pour les dialogs
  const [categorieDialog, setCategorieDialog] = useState({ open: false, data: null });
  const [groupeDialog, setGroupeDialog] = useState({ open: false, data: null });
  const [pieceDialog, setPieceDialog] = useState({ open: false, groupeId: null });
  
  // État pour l'arborescence
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, groupesRes, piecesRes] = await Promise.all([
        fetchJson(`${API}/groupes/categories`),
        fetchJson(`${API}/groupes`),
        fetchJson(`${API}/pieces`)
      ]);
      // Normaliser les IDs en nombres pour éviter les problèmes de comparaison (string vs number)
      const normCategories = (categoriesRes || []).map(c => ({
        ...c,
        RefCategorie: c.RefCategorie != null ? Number(c.RefCategorie) : c.RefCategorie
      }));

      const normGroupes = (groupesRes || []).map(g => ({
        ...g,
        RefGroupe: g.RefGroupe != null ? Number(g.RefGroupe) : g.RefGroupe,
          RefCategorie: g.RefCategorie != null ? Number(g.RefCategorie) : g.RefCategorie,
        pieces: (g.pieces || []).map(p => ({
          ...p,
          id: p.id != null ? Number(p.id) : p.id,
          RefGroupe: p.RefGroupe != null ? Number(p.RefGroupe) : p.RefGroupe,
          RéfPièce: p.RéfPièce != null ? Number(p.RéfPièce) : p.RéfPièce,
          Quantite: p.Quantite != null ? Number(p.Quantite) : p.Quantite
        }))
      }));

      const normPieces = (piecesRes || []).map(p => ({
        ...p,
        RéfPièce: p.RéfPièce != null ? Number(p.RéfPièce) : p.RéfPièce
      }));

      setCategories(normCategories);
      setGroupes(normGroupes);
      setPieces(normPieces);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshGroupe = async (groupeId) => {
    try {
      const updatedGroupe = await fetchJson(`${API}/groupes/${groupeId}`);
      
      // Mettre à jour uniquement ce groupe dans la liste
      setGroupes(prevGroupes => 
        prevGroupes.map(g => 
          g.RefGroupe === groupeId ? updatedGroupe : g
        )
      );
    } catch (error) {
      console.error('Erreur refresh groupe:', error);
    }
  };

  // ======== CATÉGORIES ========
  
  const handleSaveCategorie = async () => {
    try {
      const url = categorieDialog.data?.RefCategorie
        ? `${API}/groupes/categories/${categorieDialog.data.RefCategorie}`
        : `${API}/groupes/categories`;
      
      const method = categorieDialog.data?.RefCategorie ? 'PUT' : 'POST';
      
      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          NomCategorie: categorieDialog.data.NomCategorie,
          Description: categorieDialog.data.Description || ''
        })
      });
      
      setCategorieDialog({ open: false, data: null });
      await loadData();
    } catch (error) {
      console.error('Erreur sauvegarde catégorie:', error);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteCategorie = async (id) => {
    if (!window.confirm('Supprimer cette catégorie et tous ses groupes ?')) return;
    
    try {
  await fetchJson(`${API}/groupes/categories/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  // ======== GROUPES ========
  
  const handleSaveGroupe = async () => {
    try {
      const url = groupeDialog.data?.RefGroupe
        ? `${API}/groupes/${groupeDialog.data.RefGroupe}`
        : `${API}/groupes`;
      
      const method = groupeDialog.data?.RefGroupe ? 'PUT' : 'POST';
      
      const refCat = parseInt(groupeDialog.data.RefCategorie, 10);
      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RefCategorie: isNaN(refCat) ? groupeDialog.data.RefCategorie : refCat,
          NomGroupe: groupeDialog.data.NomGroupe,
          Description: groupeDialog.data.Description || ''
        })
      });
      
      setGroupeDialog({ open: false, data: null });
      await loadData();
    } catch (error) {
      console.error('Erreur sauvegarde groupe:', error);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteGroupe = async (id) => {
    if (!window.confirm('Supprimer ce groupe ?')) return;
    
    try {
  await fetchJson(`${API}/groupes/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  // ======== PIÈCES DANS GROUPE ========
  
    const handleRemovePieceFromGroupe = async (pieceGroupeId) => {
    if (!window.confirm('Retirer cette pièce du groupe ?')) return;
    
    try {
  await fetchJson(`${API}/groupes/pieces/${pieceGroupeId}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error('Erreur suppression pièce:', error);
    }
  };

  const handleAddPieceToGroupe = async () => {
    try {
      const refPiece = parseInt(pieceDialog.selectedPiece, 10);
      const quant = parseInt(pieceDialog.quantite, 10);
      await fetchJson(`${API}/groupes/pieces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RefGroupe: pieceDialog.groupeId,
          RéfPièce: isNaN(refPiece) ? pieceDialog.selectedPiece : refPiece,
          Quantite: isNaN(quant) ? 1 : quant
        })
      });
      
      setPieceDialog({ open: false, groupeId: null, selectedPiece: null, quantite: 1 });
      await loadData();
    } catch (error) {
      console.error('Erreur ajout pièce:', error);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const handleSortirPieces = async (sorties) => {
    try {
      // 1. Récupérer l'utilisateur
  const userData = await fetchJson(`${API}/current-user`);
  const userName = userData.user || "Système";

      // 2. Pour chaque pièce, faire la sortie
      for (const sortie of sorties) {
        const { piece, quantite } = sortie;
        
        // Mise à jour du stock
        await fetchJson(`${API}/pieces/${piece.RéfPièce}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            QtéenInventaire: piece.QtéenInventaire - quantite
          })
        });

        // Ajout dans l'historique
        await fetchJson(`${API}/historique`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Opération: "Sortie",
            QtéSortie: quantite.toString(),
            RéfPièce: piece.RéfPièce,
            nompiece: piece.NomPièce,
            numpiece: piece.NumPièce,
            User: userName,
            DateRecu: new Date().toISOString(),
            description: piece.DescriptionPièce || ""
          })
        });
      }

      toast({ title: 'Sortie', description: 'Sortie effectuée avec succès !' });
      await loadData();
    } catch (error) {
      console.error('Erreur sortie pièces:', error);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  // ======== UI HELPERS ========
  
  const toggleCategory = (catId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(catId)) {
      newExpanded.delete(catId);
    } else {
      newExpanded.add(catId);
    }
    setExpandedCategories(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-white" />
      </div>
    );
  }

return (
  <div className="min-h-screen">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-3 md:gap-0">
        <div className="flex items-center space-x-3 md:space-x-4">
          <FolderTree className="h-6 w-6 md:h-8 md:w-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Groupes de Pièces</h1>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Organisez vos pièces par entretiens</p>
          </div>
        </div>
        
        {can('groupes_create') && <Button 
          onClick={() => setCategorieDialog({ open: true, data: { NomCategorie: '', Description: '' } })}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 w-full md:w-auto h-9 md:h-10 text-sm"
        >
          <Plus className="h-3 w-3 md:h-4 md:w-4 mr-2" />
          <span className="hidden sm:inline">Nouvelle Catégorie</span>
          <span className="sm:hidden">Catégorie</span>
        </Button>}
      </div>

      {/* Arborescence */}
      <Card className="glass-card border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">Arborescence des groupes</CardTitle>
        </CardHeader>
        <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FolderTree className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p>Aucune catégorie. Créez-en une pour commencer.</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {categories.map(categorie => {
                  const isExpanded = expandedCategories.has(categorie.RefCategorie);
                  const categorieGroupes = groupes.filter(g => g.RefCategorie === categorie.RefCategorie);
                  
                  return (
                    <div key={categorie.RefCategorie} className="border-2 rounded-lg overflow-hidden shadow-sm">
                      {/* En-tête catégorie */}
                      <div 
                        className="flex items-center justify-between p-3 md:p-4 from-slate-50 to-blue-50 cursor-pointer hover:from-slate-100 hover:to-blue-100 transition-colors"
                        onClick={() => toggleCategory(categorie.RefCategorie)}
                      >
                        <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                          <button 
                            className="p-1 rounded transition-colors flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory(categorie.RefCategorie);
                            }}
                          >
                            {isExpanded ? 
                              <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-blue-600" /> : 
                              <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                            }
                          </button>
                          <Layers className="h-5 w-5 md:h-6 md:w-6 text-blue-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-base md:text-lg text-slate-900 dark:text-white truncate">
                              {categorie.NomCategorie}
                            </h3>
                            {categorie.Description && (
                              <p className="text-xs md:text-sm text-slate-600 dark:text-white truncate">
                                {categorie.Description}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-white text-black text-xs flex-shrink-0">
                            {categorieGroupes.length}
                          </Badge>
                        </div>
                        
                        <div className="flex space-x-1 md:space-x-2 ml-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setGroupeDialog({ 
                              open: true, 
                              data: { RefCategorie: categorie.RefCategorie, NomGroupe: '', Description: '' }
                            })}
                            className="bg-white hover:bg-blue-50 text-black h-8 px-2 md:px-3 text-xs"
                          >
                            <Plus className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                            <span className="hidden md:inline">Groupe</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCategorieDialog({ open: true, data: categorie })}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCategorie(categorie.RefCategorie)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Groupes - padding réduit sur mobile */}
                      {isExpanded && (
                        <div className="p-2 md:p-4 space-y-2 md:space-y-3">
                          {categorieGroupes.length === 0 ? (
                            <div className="text-center py-6 md:py-8 text-slate-500 rounded-lg border-2 border-dashed">
                              <Package className="mx-auto h-6 w-6 md:h-8 md:w-8 text-slate-300 mb-2" />
                              <p className="text-xs md:text-sm">Aucun groupe dans cette catégorie</p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setGroupeDialog({ 
                                  open: true, 
                                  data: { RefCategorie: categorie.RefCategorie, NomGroupe: '', Description: '' }
                                })}
                                className="mt-3 h-8 text-xs"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Créer le premier groupe
                              </Button>
                            </div>
                          ) : (
                            categorieGroupes.map(groupe => (
                              <div key={groupe.RefGroupe} className="ml-2 md:ml-4 border-l-4 border-blue-200 pl-2 md:pl-4 dark:border-blue-800">
                                <GroupeCard
                                  groupe={groupe}
                                  pieces={pieces}
                                  onEdit={() => setGroupeDialog({ open: true, data: groupe })}
                                  onDelete={handleDeleteGroupe}
                                  onSortirPieces={handleSortirPieces}
                                  onAddPiece={() => setPieceDialog({ 
                                    open: true, 
                                    groupeId: groupe.RefGroupe,
                                    selectedPiece: null,
                                    quantite: 1 
                                  })}
                                  onRemovePiece={handleRemovePieceFromGroupe}
                                  onRefresh={() => refreshGroupe(groupe.RefGroupe)}
                                />
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog Catégorie */}
        <Dialog open={categorieDialog.open} onOpenChange={() => setCategorieDialog({ open: false, data: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {categorieDialog.data?.RefCategorie ? 'Modifier' : 'Nouvelle'} Catégorie
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom de la catégorie *</Label>
                <Input
                  value={categorieDialog.data?.NomCategorie || ''}
                  onChange={e => setCategorieDialog({
                    ...categorieDialog,
                    data: { ...categorieDialog.data, NomCategorie: e.target.value }
                  })}
                  placeholder="Ex: Broyeur à Mâchoire"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={categorieDialog.data?.Description || ''}
                  onChange={e => setCategorieDialog({
                    ...categorieDialog,
                    data: { ...categorieDialog.data, Description: e.target.value }
                  })}
                  placeholder="Description optionnelle"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCategorieDialog({ open: false, data: null })}>
                Annuler
              </Button>
              <Button 
                onClick={handleSaveCategorie}
                disabled={!categorieDialog.data?.NomCategorie}
              >
                Sauvegarder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Groupe */}
        <Dialog open={groupeDialog.open} onOpenChange={() => setGroupeDialog({ open: false, data: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {groupeDialog.data?.RefGroupe ? 'Modifier' : 'Nouveau'} Groupe
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Catégorie *</Label>
                <Select
                  value={groupeDialog.data?.RefCategorie?.toString() || ''}
                  onValueChange={v => {
                    const n = parseInt(v, 10);
                    setGroupeDialog({
                      ...groupeDialog,
                      data: { ...groupeDialog.data, RefCategorie: isNaN(n) ? null : n }
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.RefCategorie} value={c.RefCategorie.toString()}>
                        {c.NomCategorie}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nom du groupe *</Label>
                <Input
                  value={groupeDialog.data?.NomGroupe || ''}
                  onChange={e => setGroupeDialog({
                    ...groupeDialog,
                    data: { ...groupeDialog.data, NomGroupe: e.target.value }
                  })}
                  placeholder="Ex: Remontage Broyeur à Mâchoire"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={groupeDialog.data?.Description || ''}
                  onChange={e => setGroupeDialog({
                    ...groupeDialog,
                    data: { ...groupeDialog.data, Description: e.target.value }
                  })}
                  placeholder="Description de l'opération"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGroupeDialog({ open: false, data: null })}>
                Annuler
              </Button>
              <Button 
                onClick={handleSaveGroupe}
                disabled={!groupeDialog.data?.NomGroupe || !groupeDialog.data?.RefCategorie}
              >
                Sauvegarder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Ajout Pièce */}
        <Dialog open={pieceDialog.open} onOpenChange={() => setPieceDialog({ open: false, groupeId: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une pièce au groupe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Pièce *</Label>
                <Select
                  value={pieceDialog.selectedPiece?.toString() || ''}
                  onValueChange={v => setPieceDialog({ ...pieceDialog, selectedPiece: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une pièce" />
                  </SelectTrigger>
                  <SelectContent>
                    {pieces.map(p => (
                      <SelectItem key={p.RéfPièce} value={p.RéfPièce.toString()}>
                        {p.NomPièce} ({p.NumPièce})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantité nécessaire</Label>
                <Input
                  type="number"
                  min="1"
                  value={pieceDialog.quantite || 1}
                  onChange={e => setPieceDialog({ ...pieceDialog, quantite: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPieceDialog({ open: false, groupeId: null })}>
                Annuler
              </Button>
              <Button 
                onClick={handleAddPieceToGroupe}
                disabled={!pieceDialog.selectedPiece}
              >
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}