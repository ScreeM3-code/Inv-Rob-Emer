import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PieceEditForm({ piece, fournisseurs, fabricants, onSave, onCancel }) {
  const [formData, setFormData] = React.useState(piece);

  // Debounce les mises à jour d'état pour les champs texte
  const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  };

  // Version debounced du setState pour les champs texte
  const debouncedSetFormData = React.useCallback(
    debounce((field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    }, 100),
    []
  );

  const handleChange = React.useCallback((field, value) => {
    // Pour les champs numériques, mettre à jour immédiatement
    if (['QtéenInventaire', 'Qtéminimum', 'Qtémax', 'Prix_unitaire'].includes(field)) {
      setFormData(prev => ({ ...prev, [field]: value }));
      return;
    }
    
    // Pour les champs texte, utiliser le debounce
    debouncedSetFormData(field, value);
  }, []);

  const handleSubmit = () => {
    // Validation
    if (!formData.NomPièce?.trim()) {
      alert("Le nom de la pièce est obligatoire");
      return;
    }

    const qInv = parseInt(formData.QtéenInventaire, 10);
    const qMin = parseInt(formData.Qtéminimum, 10);
    const qMax = parseInt(formData.Qtémax, 10);
    const prix = parseFloat(formData.Prix_unitaire);

    const cleanedData = {
      ...formData,
      QtéenInventaire: isNaN(qInv) ? 0 : qInv,
      Qtéminimum: isNaN(qMin) ? 0 : qMin,
      Qtémax: isNaN(qMax) ? 100 : qMax,
      Prix_unitaire: isNaN(prix) ? 0 : prix,
      RéfFournisseur: formData.RéfFournisseur || null,
      RéfAutreFournisseur: formData.RéfAutreFournisseur || null,
      RefFabricant: formData.RefFabricant || null,
    };

    onSave(cleanedData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier la pièce</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
          {/* Informations de base */}
          <div>
            <Label>Nom de la pièce *</Label>
            <Input
              defaultValue={formData.NomPièce || ""}
              onChange={(e) => handleChange('NomPièce', e.target.value)}
            />
          </div>

          <div>
            <Label>N° de pièce</Label>
            <Input
              defaultValue={formData.NumPièce || ""}
              onChange={(e) => handleChange('NumPièce', e.target.value)}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Input
              defaultValue={formData.DescriptionPièce || ""}
              onChange={(e) => handleChange('DescriptionPièce', e.target.value)}
            />
          </div>

          {/* Fournisseurs */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-700 mb-3">Fournisseurs</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fournisseur principal</Label>
                <Select
                  value={formData.RéfFournisseur?.toString() || "none"}
                  onValueChange={(value) => {
                    if (value === "none") return handleChange('RéfFournisseur', null);
                    const n = parseInt(value, 10);
                    handleChange('RéfFournisseur', isNaN(n) ? null : n);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun fournisseur</SelectItem>
                    {fournisseurs?.map((f) => (
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
                  value={formData.RéfAutreFournisseur?.toString() || "none"}
                  onValueChange={(value) => {
                    if (value === "none") return handleChange('RéfAutreFournisseur', null);
                    const n = parseInt(value, 10);
                    handleChange('RéfAutreFournisseur', isNaN(n) ? null : n);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun fournisseur</SelectItem>
                    {fournisseurs?.map((f) => (
                      <SelectItem key={f.RéfFournisseur} value={f.RéfFournisseur.toString()}>
                        {f.NomFournisseur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-2">
              <Label>N° pièce autre fournisseur</Label>
              <Input
                defaultValue={formData.NumPièceAutreFournisseur || ""}
                onChange={(e) => handleChange('NumPièceAutreFournisseur', e.target.value)}
              />
            </div>
          </div>

          {/* Fabricant */}
          <div className="border-t pt-4">
            <Label>Fabricant</Label>
            <Select
              value={formData.RefFabricant?.toString() || "none"}
              onValueChange={(value) => {
                if (value === "none") return handleChange('RefFabricant', null);
                const n = parseInt(value, 10);
                handleChange('RefFabricant', isNaN(n) ? null : n);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un fabricant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun fabricant</SelectItem>
                {fabricants?.map((fab) => (
                  <SelectItem key={fab.RefFabricant} value={fab.RefFabricant.toString()}>
                    {fab.NomFabricant}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantités */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-700 mb-3">Quantités</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Qté stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.QtéenInventaire ?? ""}
                  onChange={(e) => handleChange('QtéenInventaire', e.target.value)}
                />
              </div>
              <div>
                <Label>Qté min</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.Qtéminimum ?? ""}
                  onChange={(e) => handleChange('Qtéminimum', e.target.value)}
                />
              </div>
              <div>
                <Label>Qté max</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.Qtémax ?? ""}
                  onChange={(e) => handleChange('Qtémax', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Stockage et prix */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Emplacement</Label>
              <Input
                defaultValue={formData.Lieuentreposage || ""}
                onChange={(e) => handleChange('Lieuentreposage', e.target.value)}
              />
            </div>
            <div>
              <Label>Prix unitaire (CAD $)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.Prix_unitaire ?? ""}
                onChange={(e) => handleChange('Prix_unitaire', e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-rio-red hover:bg-rio-red-dark"
            disabled={!formData.NomPièce?.trim()}
          >
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}