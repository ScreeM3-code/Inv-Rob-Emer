import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, AlertTriangle, CheckCircle, Edit, Trash2, Minus, Plus, X, ChevronDown, ChevronRight } from "lucide-react";

export default function GroupeCard({ groupe, pieces, onEdit, onDelete, onSortirPieces, onAddPiece, onRemovePiece, showAddPieceButton = true }) {
  const [quantities, setQuantities] = useState({});
  // Start groups collapsed by default
  const [expanded, setExpanded] = useState(false);
  
  // Initialiser les quantités avec les valeurs requises
  React.useEffect(() => {
    const initial = {};
    groupe.pieces?.forEach(gp => {
      initial[gp.RéfPièce] = gp.Quantite;
    });
    setQuantities(initial);
  }, [groupe.pieces]);

  // Vérifier si chaque pièce est disponible en quantité suffisante
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

  // Vérifier si au moins une pièce peut être sortie
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
      alert("Certaines quantités demandées dépassent le stock disponible!");
      return;
    }

    // Filtrer seulement les pièces où la quantité > 0
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
      alert("Aucune pièce à sortir!");
      return;
    }

    onSortirPieces(sorties);
  };


  const handleQuantityChange = (pieceId, value) => {
    const parsed = parseInt(value, 10);
    const numValue = isNaN(parsed) ? 0 : parsed;
    const piece = pieces.find(p => p.RéfPièce === pieceId);
    const maxStock = piece?.QtéenInventaire || 0;
    
    // Limiter à la quantité en stock
    const validValue = Math.min(Math.max(0, numValue), maxStock);
    
    setQuantities(prev => ({
      ...prev,
      [pieceId]: validValue
    }));
  };

  return (
    <Card className="bg-white/90 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="p-1 rounded hover:bg-slate-100"
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
                <CardTitle className="text-lg">{groupe.NomGroupe}</CardTitle>
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
        {/* Liste des pièces */}
        {expanded && (
          <div className="space-y-3">
            {groupe.pieces?.map(gp => {
            const status = getPieceStatus(gp);
            const piece = status.piece;

            return (
              <div 
                key={gp.id ?? `${groupe.RefGroupe}-${gp.RéfPièce}`} 
                className={`p-3 rounded-lg border-2 ${
                  status.available 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  {/* Piece details on the left */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
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
                      <div className="space-y-1 text-xs text-slate-600">
                        <p>N° pièce: <span className="font-mono">{piece.NumPièce}</span></p>
                        <p>N° fournisseur: <span className="font-mono">{piece.NumPièceAutreFournisseur || 'N/A'}</span></p>
                        {piece.DescriptionPièce && (
                          <p className="text-slate-500">{piece.DescriptionPièce}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Controls column on the right: X, badge, then qty input under them */}
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`${
                          status.available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {status.inStock || 0} / {status.required}
                      </Badge>

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

                        <div className="flex items-center gap-2 mt-2 pt-2">
                          <Label className="text-xs text-slate-600 min-w-fit">Qté à sortir:</Label>
                          <Input
                            type="number"
                            min="0"
                            max={status.inStock}
                            value={(quantities[gp.RéfPièce] !== undefined) ? quantities[gp.RéfPièce] : gp.Quantite}
                            onChange={(e) => handleQuantityChange(gp.RéfPièce, e.target.value)}
                            className="h-8 text-sm"
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
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une pièce au groupe
              </Button>
            )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(groupe)}
            >
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
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50"
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