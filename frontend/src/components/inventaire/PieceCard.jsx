
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Edit, Package, Trash2, Building2, Factory, Warehouse, Minus, CircleCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Layers, Check } from "lucide-react";

const getStockStatus = {
  critique: { label: "Critique", color: "bg-red-600 text-white", icon: <AlertTriangle className="w-4 h-4" /> },
  faible: { label: "Faible", color: "bg-yellow-400 text-yellow-900", icon: <AlertTriangle className="w-4 h-4" /> },
  ok: { label: "OK", color: "bg-green-400 text-yellow-900", icon: <CircleCheck className="w-4 h-4" /> }
};




export function PieceCard({ piece, fournisseur, autreFournisseur, Categories, pieceGroupes, groupes, fabricant, onEdit, onDelete, onQuickRemove, onAddToGroupe }) {
  const stockStatus = getStockStatus[piece.statut_stock] || getStockStatus.ok;
  const [qrQty, setQrQty] = React.useState(1);

  const StatItem = ({ label, value, isPrice = false }) => (
    <div className="text-center bg-slate-50 p-3 rounded-lg">
      <p className="text-xs text-slate-500 font-medium uppercase">{label}</p>
      <p className="font-bold text-lg text-slate-900">
        {isPrice && '$'}{value}
      </p>
    </div>
  );

  return (
    <Card className="flex flex-col glass-card hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold pr-4">{piece.NomPièce}</CardTitle>
          {stockStatus && (
            <Badge className={`flex-shrink-0 ${stockStatus.color}`}>
              {stockStatus.icon}
              <span className="ml-1.5">{stockStatus.label}</span>
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500 font-mono pt-1">Réf: {piece.NumPièce}</p>
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
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="border-blue-500 text-blue-500 hover:bg-blue-50"
          >
            Groupes
            {pieceGroupes?.length > 0 && (
              <Badge className="ml-2 bg-blue-500 text-white">{pieceGroupes.length}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Ajouter à un groupe</h4>
            {groupes.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun groupe disponible</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1">
                {groupes.map(groupe => {
                  const isInGroupe = pieceGroupes?.some(pg => pg.RefGroupe === groupe.RefGroupe);
                  return (
                    <Button
                      key={groupe.RefGroupe}
                      variant={isInGroupe ? "default" : "outline"}
                      className="w-full justify-start"
                      size="sm"
                      onClick={() => onAddToGroupe(piece.RéfPièce, groupe.RefGroupe)}
                    >
                      {isInGroupe && <Check className="w-4 h-4 mr-2" />}
                      <span className="truncate">{groupe.NomGroupe}</span>
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
                        className="w-14 h-8 border-blue-600"
                      />
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      
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
            className="w-14 h-8 border-blue-600"
          />
        </div>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="w-4 h-4 text-red-500" /></Button>
            <Button className="border-blue-600" variant="outline" size="sm" onClick={onEdit}><Edit className="w-4 h-4 mr-2" />Modifier</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
