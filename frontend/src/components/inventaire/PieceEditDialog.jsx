import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PieceFournisseursEditor from '@/components/pieces/PieceFournisseursEditor';


export default function PieceEditDialog({ 
  piece, 
  fournisseurs, 
  fabricants, 
  onSave, 
  onCancel,
  onChange 
}) {
  if (!piece) return null;

  // Debounce les mises à jour pour les champs texte
  const debouncedOnChange = React.useCallback(
    (fn => {
      let timeoutId;
      return (field, value) => {
        if (['QtéenInventaire', 'Qtéminimum', 'Qtémax', 'Prix_unitaire'].includes(field)) {
          // Mise à jour immédiate pour les champs numériques
          fn(field, value);
          return;
        }
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(field, value), 100);
      };
    })(onChange),
    [onChange]
  );

  // Mémoiser les valeurs du formulaire
  const memoizedValues = React.useMemo(() => ({
    NomPièce: piece.NomPièce || "",
    DescriptionPièce: piece.DescriptionPièce || "",
    NumPièce: piece.NumPièce || "",
    NumPièceAutreFournisseur: piece.NumPièceAutreFournisseur || "",
    RéfFournisseur: piece.RéfFournisseur?.toString() || "none",
    RéfAutreFournisseur: piece.RéfAutreFournisseur?.toString() || "none",
    RefFabricant: piece.RefFabricant?.toString() || "none",
    Lieuentreposage: piece.Lieuentreposage || "",
    NoFESTO: piece.NoFESTO || "",
    RTBS: piece.RTBS || ""
  }), [piece]);

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">Modifier la pièce</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-3 md:gap-4 py-3 md:py-4">
          {/* Nom et Description */}
          <div>
            <Label className="text-xs md:text-sm">Nom de la pièce *</Label>
            <Input
                defaultValue={memoizedValues.NomPièce}
                onChange={(e) => debouncedOnChange('NomPièce', e.target.value)}
                className="h-9 md:h-10 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs md:text-sm">Description</Label>
            <Input
                defaultValue={memoizedValues.DescriptionPièce}
                onChange={(e) => debouncedOnChange('DescriptionPièce', e.target.value)}
                className="h-9 md:h-10 text-sm"
            />
          </div>

          {/* Numéros de pièce */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <Label className="text-xs md:text-sm">N° de pièce</Label>
              <Input
                  defaultValue={memoizedValues.NumPièce}
                  onChange={(e) => debouncedOnChange('NumPièce', e.target.value)}
                  className="h-9 md:h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs md:text-sm">N° pièce fournisseur</Label>
              <Input
                  defaultValue={memoizedValues.NumPièceAutreFournisseur}
                  onChange={(e) => debouncedOnChange('NumPièceAutreFournisseur', e.target.value)}
                  className="h-9 md:h-10 text-sm"
              />
            </div>
          </div>

          {/* Numéros SAP et FESTO - masqués sur mobile */}
          <div className="hidden md:grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">N° SAP</Label>
              <Input
                  defaultValue={memoizedValues.RTBS}
                  onChange={(e) => debouncedOnChange('RTBS', e.target.value)}
                  className="h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-sm">N° Festo</Label>
              <Input
                  defaultValue={memoizedValues.NoFESTO}
                  onChange={(e) => debouncedOnChange('NoFESTO', e.target.value)}
                  className="h-10 text-sm"
              />
            </div>
          </div>

          {/* Fournisseurs */}
          <div className="border-t pt-3 md:pt-4">
            <h4 className="font-semibold text-gray-700 mb-2 md:mb-3 text-sm md:text-base">Fournisseurs</h4>
            <PieceFournisseursEditor
              fournisseurs={piece.fournisseurs || []}
              allFournisseurs={fournisseurs || []}
              onChange={(newList) => onChange('fournisseurs', newList)}
            />
          </div>

          {/* Fabricant */}
          <div className="border-t pt-3 md:pt-4">
            <Label className="text-xs md:text-sm">Fabricant</Label>
            <Select
              value={piece.RefFabricant?.toString() || "none"}
              onValueChange={(value) => {
                if (value === "none") return onChange('RefFabricant', null);
                const n = parseInt(value, 10);
                onChange('RefFabricant', isNaN(n) ? null : n);
              }}
            >
              <SelectTrigger className="h-9 md:h-10 text-sm">
                <SelectValue placeholder="Sélectionner un fabricant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {fabricants.map((fab) => (
                  <SelectItem key={fab.RefFabricant} value={fab.RefFabricant.toString()}>
                    {fab.NomFabricant}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantités */}
          <div className="border-t pt-3 md:pt-4">
            <h4 className="font-semibold text-gray-700 mb-2 md:mb-3 text-sm md:text-base">Quantités</h4>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div>
                <Label className="text-xs md:text-sm">Stock *</Label>
                <Input
                  type="number"
                  min={0}
                  value={piece.QtéenInventaire ?? 0}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") return onChange('QtéenInventaire', 0);
                    const n = parseInt(v, 10);
                    onChange('QtéenInventaire', Math.max(0, isNaN(n) ? 0 : n));
                  }}
                  className="h-9 md:h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs md:text-sm">Min *</Label>
                <Input
                  type="number"
                  min={0}
                  value={piece.Qtéminimum ?? 0}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") return onChange('Qtéminimum', 0);
                    const n = parseInt(v, 10);
                    onChange('Qtéminimum', Math.max(0, isNaN(n) ? 0 : n));
                  }}
                  className="h-9 md:h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs md:text-sm">Max</Label>
                <Input
                  type="number"
                  min={0}
                  value={piece.Qtémax ?? 100}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") return onChange('Qtémax', 100);
                    const n = parseInt(v, 10);
                    onChange('Qtémax', Math.max(0, isNaN(n) ? 0 : n));
                  }}
                  className="h-9 md:h-10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Emplacement et Prix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <Label className="text-xs md:text-sm">Emplacement</Label>
              <Input
                value={piece.Lieuentreposage || ""}
                onChange={(e) => onChange('Lieuentreposage', e.target.value)}
                className="h-9 md:h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs md:text-sm">Prix unitaire (CAD $) *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={piece.Prix_unitaire ?? 0}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange('Prix_unitaire', v === "" ? 0 : Math.max(0, parseFloat(v) || 0));
                }}
                className="h-9 md:h-10 text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} className="h-9 text-sm">
            Annuler
          </Button>
          <Button
            onClick={onSave}
            disabled={!piece.NomPièce?.trim()}
            className="bg-rio-red hover:bg-rio-red-dark h-9 text-sm"
          >
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}