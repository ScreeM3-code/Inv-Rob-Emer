import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import PieceFournisseursEditor from '@/components/pieces/PieceFournisseursEditor';

export default function PieceEditForm({ piece, fournisseurs, fabricants, onSave, onCancel, departements = [] }) {
  const [formData, setFormData] = React.useState({
    ...piece,
    fournisseurs: piece.fournisseurs || [],
  });

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
      toast({ title: 'Validation', description: "Le nom de la pièce est obligatoire", variant: 'destructive' });
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
      fournisseurs: formData.fournisseurs || [],
      RefFabricant: formData.RefFabricant || null,
      RefDepartement: formData.RefDepartement !== undefined ? formData.RefDepartement : null,
      RTBS: formData.RTBS || null,
    };

    onSave(cleanedData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] border-blue-600 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la pièce</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4 min-w-200">
          {/* Informations de base */}
          <div>
            <Label>Nom de la pièce *</Label>
            <Input
              defaultValue={formData.NomPièce || ""}
              onChange={(e) => handleChange('NomPièce', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Label>N° de pièce</Label>
            <Input
              defaultValue={formData.NumPièce || ""}
              onChange={(e) => handleChange('NumPièce', e.target.value)}
            />
            <Label>N° Fournisseur</Label>
            <Input
              defaultValue={formData.NumPièceAutreFournisseur || ""}
              onChange={(e) => handleChange('NumPièceAutreFournisseur', e.target.value)}
            />
            <Label>N° SAP</Label>
            <Input
              defaultValue={formData.RTBS || ""}
              onChange={(e) => handleChange('RTBS', e.target.value)}
            />
            <Label>N° Festo</Label>
            <Input
              defaultValue={formData.NoFESTO || ""}
              onChange={(e) => handleChange('NoFESTO', e.target.value)}
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
            <h4 className="font-semibold text-gray-700 mb-3 dark:text-white">Fournisseurs</h4>
            <PieceFournisseursEditor
              fournisseurs={formData.fournisseurs || []}
              allFournisseurs={fournisseurs || []}
              onChange={(newList) => handleChange('fournisseurs', newList)}
            />
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

          
          <div className="border-t pt-4">
            <Label>Département</Label>
            <Select
              value={formData.RefDepartement?.toString() || "none"}
              onValueChange={(value) => {
                if (value === "none") return handleChange('RefDepartement', null);
                const n = parseInt(value, 10);
                handleChange('RefDepartement', isNaN(n) ? null : n);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un département" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Aucun département</SelectItem>
                {departements.map((dept) => (
                  <SelectItem key={dept.RefDepartement} value={dept.RefDepartement.toString()}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dept.Couleur || '#6366f1' }}
                      />
                      {dept.NomDepartement}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantités */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-700 mb-3 dark:text-white">Quantités</h4>
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