import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function FabricantFormDialog({ fabricant, onSave, onCancel }) {
  // ✅ FIX: S'assurer que toutes les valeurs sont des strings (jamais undefined/null)
  const [formData, setFormData] = useState(fabricant ? {
    RefFabricant: fabricant.RefFabricant || undefined,
    NomFabricant: fabricant.NomFabricant || "",
    Domaine: fabricant.Domaine || "",
    NomContact: fabricant.NomContact || "",
    TitreContact: fabricant.TitreContact || "",
    Email: fabricant.Email || ""
  } : {
    NomFabricant: "",
    Domaine: "",
    NomContact: "",
    TitreContact: "",
    Email: ""
  });
  
    // Debounce les mises à jour d'état
    const debouncedSetFormData = React.useCallback(
      (fn => {
        let timeoutId;
        return (field, value) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fn(p => ({ ...p, [field]: value })), 100);
        };
      })(setFormData),
      []
    );

    // Mémoiser les valeurs pour éviter des re-renders inutiles
    const memoizedValues = React.useMemo(() => ({
      NomFabricant: formData.NomFabricant,
      Domaine: formData.Domaine,
      NomContact: formData.NomContact,
      TitreContact: formData.TitreContact,
      Email: formData.Email
    }), [formData]);

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{formData.RefFabricant ? "Modifier" : "Ajouter"} un Fabricant</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-6">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom du fabricant *</Label>
            <Input 
              id="nom" 
                defaultValue={memoizedValues.NomFabricant}
                onChange={e => debouncedSetFormData('NomFabricant', e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domaine">Domaine (pour le logo, ex: bosch.com)</Label>
            <Input 
              id="domaine" 
                defaultValue={memoizedValues.Domaine}
                onChange={e => debouncedSetFormData('Domaine', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact</Label>
              <Input 
                value={formData.NomContact} 
                onChange={e => handleChange('NomContact', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input 
                value={formData.TitreContact} 
                onChange={e => handleChange('TitreContact', e.target.value)} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input 
              type="email" 
              value={formData.Email} 
              onChange={e => handleChange('Email', e.target.value)} 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={() => onSave(formData)}>Sauvegarder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}