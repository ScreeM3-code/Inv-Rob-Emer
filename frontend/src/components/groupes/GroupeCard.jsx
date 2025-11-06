import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, AlertTriangle, CheckCircle, Edit, Trash2, Minus } from "lucide-react";

export default function GroupeCard({ groupe, pieces, onEdit, onDelete, onSortirPieces }) {
  const [quantities, setQuantities] = useState({});
  
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

  // Vérifier si toutes les pièces sont disponibles
  const allPiecesAvailable = groupe.pieces?.every(gp => {
    const status = getPieceStatus(gp);
    return status.available;
  });


  const handleSortir = () => {
    if (!allPiecesAvailable) {
      alert("Certaines pièces ne sont pas disponibles en quantité suffisante!");
      return;
    }

    // Créer un tableau des sorties à effectuer
    const sorties = groupe.pieces.map(gp => {
      const piece = pieces.find(p => p.RéfPièce === gp.RéfPièce);
      return {
        piece,
        quantite: quantities[gp.RéfPièce] || gp.Quantite
      };
    });

    onSortirPieces(sorties);
  };

  const handleQuantityChange = (pieceId, value) => {
    setQuantities(prev => ({
      ...prev,
      [pieceId]: parseInt(value) || 0
    }));
  };

  return (
    <Card className="bg-white/90 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <CardTitle className="text-lg">{groupe.NomGroupe}</CardTitle>
              {groupe.Description && (
                <p className="text-sm text-slate-600 mt-1">{groupe.Description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {allPiecesAvailable ? (
              <Badge className="bg-green-500 text-white">
                <CheckCircle className="w-3 h-3 mr-1" />
                Disponible
              </Badge>
            ) : (
              <Badge className="bg-red-500 text-white">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Manquant
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Liste des pièces */}
        <div className="space-y-3">
          {groupe.pieces?.map(gp => {
            const status = getPieceStatus(gp);
            const piece = status.piece;

            return (
              <div 
                key={gp.id} 
                className={`p-3 rounded-lg border-2 ${
                  status.available 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
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
                        <p>Pièce: <span className="font-mono">{piece.NumPièce}</span></p>
                        <p>#: <span className="font-mono">{piece.NumPièceAutreFournisseur || 'N/A'}</span></p>
                        {piece.DescriptionPièce && (
                          <p className="text-slate-500">{piece.DescriptionPièce}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    <Badge 
                      className={`${
                        status.available 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {status.inStock || 0} / {status.required}
                    </Badge>
                    <div>
                    <Label className="text-s text-slate-600">Qté à sortir:</Label>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max={status.inStock}
                      value={quantities[gp.RéfPièce] || gp.Quantite}
                      onChange={(e) => handleQuantityChange(gp.RéfPièce, e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

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
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50"
          >
            <Minus className="w-4 h-4 mr-2" />
            Sortir pièces
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}