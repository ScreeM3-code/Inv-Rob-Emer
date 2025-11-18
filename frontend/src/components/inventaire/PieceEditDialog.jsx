import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    NumPièce: piece.NumPièce || "",
    NoFESTO: piece.NoFESTO || "",
    RTBS: piece.RTBS || ""
  }), [piece]);

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la pièce</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Nom et Description */}
          <div>
            <Label>Nom de la pièce *</Label>
            <Input
                defaultValue={memoizedValues.NomPièce}
                onChange={(e) => debouncedOnChange('NomPièce', e.target.value)}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Input
                defaultValue={memoizedValues.DescriptionPièce}
                onChange={(e) => debouncedOnChange('DescriptionPièce', e.target.value)}
            />
          </div>

          {/* Numéros de pièce */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>N° de pièce</Label>
              <Input
                  defaultValue={memoizedValues.NumPièce}
                  onChange={(e) => debouncedOnChange('NumPièce', e.target.value)}
              />
              <Label>N° SAP</Label>
              <Input
                  defaultValue={memoizedValues.RTBS}
                  onChange={(e) => debouncedOnChange('RTBS', e.target.value)}
              />
            </div>
            <div>
              <Label>N° pièce autre fournisseur</Label>
              <Input
                  defaultValue={memoizedValues.NumPièceAutreFournisseur}
                  onChange={(e) => debouncedOnChange('NumPièceAutreFournisseur', e.target.value)}
              />
              <Label>N° Festo</Label>
              <Input
                  defaultValue={memoizedValues.NoFESTO}
                  onChange={(e) => debouncedOnChange('NoFESTO', e.target.value)}
              />
            </div>
          </div>

          {/* Fournisseurs */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-700 mb-3">Fournisseurs</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fournisseur principal</Label>
                <Select
                  value={piece.RéfFournisseur?.toString() || "none"}
                  onValueChange={(value) => {
                    if (value === "none") return onChange('RéfFournisseur', null);
                    const n = parseInt(value, 10);
                    onChange('RéfFournisseur', isNaN(n) ? null : n);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun fournisseur</SelectItem>
                    {fournisseurs.map((f) => (
                      <SelectItem key={f.RéfFournisseur} value={f.RéfFournisseur.toString()}>
                        {f.NomFournisseur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Autre fournisseur</Label>
                <Select
                  value={piece.RéfAutreFournisseur?.toString() || "none"}
                  onValueChange={(value) => {
                    if (value === "none") return onChange('RéfAutreFournisseur', null);
                    const n = parseInt(value, 10);
                    onChange('RéfAutreFournisseur', isNaN(n) ? null : n);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun fournisseur</SelectItem>
                    {fournisseurs.map((f) => (
                      <SelectItem key={f.RéfFournisseur} value={f.RéfFournisseur.toString()}>
                        {f.NomFournisseur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Fabricant */}
          <div className="border-t pt-4">
            <Label>Fabricant</Label>
            <Select
              value={piece.RefFabricant?.toString() || "none"}
              onValueChange={(value) => {
                if (value === "none") return onChange('RefFabricant', null);
                const n = parseInt(value, 10);
                onChange('RefFabricant', isNaN(n) ? null : n);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un fabricant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun fabricant</SelectItem>
                {fabricants.map((fab) => (
                  <SelectItem key={fab.RefFabricant} value={fab.RefFabricant.toString()}>
                    {fab.NomFabricant}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantités */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-700 mb-3">Quantités et stock</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Qté stock *</Label>
                <Input
                  type="number"
                  min={0}
                  value={piece.QtéenInventaire ?? 0}
                  onChange={(e) => {
                    const v = e.target.value;
                    // Accept empty string while typing; convert to numbers safely
                    if (v === "") return onChange('QtéenInventaire', 0);
                    const n = parseInt(v, 10);
                    onChange('QtéenInventaire', Math.max(0, isNaN(n) ? 0 : n));
                  }}
                />
              </div>
              <div>
                <Label>Qté min *</Label>
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
                />
              </div>
              <div>
                <Label>Qté max</Label>
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
                />
              </div>
            </div>
          </div>

          {/* Emplacement et Prix */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Emplacement</Label>
              <Input
                value={piece.Lieuentreposage || ""}
                onChange={(e) => onChange('Lieuentreposage', e.target.value)}
              />
            </div>
            <div>
              <Label>Prix unitaire (CAD $) *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={piece.Prix_unitaire ?? 0}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange('Prix_unitaire', v === "" ? 0 : Math.max(0, parseFloat(v) || 0));
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            onClick={onSave}
            disabled={
              !piece.NomPièce?.trim()
            }
            className="bg-rio-red hover:bg-rio-red-dark"
          >
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}