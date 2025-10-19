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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{formData.RéfFournisseur ? "Modifier" : "Ajouter"} un Fournisseur</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-6">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom du fournisseur *</Label>
            <Input id="nom" value={formData.NomFournisseur} onChange={e => handleChange('NomFournisseur', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Contact</Label><Input value={formData.NomContact} onChange={e => handleChange('NomContact', e.target.value)} /></div>
            <div className="space-y-2"><Label>Titre</Label><Input value={formData.TitreContact} onChange={e => handleChange('TitreContact', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Téléphone</Label><Input value={formData.NuméroTél} onChange={e => handleChange('NuméroTél', e.target.value)} /></div>
            <div className="space-y-2"><Label>Télécopie</Label><Input value={formData.NumTélécopie} onChange={e => handleChange('NumTélécopie', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Adresse</Label><Textarea value={formData.Adresse} onChange={e => handleChange('Adresse', e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Ville</Label><Input value={formData.Ville} onChange={e => handleChange('Ville', e.target.value)} /></div>
            <div className="space-y-2"><Label>Code Postal</Label><Input value={formData.CodePostal} onChange={e => handleChange('CodePostal', e.target.value)} /></div>
            <div className="space-y-2"><Label>Pays</Label><Input value={formData.Pays} onChange={e => handleChange('Pays', e.target.value)} /></div>
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