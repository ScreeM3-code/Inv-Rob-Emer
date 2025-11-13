
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Edit, Package, Trash2, Building2, Factory, Warehouse, Minus, CircleCheck, Check, Layers, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";


const getStockStatus = {
  critique: { label: "Critique", color: "bg-red-600 text-white", icon: <AlertTriangle className="w-4 h-4" /> },
  faible: { label: "Faible", color: "bg-yellow-400 text-yellow-900", icon: <AlertTriangle className="w-4 h-4" /> },
  ok: { label: "OK", color: "bg-green-400 text-yellow-900", icon: <CircleCheck className="w-4 h-4" /> }
};




export function PieceCard({ piece, fournisseur, autreFournisseur, Categories, pieceGroupes, groupes, fabricant, onEdit, onDelete, onQuickRemove, onAddToGroupe, onRemoveFromGroupe }) {
  const stockStatus = getStockStatus[piece.statut_stock] || getStockStatus.ok;
  const [qrQty, setQrQty] = React.useState(1);
  const [selectedQty, setSelectedQty] = React.useState(1);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const StatItem = ({ label, value, isPrice = false }) => (
    <div className="text-center bg-slate-50 p-3 rounded-lg">
      <p className="text-xs text-slate-500 font-medium uppercase">{label}</p>
      <p className="font-bold text-lg text-slate-900">
        {isPrice && '$'}{value}
      </p>
    </div>
  );


  const handleToggleGroupe = async (groupeId, e) => {
    e.stopPropagation(); // ← Empêche la propagation
    const isInGroupe = pieceGroupes?.some(pg => pg.RefGroupe === groupeId);
    
    if (isInGroupe) {
      // Retirer du groupe
      const groupePiece = pieceGroupes.find(pg => pg.RefGroupe === groupeId);
      if (groupePiece?.id) {
        await onRemoveFromGroupe(groupePiece.id);
      }
    } else {
      // Ajouter au groupe avec la quantité sélectionnée
      await onAddToGroupe(piece.RéfPièce, groupeId, selectedQty);
    }
  };

  // Grouper par catégorie
  const groupesParCategorie = groupes.reduce((acc, groupe) => {
    const catName = groupe.categorie?.NomCategorie || 'Sans catégorie';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(groupe);
    return acc;
  }, {});

  return (
    <Card className="flex flex-col glass-card hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold pr-4">{piece.NomPièce}</CardTitle>
          <div className="flex flex-col gap-2 flex-shrink-0">
            {stockStatus && (
              <Badge className={`${stockStatus.color}`}>
                {stockStatus.icon}
                <span className="ml-1.5">{stockStatus.label}</span>
              </Badge>
            )}
            {piece.Qtécommandée > 0 && (
              <Badge className="bg-purple-500 text-white">
                <Package className="w-3 h-3 mr-1" />
                En commande ({piece.Qtécommandée})
              </Badge>
            )}
          </div>
        </div>
          {piece.NumPièce && <p className="text-sm text-slate-500 font-mono pt-1">Réf: {piece.NumPièce}</p>}
          {piece.NumPièceAutreFournisseur && <p className="text-sm text-slate-500 font-mono pt-1">#Fourn: {piece.NumPièceAutreFournisseur}</p>}
          {piece.RTBS && <p className="text-sm text-slate-500 font-mono pt-1">SAP: {piece.RTBS}</p>}
          {piece.NoFESTO && <p className="text-sm text-slate-500 font-mono pt-1">FESTO: {piece.NoFESTO}</p>}

        {piece.DescriptionPièce && <CardDescription className="pt-3">{piece.DescriptionPièce}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <StatItem label="Stock" value={piece.QtéenInventaire} />
          <StatItem label="Min." value={piece.Qtéminimum} />
          <StatItem label="Max." value={piece.Qtémax} />
          <StatItem label="Prix" value={piece.Prix_unitaire?.toFixed(2) || '0.00'} isPrice />
        </div>
        <div className="space-y-2 text-sm border-t pt-4">
          <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-500" /> <strong>Fournisseur:</strong> {fournisseur?.NomFournisseur || 'N/A'}</div>
          <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /> <strong>Autre Fourn.:</strong> {autreFournisseur?.NomFournisseur || 'N/A'}</div>
          <div className="flex items-center gap-2"><Factory className="w-4 h-4 text-blue-500" /> <strong>Fabricant:</strong> {fabricant?.NomFabricant || 'N/A'}</div>
          <div className="flex items-center gap-2"><Warehouse className="w-4 h-4 text-blue-500" /> <strong>Lieu:</strong> {piece.Lieuentreposage || 'N/A'}</div>
        </div>
      </CardContent>
      <CardFooter className="border-t p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => onQuickRemove(qrQty)}
            className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
            title={`Sortir ${qrQty} pièce(s) du stock`}
          >
            <Minus className="w-5 h-5" />
          </Button>
          <Input
            type="number"
            min="1"
            max={piece.QtéenInventaire}
            value={qrQty}
            onChange={(e) => {
              const v = parseInt(e.target.value || '1', 10);
              const n = isNaN(v) ? 1 : v;
              setQrQty(Math.max(1, Math.min(n, piece.QtéenInventaire || 1)));
            }}
            className="w-20 h-8"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* ← NOUVEAU BOUTON GROUPES */}
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="border-blue-500 text-blue-500 hover:bg-blue-50 relative"
              >
                <Layers className="w-4 h-4 mr-2" />
                Groupes
                {pieceGroupes?.length > 0 && (
                  <Badge className="ml-2 bg-blue-500 text-white h-5 min-w-5 flex items-center justify-center">
                    {pieceGroupes.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 max-h-[500px] overflow-y-auto" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Ajouter à un groupe</h4>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600">Qté:</Label>
                    <Input
                      type="number"
                      min="1"
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 h-8"
                    />
                  </div>
                </div>

                {Object.keys(groupesParCategorie).length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun groupe disponible</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(groupesParCategorie).map(([categorie, groupesList]) => (
                      <div key={categorie} className="space-y-2">
                        <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b pb-1">
                          {categorie}
                        </h5>
                        <div className="space-y-1">
                          {groupesList.map(groupe => {
                            const isInGroupe = pieceGroupes?.some(pg => pg.RefGroupe === groupe.RefGroupe);
                            return (
                              <Button
                                key={groupe.RefGroupe}
                                variant={isInGroupe ? "default" : "outline"}
                                className={`w-full justify-start text-left h-auto py-2 ${
                                  isInGroupe 
                                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                                    : 'hover:bg-blue-50'
                                }`}
                                size="sm"
                                onClick={(e) => handleToggleGroupe(groupe.RefGroupe, e)} // ← Ajoute (e)
                              >
                                <div className="flex items-center justify-between w-full gap-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {isInGroupe ? (
                                      <Check className="w-4 h-4 flex-shrink-0" />
                                    ) : (
                                      <Layers className="w-4 h-4 flex-shrink-0" />
                                    )}
                                    <span className="truncate">{groupe.NomGroupe}</span>
                                  </div>
                                  {isInGroupe && (
                                    <X className="w-4 h-4 flex-shrink-0 opacity-70 hover:opacity-100" />
                                  )}
                                </div>
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
