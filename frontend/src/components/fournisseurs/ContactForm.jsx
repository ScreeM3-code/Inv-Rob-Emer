import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Save, X } from "lucide-react";

export default function ContactForm({ contact, onSave, onCancel }) {
  const [formData, setFormData] = useState(contact || { Nom: "", Titre: "", Email: "", Telephone: "", Cell: "", Produit: "" });

  useEffect(() => {
    setFormData(contact || { Nom: "", Titre: "", Email: "", Telephone: "", Cell: "", Produit: "" });
  }, [contact]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="nom-contact">Nom *</Label>
              <Input id="nom-contact" value={formData.Nom} onChange={e => handleChange('Nom', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="titre-contact">Titre</Label>
              <Input id="titre-contact" value={formData.Titre} onChange={e => handleChange('Titre', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email-contact">Email</Label>
            <Input id="email-contact" type="email" value={formData.Email} onChange={e => handleChange('Email', e.target.value)} />
          </div>
           <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="tel-contact">Téléphone</Label>
              <Input id="tel-contact" value={formData.Telephone} onChange={e => handleChange('Telephone', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cell-contact">Cellulaire</Label>
              <Input id="cell-contact" value={formData.Cell} onChange={e => handleChange('Cell', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="produit-contact">Produit/Service</Label>
            <Input id="produit-contact" value={formData.Produit} onChange={e => handleChange('Produit', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            {onCancel && <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>}
            <Button type="submit" size="sm"><Save className="w-4 h-4 mr-2" /> Sauvegarder</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}