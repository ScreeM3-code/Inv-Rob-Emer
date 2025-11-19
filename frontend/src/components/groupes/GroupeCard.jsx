import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, AlertTriangle, CheckCircle, Edit, Trash2, Minus, X, ChevronDown, ChevronRight, Save, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from '@/hooks/use-toast';

const API = import.meta.env.VITE_BACKEND_URL + '/api';

export default function GroupeCard({ groupe, pieces, onEdit, onDelete, onSortirPieces, onAddPiece, onRemovePiece, onRefresh, showAddPieceButton = true }) {
  const [quantities, setQuantities] = useState({});
  const [expanded, setExpanded] = useState(false);
  const [editingQty, setEditingQty] = useState(null); // ID de la pièce en cours d'édition
  const [tempQty, setTempQty] = useState(''); // Quantité temporaire pendant l'édition
  
  React.useEffect(() => {
    const initial = {};
    groupe.pieces?.forEach(gp => {
      initial[gp.RéfPièce] = gp.Quantite;
    });
    setQuantities(initial);
  }, [groupe.pieces]);

  const getPieceStatus = (groupePiece) => {
    const piece = pieces.find(p => p.RéfPièce === groupePiece.RéfPièce);
    if (!piece) return { available: false, piece: null };
    
    const required = groupePiece.Quantite;
    const inStock = piece.QtéenInventaire;
    
    return {
      available: inStock >= required,
      piece,
      required,
      inStock
    };
  };

  const canPerformSortie = groupe.pieces?.some(gp => {
    const status = getPieceStatus(gp);
    const qtyToRemove = (quantities[gp.RéfPièce] !== undefined) ? quantities[gp.RéfPièce] : gp.Quantite;
    return status.piece && status.inStock >= qtyToRemove && qtyToRemove > 0;
  });

  const allQuantitiesValid = groupe.pieces?.every(gp => {
    const status = getPieceStatus(gp);
    const qtyToRemove = (quantities[gp.RéfPièce] !== undefined) ? quantities[gp.RéfPièce] : gp.Quantite;
    return qtyToRemove <= (status.inStock || 0);
  });

  const handleSortir = () => {
    if (!allQuantitiesValid) {
      toast({ title: 'Quantités invalides', description: "Certaines quantités demandées dépassent le stock disponible!", variant: 'destructive' });
      return;
    }

    const sorties = groupe.pieces
      .filter(gp => {
        const qtyToRemove = (quantities[gp.RéfPièce] !== undefined) ? quantities[gp.RéfPièce] : gp.Quantite;
        return qtyToRemove > 0;
      })
      .map(gp => {
        const piece = pieces.find(p => p.RéfPièce === gp.RéfPièce);
        return {
          piece,
          quantite: (quantities[gp.RéfPièce] !== undefined) ? quantities[gp.RéfPièce] : gp.Quantite
        };
      });

    if (sorties.length === 0) {
      toast({ title: 'Aucune sortie', description: "Aucune pièce à sortir!" });
      return;
    }

    onSortirPieces(sorties);
  };

  const handleQuantityChange = (pieceId, value) => {
    const parsed = parseInt(value, 10);
    const numValue = isNaN(parsed) ? 0 : parsed;
    const piece = pieces.find(p => p.RéfPièce === pieceId);
    const maxStock = piece?.QtéenInventaire || 0;
    
    const validValue = Math.min(Math.max(0, numValue), maxStock);
    
    setQuantities(prev => ({
      ...prev,
      [pieceId]: validValue
    }));
  };

  // Nouvelle fonction : sauvegarder la quantité requise modifiée
  const handleSaveRequiredQty = async (groupePieceId) => {
    try {
      const newQty = parseInt(tempQty, 10);
      if (isNaN(newQty) || newQty < 1) {
        toast({ title: 'Quantité invalide', description: 'Quantité invalide', variant: 'destructive' });
        return;
      }

      await fetch(`${API}/groupes/pieces/${groupePieceId}?quantite=${newQty}`, {
        method: 'PUT'
      });

      setEditingQty(null);
      setTempQty('');
      onRefresh?.(); // Recharger les données
    } catch (error) {
      console.error('Erreur mise à jour quantité:', error);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  // Nouvelle fonction : déplacer une pièce
  const handleMovepiece = async (groupePieceId, direction) => {
    try {
      const currentIndex = groupe.pieces.findIndex(gp => gp.id === groupePieceId);
      const newIndex = direction === 'up' ? currentIndex : currentIndex + 2; // +2 car 1-based
      
      if (newIndex < 1 || newIndex > groupe.pieces.length) return;

      await fetch(`${API}/groupes/pieces/${groupePieceId}/ordre?nouvel_ordre=${newIndex}`, {
        method: 'PUT'
      });

      onRefresh?.(); // Recharger pour voir le changement
    } catch (error) {
      console.error('Erreur déplacement:', error);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="p-1 rounded"
              onClick={() => setExpanded(prev => !prev)}
              aria-label={expanded ? 'Masquer les pièces' : 'Afficher les pièces'}
            >
              {expanded ? (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )}
            </button>
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg cursor-pointer" onClick={() => setExpanded(prev => !prev)}>
                  {groupe.NomGroupe}
                </CardTitle>
                <Badge className="bg-white text-slate-600 text-sm px-2 py-0.5">
                  {groupe.pieces ? groupe.pieces.length : 0} pièce{(groupe.pieces?.length || 0) > 1 ? 's' : ''}
                </Badge>
              </div>
              {groupe.Description && (
                <p className="text-sm text-slate-600 mt-1">{groupe.Description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {allQuantitiesValid ? (
              canPerformSortie ? (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Prêt
                </Badge>
              ) : (
                <Badge className="bg-yellow-500 text-white">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Stock insuffisant
                </Badge>
              )
            ) : (
              <Badge className="bg-red-500 text-white">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Quantités invalides
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {expanded && (
          <div className="space-y-3">
            {groupe.pieces?.map((gp, index) => {
              const status = getPieceStatus(gp);
              const piece = status.piece;
              const isEditing = editingQty === gp.id;

              return (
                <div 
                  key={gp.id ?? `${groupe.RefGroupe}-${gp.RéfPièce}`} 
                  className={`p-3 rounded-lg border-2 ${
                    status.available 
                      ? 'border-green-200 bg-green-50 dark:bg-green-700/100' 
                      : 'border-red-200 bg-red-50 dark:bg-red-700/100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    {/* Colonne gauche : infos pièce */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {piece && (
                          <img
                            src={`${API}/pieces/${piece.RéfPièce}/image`}
                            alt={piece.NomPièce}
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}

                        <h4 className="font-semibold text-sm">
                          {piece?.NomPièce || 'Pièce inconnue'}
                        </h4>

                        {status.available ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      
                      {piece && (
                        <div className="space-y-1 text-xs">
                          <p>N° pièce: <span className="font-mono">{piece.NumPièce}</span></p>
                          <p>N° fournisseur: <span className="font-mono">{piece.NumPièceAutreFournisseur || 'N/A'}</span></p>
                          {piece.DescriptionPièce && <p>{piece.DescriptionPièce}</p>}
                        </div>
                      )}
                    </div>

                    {/* Colonne droite : contrôles */}
                    <div className="flex flex-col items-end gap-2 ml-4">
                      {/* Ligne 1 : Boutons ordre + X */}
                      <div className="flex items-center gap-1">
                        {/* Boutons de déplacement */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMovepiece(gp.id, 'up')}
                          disabled={index === 0}
                          title="Monter"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMovepiece(gp.id, 'down')}
                          disabled={index === groupe.pieces.length - 1}
                          title="Descendre"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>

                        {/* Badge stock */}
                        <Badge className={`${
                          status.available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {status.inStock || 0} / {status.required}
                        </Badge>

                        {/* Bouton X */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onRemovePiece(gp.id)}
                          title="Retirer du groupe"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Ligne 2 : Quantité requise éditable */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 dark:text-white">Qté requise:</span>
                        {isEditing ? (
                          <>
                            <Input
                              type="number"
                              min="1"
                              value={tempQty}
                              onChange={(e) => setTempQty(e.target.value)}
                              className="w-16 h-7 text-xs"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              className="h-7 w-7 bg-green-600 hover:bg-green-700"
                              onClick={() => handleSaveRequiredQty(gp.id)}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingQty(null);
                                setTempQty('');
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-sm">{gp.Quantite}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingQty(gp.id);
                                setTempQty(gp.Quantite.toString());
                              }}
                              title="Modifier la quantité requise"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Ligne 3 : Quantité à sortir */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                        <span className="text-xs text-slate-600 min-w-fit dark:text-white">Qté à sortir:</span>
                        <Input
                          type="number"
                          min="0"
                          max={status.inStock}
                          value={(quantities[gp.RéfPièce] !== undefined) ? quantities[gp.RéfPièce] : gp.Quantite}
                          onChange={(e) => handleQuantityChange(gp.RéfPièce, e.target.value)}
                          className="w-16 h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {expanded && showAddPieceButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddPiece}
            className="w-full border-dashed"
          >
            <Package className="w-4 h-4 mr-2" />
            Ajouter une pièce au groupe
          </Button>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(groupe)}>
              <Edit className="w-4 h-4 mr-1" />
              Modifier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(groupe.RefGroupe)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Supprimer
            </Button>
          </div>

          <Button
            onClick={handleSortir}
            disabled={!canPerformSortie || !allQuantitiesValid}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 text-white"
            title={
              !allQuantitiesValid 
                ? "Certaines quantités dépassent le stock" 
                : !canPerformSortie 
                ? "Aucune pièce disponible en quantité suffisante" 
                : "Sortir les pièces sélectionnées"
            }
          >
            <Minus className="w-4 h-4 mr-2" />
            Sortir pièces
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}