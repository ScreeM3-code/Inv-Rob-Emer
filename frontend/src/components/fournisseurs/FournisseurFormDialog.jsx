import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function FournisseurFormDialog({ fournisseur, onSave, onCancel }) {
  const [formData, setFormData] = useState(fournisseur || {
    NomFournisseur: "", NomContact: "", TitreContact: "", Adresse: "",
    Ville: "", CodePostal: "", Pays: "", NuméroTél: "", NumTélécopie: ""
  });
  
  const handleChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg">
            {formData.RéfFournisseur ? "Modifier" : "Ajouter"} un Fournisseur
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 md:gap-4 py-3 md:py-4 max-h-[60vh] overflow-y-auto px-3 md:px-6">
          <div className="space-y-2">
            <Label htmlFor="nom" className="text-xs md:text-sm">Nom du fournisseur *</Label>
            <Input 
              id="nom" 
              value={formData.NomFournisseur} 
              onChange={e => handleChange('NomFournisseur', e.target.value)} 
              required 
              className="h-9 md:h-10 text-sm"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">NumSap</Label>
              <Input 
                value={formData.NumSap} 
                onChange={e => handleChange('NumSap', e.target.value)} 
                className="h-9 md:h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">NuméroTél</Label>
              <Input 
                value={formData.NuméroTél} 
                onChange={e => handleChange('NuméroTél', e.target.value)} 
                className="h-9 md:h-10 text-sm"
              />
            </div>
          </div>
          
          {/* Produit et Marque - masqués sur mobile */}
          <div className="hidden md:grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Produit</Label>
              <Textarea 
                value={formData.Produit} 
                onChange={e => handleChange('Produit', e.target.value)} 
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Marque</Label>
              <Textarea 
                value={formData.Marque} 
                onChange={e => handleChange('Marque', e.target.value)} 
                className="text-sm"
              />
            </div>
          </div>
          
          {/* Adresse - masquée sur mobile */}
          <div className="hidden md:block space-y-2">
            <Label>Adresse</Label>
            <Textarea 
              value={formData.Adresse} 
              onChange={e => handleChange('Adresse', e.target.value)} 
              className="text-sm"
            />
          </div>
          
          {/* Ville, Code Postal, Pays - masqués sur mobile */}
          <div className="hidden md:grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input 
                value={formData.Ville} 
                onChange={e => handleChange('Ville', e.target.value)} 
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Code Postal</Label>
              <Input 
                value={formData.CodePostal} 
                onChange={e => handleChange('CodePostal', e.target.value)} 
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Pays</Label>
              <Input 
                value={formData.Pays} 
                onChange={e => handleChange('Pays', e.target.value)} 
                className="h-10 text-sm"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} className="h-9 text-sm">Annuler</Button>
          <Button onClick={() => onSave(formData)} className="h-9 text-sm">Sauvegarder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}