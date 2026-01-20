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
      <CardHeader className="p-3 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              className="p-1 rounded"
              onClick={() => setExpanded(prev => !prev)}
              aria-label={expanded ? 'Masquer les pièces' : 'Afficher les pièces'}
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
              ) : (
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              )}
            </button>
            <Package className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm md:text-lg cursor-pointer" onClick={() => setExpanded(prev => !prev)}>
                  {groupe.NomGroupe}
                </CardTitle>
                <Badge className="bg-white text-slate-600 text-xs px-1.5 md:px-2 py-0.5">
                  {groupe.pieces ? groupe.pieces.length : 0}
                </Badge>
              </div>
              {groupe.Description && (
                <p className="text-xs md:text-sm text-slate-600 mt-1 line-clamp-1">{groupe.Description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {allQuantitiesValid ? (
              canPerformSortie ? (
                <Badge className="bg-green-500 text-white text-xs">
                  <CheckCircle className="w-2 h-2 md:w-3 md:h-3 mr-1" />
                  <span className="hidden md:inline">Prêt</span>
                  <span className="md:hidden">✓</span>
                </Badge>
              ) : (
                <Badge className="bg-yellow-500 text-white text-xs">
                  <AlertTriangle className="w-2 h-2 md:w-3 md:h-3 mr-1" />
                  <span className="hidden md:inline">Stock insuffisant</span>
                  <span className="md:hidden">!</span>
                </Badge>
              )
            ) : (
              <Badge className="bg-red-500 text-white text-xs">
                <AlertTriangle className="w-2 h-2 md:w-3 md:h-3 mr-1" />
                <span className="hidden md:inline">Quantités invalides</span>
                <span className="md:hidden">✗</span>
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6 pt-0">
        {expanded && (
          <div className="space-y-2 md:space-y-3">
            {groupe.pieces?.map((gp, index) => {
              const status = getPieceStatus(gp);
              const piece = status.piece;
              const imageUrl = `${API}/pieces/${gp.RéfPièce}/image`;
              const isEditing = editingQty === gp.id;

              return (
                <div 
                  key={gp.id ?? `${groupe.RefGroupe}-${gp.RéfPièce}`} 
                  className={`p-2 md:p-3 rounded-lg border-2 ${
                    status.available 
                      ? 'border-green-200 bg-green-50 dark:bg-green-700/100' 
                      : 'border-red-200 bg-red-50 dark:bg-red-700/100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2 gap-2">
                    {/* Colonne gauche : infos pièce */}
                    <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden bg-white border md:w-40 md:h-40 md:flex-shrink-0 md:rounded md:overflow-hidden md:bg-white md:border">
                      <img src={imageUrl} alt={gp.NomPièce} className="w-full h-full object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {piece && (
                          <img
                            alt={piece.NomPièce}
                            className="w-10 h-10 md:w-12 md:h-12 object-cover rounded flex-shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}

                        <h4 className="font-semibold text-xs md:text-sm truncate">
                          {piece?.NomPièce || 'Pièce inconnue'}
                        </h4>

                        {status.available ? (
                          <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 text-red-600 flex-shrink-0" />
                        )}
                      </div>
                      
                      {/* Infos détaillées - masquées sur mobile */}
                      {piece && (
                        <div className="block space-y-1 text-xs">
                          <p>N° pièce: <span className="font-mono">{piece.NumPièce}</span></p>
                          <p>N° fournisseur: <span className="font-mono">{piece.NumPièceAutreFournisseur || 'N/A'}</span></p>
                          {piece.DescriptionPièce && <p className="line-clamp-1">{piece.DescriptionPièce}</p>}
                        </div>
                      )}
                    </div>

                    {/* Colonne droite : contrôles */}
                    <div className="flex flex-col items-end gap-1 md:gap-2 ml-2">
                      {/* Ligne 1 : Boutons ordre + X */}
                      <div className="flex items-center gap-0.5 md:gap-1">
                        {/* Boutons de déplacement - masqués sur mobile */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hidden md:flex h-6 w-6"
                          onClick={() => handleMovepiece(gp.id, 'up')}
                          disabled={index === 0}
                          title="Monter"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hidden md:flex h-6 w-6"
                          onClick={() => handleMovepiece(gp.id, 'down')}
                          disabled={index === groupe.pieces.length - 1}
                          title="Descendre"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>

                        {/* Badge stock */}
                        <Badge className={`text-xs ${
                          status.available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {status.inStock || 0}/{status.required}
                        </Badge>

                        {/* Bouton X */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onRemovePiece(gp.id)}
                          title="Retirer du groupe"
                        >
                          <X className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </div>

                      {/* Ligne 2 : Quantité requise éditable */}
                      <div className="flex items-center gap-1 md:gap-2">
                        <span className="text-xs text-slate-600 dark:text-white hidden md:inline">Qté requise:</span>
                        {isEditing ? (
                          <>
                            <Input
                              type="number"
                              min="1"
                              value={tempQty}
                              onChange={(e) => setTempQty(e.target.value)}
                              className="w-12 md:w-16 h-6 md:h-7 text-xs"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              className="h-6 w-6 md:h-7 md:w-7 bg-green-600 hover:bg-green-700"
                              onClick={() => handleSaveRequiredQty(gp.id)}
                            >
                              <Save className="h-2.5 w-2.5 md:h-3 md:w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 md:h-7 md:w-7"
                              onClick={() => {
                                setEditingQty(null);
                                setTempQty('');
                              }}
                            >
                              <X className="h-2.5 w-2.5 md:h-3 md:w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-xs md:text-sm">{gp.Quantite}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 md:h-7 md:w-7"
                              onClick={() => {
                                setEditingQty(gp.id);
                                setTempQty(gp.Quantite.toString());
                              }}
                              title="Modifier la quantité requise"
                            >
                              <Edit className="h-2.5 w-2.5 md:h-3 md:w-3" />
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Ligne 3 : Quantité à sortir */}
                      <div className="flex items-center gap-1 md:gap-2 mt-1 md:mt-2 pt-1 md:pt-2 border-t w-full">
                        <span className="text-xs text-slate-600 dark:text-white hidden md:inline">Sortir:</span>
                        <Input
                          type="number"
                          min="0"
                          max={status.inStock}
                          value={(quantities[gp.RéfPièce] !== undefined) ? quantities[gp.RéfPièce] : gp.Quantite}
                          onChange={(e) => handleQuantityChange(gp.RéfPièce, e.target.value)}
                          className="w-12 md:w-16 h-6 md:h-8 text-xs md:text-sm"
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
            className="w-full border-dashed h-8 md:h-9 text-xs md:text-sm"
          >
            <Package className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Ajouter une pièce
          </Button>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-3 md:pt-4 border-t">
          <div className="flex gap-1 md:gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(groupe)} className="h-8 px-2 md:px-3 text-xs md:text-sm">
              <Edit className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
              <span className="hidden md:inline">Modifier</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(groupe.RefGroupe)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2 md:px-3 text-xs md:text-sm"
            >
              <Trash2 className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
              <span className="hidden md:inline">Supprimer</span>
            </Button>
          </div>

          <Button
            onClick={handleSortir}
            disabled={!canPerformSortie || !allQuantitiesValid}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 text-white h-8 px-3 md:px-4 text-xs md:text-sm"
            title={
              !allQuantitiesValid 
                ? "Certaines quantités dépassent le stock" 
                : !canPerformSortie 
                ? "Aucune pièce disponible en quantité suffisante" 
                : "Sortir les pièces sélectionnées"
            }
          >
            <Minus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Sortir pièces</span>
            <span className="sm:hidden">Sortir</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}