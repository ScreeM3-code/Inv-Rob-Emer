import React from 'react';
import { log } from '../../lib/utils';
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
    soumission_LD: "",
    delai_livraison: "" // ← NOUVEAU
  });

    // Debounce pour les champs texte
    const debouncedSetFormData = React.useCallback(
      (fn => {
        let timeoutId;
        return (field, value) => {
          if (['Qtécommander', 'Prix_unitaire'].includes(field)) {
            // Mise à jour immédiate pour les champs numériques
            fn(prev => ({ ...prev, [field]: value }));
            return;
          }
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fn(prev => ({ ...prev, [field]: value })), 100);
        };
      })(setFormData),
      []
    );

    // Mémoiser les valeurs pour éviter des re-renders inutiles
    const memoizedValues = React.useMemo(() => ({
      Qtécommander: formData.Qtécommander,
      Prix_unitaire: formData.Prix_unitaire,
      Datecommande: formData.Datecommande,
      Cmd_info: formData.Cmd_info,
      soumission_LD: formData.soumission_LD
    }), [formData]);

  const handleSubmit = () => {
    if (!formData.Qtécommander || formData.Qtécommander <= 0) {
      alert("La quantité doit être supérieure à 0");
      return;
    }

    log('📦 Données envoyées depuis CommandeForm:', {
      ...piece,
      ...formData,
      Qtécommandée: formData.Qtécommander,
      Qtéarecevoir: formData.Qtécommander,
      Qtéreçue: 0,
      delai_livraison: formData.delai_livraison // ← PASSE LE DÉLAI
    });

    onSave({
      ...piece,
      ...formData,
      Qtécommandée: formData.Qtécommander,
      Qtéarecevoir: formData.Qtécommander,
      Qtéreçue: 0,
      delai_livraison: formData.delai_livraison
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
                  defaultValue={memoizedValues.Qtécommander}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                    debouncedSetFormData('Qtécommander', isNaN(v) ? 0 : v);
                }}
              />
            </div>
            <div>
              <Label>Prix unitaire (CAD $)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                  defaultValue={memoizedValues.Prix_unitaire}
                  onChange={(e) => debouncedSetFormData('Prix_unitaire', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date de commande</Label>
              <Input
                type="date"
                  defaultValue={memoizedValues.Datecommande}
                  onChange={(e) => debouncedSetFormData('Datecommande', e.target.value)}
              />
            </div>
            <div>
              <Label>Délai de livraison</Label>
              <Input
                defaultValue={memoizedValues.delai_livraison}
                onChange={(e) => debouncedSetFormData('delai_livraison', e.target.value)}
                placeholder="Ex: 2-3 semaines"
              />
            </div>
            <div>
              <Label># de Souimssion</Label>
              <Input
                  defaultValue={memoizedValues.soumission_LD}
                  onChange={(e) => debouncedSetFormData('soumission_LD', e.target.value)}
                placeholder="Numéro de Soumission"
              />
            </div>
          </div>
          <div>
            <Label>Commentaire / Info commande</Label>
            <Input
              defaultValue={memoizedValues.Cmd_info}
              onChange={(e) => debouncedSetFormData('Cmd_info', e.target.value)}
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