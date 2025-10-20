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
              value={piece.NomPièce || ""}
              onChange={(e) => onChange('NomPièce', e.target.value)}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={piece.DescriptionPièce || ""}
              onChange={(e) => onChange('DescriptionPièce', e.target.value)}
            />
          </div>

          {/* Numéros de pièce */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>N° de pièce</Label>
              <Input
                value={piece.NumPièce || ""}
                onChange={(e) => onChange('NumPièce', e.target.value)}
              />
            </div>
            <div>
              <Label>N° pièce autre fournisseur</Label>
              <Input
                value={piece.NumPièceAutreFournisseur || ""}
                onChange={(e) => onChange('NumPièceAutreFournisseur', e.target.value)}
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
                  onValueChange={(value) => onChange('RéfFournisseur', value === "none" ? null : parseInt(value))}
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
                  onValueChange={(value) => onChange('RéfAutreFournisseur', value === "none" ? null : parseInt(value))}
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
              onValueChange={(value) => onChange('RefFabricant', value === "none" ? null : parseInt(value))}
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
                  value={piece.QtéenInventaire ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange('QtéenInventaire', v === "" ? "" : Math.max(0, parseInt(v) || 0));
                  }}
                />
              </div>
              <div>
                <Label>Qté min *</Label>
                <Input
                  type="number"
                  min={0}
                  value={piece.Qtéminimum ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange('Qtéminimum', v === "" ? "" : Math.max(0, parseInt(v) || 0));
                  }}
                />
              </div>
              <div>
                <Label>Qté max</Label>
                <Input
                  type="number"
                  min={0}
                  value={piece.Qtémax ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange('Qtémax', v === "" ? "" : Math.max(0, parseInt(v) || 0));
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
                value={piece.Prix_unitaire ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange('Prix_unitaire', v === "" ? "" : Math.max(0, parseFloat(v) || 0));
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
              !piece.NomPièce ||
              piece.QtéenInventaire === "" ||
              piece.Prix_unitaire === ""
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