import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Trash2, Edit, Layers, FolderTree, Package, 
  ChevronDown, ChevronRight, Loader2 
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

export default function Groupes() {
  const [categories, setCategories] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
        fetch(`${API}/groupes/categories`).then(r => r.json()),
        fetch(`${API}/groupes`).then(r => r.json()),
        fetch(`${API}/pieces`).then(r => r.json())
      ]);
      
      setCategories(categoriesRes || []);
      setGroupes(groupesRes || []);
      setPieces(piecesRes || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  // ======== CATÉGORIES ========
  
  const handleSaveCategorie = async () => {
    try {
      const url = categorieDialog.data?.RefCategorie
        ? `${API}/groupes/categories/${categorieDialog.data.RefCategorie}`
        : `${API}/groupes/categories`;
      
      const method = categorieDialog.data?.RefCategorie ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          NomCategorie: categorieDialog.data.NomCategorie,
          Description: categorieDialog.data.Description || ''
        })
      });
      
      if (!response.ok) throw new Error('Erreur sauvegarde');
      
      setCategorieDialog({ open: false, data: null });
      await loadData();
    } catch (error) {
      console.error('Erreur sauvegarde catégorie:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handleDeleteCategorie = async (id) => {
    if (!window.confirm('Supprimer cette catégorie et tous ses groupes ?')) return;
    
    try {
      await fetch(`${API}/groupes/categories/${id}`, { method: 'DELETE' });
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
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RefCategorie: parseInt(groupeDialog.data.RefCategorie),
          NomGroupe: groupeDialog.data.NomGroupe,
          Description: groupeDialog.data.Description || ''
        })
      });
      
      if (!response.ok) throw new Error('Erreur sauvegarde');
      
      setGroupeDialog({ open: false, data: null });
      await loadData();
    } catch (error) {
      console.error('Erreur sauvegarde groupe:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handleDeleteGroupe = async (id) => {
    if (!window.confirm('Supprimer ce groupe ?')) return;
    
    try {
      await fetch(`${API}/groupes/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  // ======== PIÈCES DANS GROUPE ========
  
  const handleAddPieceToGroupe = async () => {
    try {
      const response = await fetch(`${API}/groupes/pieces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RefGroupe: pieceDialog.groupeId,
          RéfPièce: parseInt(pieceDialog.selectedPiece),
          Quantite: parseInt(pieceDialog.quantite) || 1
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erreur ajout');
      }
      
      setPieceDialog({ open: false, groupeId: null, selectedPiece: null, quantite: 1 });
      await loadData();
    } catch (error) {
      console.error('Erreur ajout pièce:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const handleRemovePieceFromGroupe = async (pieceGroupeId) => {
    if (!window.confirm('Retirer cette pièce du groupe ?')) return;
    
    try {
      await fetch(`${API}/groupes/pieces/${pieceGroupeId}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error('Erreur suppression pièce:', error);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <FolderTree className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Groupes de Pièces</h1>
              <p className="text-sm text-gray-600">Organisez vos pièces par entretiens et opérations</p>
            </div>
          </div>
          
          <Button 
            onClick={() => setCategorieDialog({ open: true, data: { NomCategorie: '', Description: '' } })}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Catégorie
          </Button>
        </div>

        {/* Arborescence */}
        <Card>
          <CardHeader>
            <CardTitle>Arborescence des groupes</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FolderTree className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p>Aucune catégorie. Créez-en une pour commencer.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map(categorie => {
                  const isExpanded = expandedCategories.has(categorie.RefCategorie);
                  const categorieGroupes = groupes.filter(g => g.RefCategorie === categorie.RefCategorie);
                  
                  return (
                    <div key={categorie.RefCategorie} className="border rounded-lg p-4 bg-white">
                      {/* En-tête catégorie */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1">
                          <button 
                            onClick={() => toggleCategory(categorie.RefCategorie)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                          </button>
                          <Layers className="h-5 w-5 text-blue-600" />
                          <div>
                            <h3 className="font-semibold text-lg">{categorie.NomCategorie}</h3>
                            {categorie.Description && (
                              <p className="text-sm text-gray-500">{categorie.Description}</p>
                            )}
                          </div>
                          <Badge variant="outline">{categorieGroupes.length} groupe(s)</Badge>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setGroupeDialog({ 
                              open: true, 
                              data: { RefCategorie: categorie.RefCategorie, NomGroupe: '', Description: '' }
                            })}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Groupe
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCategorieDialog({ open: true, data: categorie })}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCategorie(categorie.RefCategorie)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Groupes de la catégorie */}
                      {isExpanded && (
                        <div className="ml-8 mt-4 space-y-3">
                          {categorieGroupes.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">Aucun groupe dans cette catégorie</p>
                          ) : (
                            categorieGroupes.map(groupe => (
                              <div key={groupe.RefGroupe} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Package className="h-4 w-4 text-blue-600" />
                                      <h4 className="font-medium">{groupe.NomGroupe}</h4>
                                      <Badge className="bg-green-500 text-white">
                                        {groupe.pieces?.length || 0} pièce(s)
                                      </Badge>
                                    </div>
                                    {groupe.Description && (
                                      <p className="text-sm text-gray-600 mb-2">{groupe.Description}</p>
                                    )}
                                    
                                    {/* Liste des pièces */}
                                    {groupe.pieces && groupe.pieces.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {groupe.pieces.map(gp => (
                                          <div key={gp.id} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                                            <span>
                                              {gp.piece_info?.NomPièce || 'Pièce inconnue'} 
                                              <span className="text-gray-500 ml-2">
                                                (Qté: {gp.Quantite})
                                              </span>
                                            </span>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => handleRemovePieceFromGroupe(gp.id)}
                                            >
                                              <Trash2 className="h-3 w-3 text-red-500" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex space-x-2 ml-4">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setPieceDialog({ 
                                        open: true, 
                                        groupeId: groupe.RefGroupe,
                                        selectedPiece: null,
                                        quantite: 1
                                      })}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Pièce
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setGroupeDialog({ open: true, data: groupe })}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteGroupe(groupe.RefGroupe)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
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
                  onValueChange={v => setGroupeDialog({
                    ...groupeDialog,
                    data: { ...groupeDialog.data, RefCategorie: parseInt(v) }
                  })}
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