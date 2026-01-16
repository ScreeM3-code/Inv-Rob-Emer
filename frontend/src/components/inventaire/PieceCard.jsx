
import React, { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Edit, Package, Trash2, Building2, Factory, Warehouse, Minus, CircleCheck, Check, Layers, X, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import ImageSelector from './ImageSelector';

const API = import.meta.env.VITE_BACKEND_URL + '/api';

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
  const [imageError, setImageError] = React.useState(false);
  const [showImageMenu, setShowImageMenu] = React.useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const imageUrl = `${API}/pieces/${piece.RéfPièce}/image`;
  const fileInputRef = React.useRef(null);

  const StatItem = ({ label, value, isPrice = false }) => {
    const isEmpty = value === null || value === undefined || value === '';
    let formatted = '';
    if (!isEmpty) {
      if (isPrice) {
        const n = Number(value);
        formatted = isNaN(n) ? '' : n.toFixed(2);
      } else {
        formatted = value;
      }
    }

    return (
      <div className="text-center bg-slate-50 p-3 rounded-lg">
        <p className="text-xs text-slate-500 font-medium uppercase">{label}</p>
        <p className="font-bold text-lg text-slate-900">{isPrice && '$'}{formatted}</p>
      </div>
    );
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await fetch(`${API}/pieces/${piece.RéfPièce}/upload-image`, {
        method: 'POST',
        body: formData
      });
      
      // Recharger l'image
      setImageError(false);
      // Force reload de l'image
      const img = document.querySelector(`img[alt="${piece.NomPièce}"]`);
      if (img) {
        img.src = `${imageUrl}?t=${Date.now()}`;
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      toast({ title: 'Erreur upload', description: 'Erreur lors de l\'upload de l\'image', variant: 'destructive' });
    }
  };

  const handleDeleteImage = async () => {
    if (!confirm('Supprimer l\'image de cette pièce ?')) return;

    try {
      await fetch(`${API}/pieces/${piece.RéfPièce}/image`, {
        method: 'DELETE'
      });
      setImageError(true);
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const openSearchUrls = () => {
    setShowImageSelector(true);
  };

  const handleToggleGroupe = async (groupeId, e) => {
    e?.stopPropagation();
    const isInGroupe = pieceGroupes?.some(pg => pg.RefGroupe === groupeId);
    if (isInGroupe) {
      const groupePiece = pieceGroupes.find(pg => pg.RefGroupe === groupeId);
      if (groupePiece?.id) await onRemoveFromGroupe(groupePiece.id);
    } else {
      await onAddToGroupe(piece.RéfPièce, groupeId, selectedQty);
    }
  };

  const groupesParCategorie = (groupes || []).reduce((acc, groupe) => {
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
        </div>
      </CardHeader>

      {/* Image + numbers row */}
      <div className="h-48 from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 overflow-hidden group">
        <div className="flex h-full">
          <div className="w-1/2 relative flex items-center justify-center p-4 bg-white">
            {!imageError ? (
              <img src={imageUrl} alt={piece.NomPièce} className="w-full h-full object-contain transition-transform group-hover:scale-105" onError={() => setImageError(true)} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="w-20 h-20 text-slate-300 dark:text-slate-600" />
              </div>
            )}

            {/* Buttons centered on the image (left half) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} className="hover:bg-slate-100">
                  <Edit className="w-4 h-4 mr-1" />Upload
                </Button>
                {!imageError && (
                  <Button size="sm" variant="secondary" onClick={handleDeleteImage} className="hover:bg-red-50 text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={openSearchUrls} className="hover:bg-blue-50">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>
          {/* Badges overlay on # section */}
          <div className="w-1/2 p-4 flex flex-col justify-left space-y-2 top-3 left-3 gap-2 z-20">
            {stockStatus && (
              <Badge className={`${stockStatus.color} flex items-center`}>
                {stockStatus.icon}
                <span className="ml-1.5 text-xs">{stockStatus.label}</span>
              </Badge>
            )}
            {piece.Qtécommandée > 0 && (
              <Badge className="bg-purple-500 text-white flex items-center text-xs">
                <Package className="w-3 h-3 mr-1" />
                En commande ({piece.Qtécommandée})
              </Badge>
            )}
            {piece.NumPièce?.trim() && <p className="text-sm text-slate-500 font-mono pt-1 dark:text-white">{piece.NumPièce}</p>}
            {piece.NumPièceAutreFournisseur?.trim() && <p className="text-sm text-slate-500 font-mono pt-1 dark:text-white">#Fourn: {piece.NumPièceAutreFournisseur}</p>}
            {piece.RTBS && <p className="text-sm text-slate-500 font-mono pt-1 dark:text-white">SAP: {piece.RTBS}</p>}
            {piece.NoFESTO?.trim() && <p className="text-sm text-slate-500 font-mono pt-1 dark:text-white">FESTO: {piece.NoFESTO}</p>}
          </div>
        </div>
      </div>

      <CardContent className="flex-grow space-y-4">
        <div></div>
        {piece.DescriptionPièce && <p className="text-sm text-slate-600 dark:text-white">{piece.DescriptionPièce}</p>}

        <div className="grid grid-cols-4 gap-2">
          <StatItem label="Stock" value={piece.QtéenInventaire} />
          <StatItem label="Min." value={piece.Qtéminimum} />
          <StatItem label="Max." value={piece.Qtémax} />
          <StatItem label="Prix" value={piece.Prix_unitaire} isPrice />
        </div>

        {/* Section fournisseurs - MASQUÉE SUR MOBILE */}
        <div className="hidden md:block space-y-2 text-sm border-t pt-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500" /> 
            <strong>Fournisseur:</strong> {fournisseur?.NomFournisseur || 'N/A'}
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" /> 
            <strong>Autre Fourn.:</strong> {autreFournisseur?.NomFournisseur || 'N/A'}
          </div>
          <div className="flex items-center gap-2">
            <Factory className="w-4 w-4 text-blue-500" /> 
            <strong>Fabricant:</strong> {fabricant?.NomFabricant || 'N/A'}
          </div>
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-blue-500" /> 
            <strong>Lieu:</strong> {piece.Lieuentreposage || 'N/A'}
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t p-2 md:p-3 flex justify-between items-center">
        <div className="flex items-center gap-1 md:gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => onQuickRemove(qrQty)} 
            className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 h-8 w-8 md:h-10 md:w-10" 
            title={`Sortir ${qrQty} pièce(s) du stock`}
          >
            <Minus className="w-4 h-4 md:w-5 md:h-5" />
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
            className="w-14 h-8 md:w-20 md:h-8 text-sm" 
          />
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-blue-500 text-blue-500 hover:bg-blue-50 relative h-8 px-2 md:px-3 text-xs md:text-sm"
              >
                <Layers className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                <span className="hidden md:inline">Groupes</span>
                {pieceGroupes?.length > 0 && (
                  <Badge className="ml-1 md:ml-2 bg-blue-500 text-white h-4 min-w-4 flex items-center justify-center text-xs">
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
                    <Input type="number" min="1" value={selectedQty} onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 h-8" />
                  </div>
                </div>
                {Object.keys(groupesParCategorie).length === 0 ? (<p className="text-sm text-gray-500">Aucun groupe disponible</p>) : (
                  <div className="space-y-3">
                    {Object.entries(groupesParCategorie).map(([categorie, groupesList]) => (
                      <div key={categorie} className="space-y-2">
                        <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b pb-1">{categorie}</h5>
                        <div className="space-y-1">
                          {groupesList.map(groupe => {
                            const isInGroupe = pieceGroupes?.some(pg => pg.RefGroupe === groupe.RefGroupe);
                            return (
                              <Button key={groupe.RefGroupe} variant={isInGroupe ? "default" : "outline"} className={`w-full justify-start text-left h-auto py-2 ${isInGroupe ? 'bg-green-500 hover:bg-green-600 text-white' : 'hover:bg-blue-50'}`} size="sm" onClick={(e) => handleToggleGroupe(groupe.RefGroupe, e)}>
                                <div className="flex items-center justify-between w-full gap-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {isInGroupe ? (<Check className="w-4 h-4 flex-shrink-0" />) : (<Layers className="w-4 h-4 flex-shrink-0" />)}
                                    <span className="truncate">{groupe.NomGroupe}</span>
                                  </div>
                                  {isInGroupe && (<X className="w-4 h-4 flex-shrink-0 opacity-70 hover:opacity-100" />)}
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

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onDelete}
            className="h-8 w-8 md:h-10 md:w-10"
          >
            <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEdit}
            className="h-8 px-2 md:px-3 text-xs md:text-sm"
          >
            <Edit className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">Modifier</span>
          </Button>
        </div>
      </CardFooter>
      {/* Dialog sélection d'image */}
      {showImageSelector && (
        <ImageSelector
          pieceId={piece.RéfPièce}
          pieceName={piece.NomPièce}
          onClose={() => setShowImageSelector(false)}
          onImageSaved={() => {
            // Recharger l'image
            setImageError(false);
            const img = document.querySelector(`img[alt="${piece.NomPièce}"]`);
            if (img) {
              img.src = `${imageUrl}?t=${Date.now()}`;
            }
          }}
        />
      )}
    </Card>
  );
}