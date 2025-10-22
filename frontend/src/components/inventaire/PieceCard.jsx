
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Edit, Package, Trash2, Building2, Factory, Warehouse, Minus, CircleCheck } from "lucide-react";

const getStockStatus = {
  critique: { label: "Critique", color: "bg-red-600 text-white", icon: <AlertTriangle className="w-4 h-4" /> },
  faible: { label: "Faible", color: "bg-yellow-400 text-yellow-900", icon: <AlertTriangle className="w-4 h-4" /> },
  ok: { label: "OK", color: "bg-green-400 text-yellow-900", icon: <CircleCheck className="w-4 h-4" /> }
};




export function PieceCard({ piece, fournisseur, autreFournisseur, fabricant, onEdit, onDelete, onQuickRemove }) {
  const stockStatus = getStockStatus[piece.statut_stock] || getStockStatus.ok;

  const StatItem = ({ label, value, isPrice = false }) => (
    <div className="text-center bg-slate-50 p-3 rounded-lg">
      <p className="text-xs text-slate-500 font-medium uppercase">{label}</p>
      <p className="font-bold text-lg text-slate-900">
        {isPrice && '$'}{value}
      </p>
    </div>
  );

  return (
    <Card className="flex flex-col bg-white/90 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold text-slate-900 pr-4">{piece.NomPièce}</CardTitle>
          {stockStatus && (
            <Badge className={`flex-shrink-0 ${stockStatus.color}`}>
              {stockStatus.icon}
              <span className="ml-1.5">{stockStatus.label}</span>
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500 font-mono pt-1">Réf: {piece.NumPièce}</p>
        {piece.DescriptionPièce && <CardDescription className="pt-2 text-slate-700">{piece.DescriptionPièce}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <StatItem label="Stock" value={piece.QtéenInventaire} />
          <StatItem label="Min." value={piece.Qtéminimum} />
          <StatItem label="Max." value={piece.Qtémax} />
          <StatItem label="Prix" value={piece.Prix_unitaire?.toFixed(2) || '0.00'} isPrice />
        </div>
        <div className="space-y-2 text-sm border-t pt-4">
          <div className="flex items-center gap-2 text-slate-600"><Building2 className="w-4 h-4 text-blue-500" /> <strong>Fournisseur:</strong> {fournisseur?.NomFournisseur || 'N/A'}</div>
          <div className="flex items-center gap-2 text-slate-600"><Building2 className="w-4 h-4 text-gray-400" /> <strong>Autre Fourn.:</strong> {autreFournisseur?.NomFournisseur || 'N/A'}</div>
          <div className="flex items-center gap-2 text-slate-600"><Factory className="w-4 h-4 text-blue-500" /> <strong>Fabricant:</strong> {fabricant?.NomFabricant || 'N/A'}</div>
          <div className="flex items-center gap-2 text-slate-600"><Warehouse className="w-4 h-4 text-blue-500" /> <strong>Lieu:</strong> {piece.Lieuentreposage || 'N/A'}</div>
        </div>
      </CardContent>
      <CardFooter className="border-t p-3 flex justify-between items-center">
        <Button 
            variant="outline" 
            size="icon"
            onClick={() => onQuickRemove(piece)}
            className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
            title="Sortir 1 pièce du stock"
        >
          <Minus className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="w-4 h-4 text-red-500" /></Button>
            <Button variant="outline" size="sm" onClick={onEdit}><Edit className="w-4 h-4 mr-2" />Modifier</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
