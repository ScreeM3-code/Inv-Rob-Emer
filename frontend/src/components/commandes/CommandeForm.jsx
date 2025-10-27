import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CommandeForm({ piece, onSave, onCancel }) {
  const [formData, setFormData] = React.useState({
    Qtécommander: piece?.Qtéàcommander || 0,
    Prix_unitaire: piece?.Prix_unitaire || 0,
    Datecommande: new Date().toISOString().split('T')[0],
    Cmd_info: "",
    soumission_LD: ""
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.Qtécommander || formData.Qtécommander <= 0) {
      alert("La quantité doit être supérieure à 0");
      return;
    }

    console.log('📦 Données envoyées depuis CommandeForm:', {
      ...piece,
      ...formData,
      Qtécommandée: formData.Qtécommander,
      Qtéarecevoir: formData.Qtécommander,
      Qtéreçue: 0,
    });

    onSave({
      ...piece,
      ...formData,
      Qtécommandée: formData.Qtécommander,
      Qtéarecevoir: formData.Qtécommander,
      Qtéreçue: 0,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Passer une commande</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <Label>Pièce</Label>
            <Input value={piece?.NomPièce || ""} disabled />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantité commander *</Label>
              <Input
                type="number"
                min="1"
                value={formData.Qtécommander}
                onChange={(e) => handleChange('Qtécommander', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Prix unitaire (CAD $)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.Prix_unitaire}
                onChange={(e) => handleChange('Prix_unitaire', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date de commande</Label>
              <Input
                type="date"
                value={formData.Datecommande}
                onChange={(e) => handleChange('Datecommande', e.target.value)}
              />
            </div>
            <div>
              <Label># de Souimssion</Label>
              <Input
                value={formData.soumission_LD}
                onChange={(e) => handleChange('soumission_LD', e.target.value)}
                placeholder="Numéro de Soumission"
              />
            </div>
          </div>
          <div>
            <Label>Commentaire / Info commande</Label>
            <Input
              value={formData.Cmd_info}
              onChange={(e) => handleChange('Cmd_info', e.target.value)}
              placeholder="Numéro de bon de commande, fournisseur contacté, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-rio-red hover:bg-rio-red-dark"
            disabled={!formData.Qtécommander || formData.Qtécommander <= 0}
          >
            Passer la commande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}