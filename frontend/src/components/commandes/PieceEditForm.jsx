import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import PieceFournisseursEditor from '@/components/pieces/PieceFournisseursEditor';

function DeviseSelect({ value, onChange }) {
  const DEVISES = ['CAD', 'USD'];
  const isAutre = value && !DEVISES.includes(value);
  return (
    <div className="flex gap-2">
      <Select
        value={isAutre ? 'autre' : (value || 'CAD')}
        onValueChange={v => onChange(v === 'autre' ? '' : v)}
      >
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CAD">CAD</SelectItem>
          <SelectItem value="USD">USD</SelectItem>
          <SelectItem value="autre">Autre…</SelectItem>
        </SelectContent>
      </Select>
      {(isAutre || value === '') && (
        <Input
          placeholder="ex: EUR"
          className="w-24"
          defaultValue={isAutre ? value : ''}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export default function PieceEditForm({ piece, fournisseurs, fabricants, onSave, onCancel, departements = [] }) {

  // Tous les champs dans un seul state — pas de debounce, mise à jour immédiate
  const [formData, setFormData] = useState({
    ...piece,
    NomPièce:                   piece.NomPièce                   || '',
    DescriptionPièce:           piece.DescriptionPièce           || '',
    NumPièce:                   piece.NumPièce                   || '',
    NumPièceAutreFournisseur:   piece.NumPièceAutreFournisseur   || '',
    RTBS:                       piece.RTBS                       || '',
    NoFESTO:                    piece.NoFESTO                    || '',
    Lieuentreposage:            piece.Lieuentreposage            || '',
    fournisseurs:               piece.fournisseurs               || [],
    devise:                     piece.devise                     || 'CAD',
  });

  // Une seule fonction de mise à jour, immédiate pour tout
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.NomPièce?.trim()) {
      toast({ title: 'Validation', description: "Le nom de la pièce est obligatoire", variant: 'destructive' });
      return;
    }

    const qInv  = parseInt(formData.QtéenInventaire, 10);
    const qMin  = parseInt(formData.Qtéminimum, 10);
    const qMax  = parseInt(formData.Qtémax, 10);
    const prix  = parseFloat(formData.Prix_unitaire);

    const cleanedData = {
      ...formData,
      QtéenInventaire: isNaN(qInv)  ? 0   : qInv,
      Qtéminimum:      isNaN(qMin)  ? 0   : qMin,
      Qtémax:          isNaN(qMax)  ? 100 : qMax,
      Prix_unitaire:   isNaN(prix)  ? 0   : prix,
      devise:          formData.devise || 'CAD',
      fournisseurs:    formData.fournisseurs || [],
      RefFabricant:    formData.RefFabricant    || null,
      RefDepartement:  formData.RefDepartement  !== undefined ? formData.RefDepartement : null,
      RTBS:            formData.RTBS || null,
    };

    onSave(cleanedData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] border-blue-600 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la pièce</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">

          {/* Nom */}
          <div>
            <Label>Nom de la pièce *</Label>
            <Input
              value={formData.NomPièce}
              onChange={e => handleChange('NomPièce', e.target.value)}
            />
          </div>

          {/* Numéros */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>N° de pièce</Label>
              <Input
                value={formData.NumPièce}
                onChange={e => handleChange('NumPièce', e.target.value)}
              />
            </div>
            <div>
              <Label>N° Fournisseur</Label>
              <Input
                value={formData.NumPièceAutreFournisseur}
                onChange={e => handleChange('NumPièceAutreFournisseur', e.target.value)}
              />
            </div>
            <div>
              <Label>N° SAP</Label>
              <Input
                value={formData.RTBS}
                onChange={e => handleChange('RTBS', e.target.value)}
              />
            </div>
            <div>
              <Label>N° Festo</Label>
              <Input
                value={formData.NoFESTO}
                onChange={e => handleChange('NoFESTO', e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Input
              value={formData.DescriptionPièce}
              onChange={e => handleChange('DescriptionPièce', e.target.value)}
            />
          </div>

          {/* Fournisseurs */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-700 mb-3 dark:text-white">Fournisseurs</h4>
            <PieceFournisseursEditor
              fournisseurs={formData.fournisseurs || []}
              allFournisseurs={fournisseurs || []}
              onChange={newList => handleChange('fournisseurs', newList)}
            />
          </div>

          {/* Fabricant */}
          <div className="border-t pt-4">
            <Label>Fabricant</Label>
            <Select
              value={formData.RefFabricant?.toString() || 'none'}
              onValueChange={value => {
                if (value === 'none') return handleChange('RefFabricant', null);
                const n = parseInt(value, 10);
                handleChange('RefFabricant', isNaN(n) ? null : n);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un fabricant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun fabricant</SelectItem>
                {fabricants?.map(fab => (
                  <SelectItem key={fab.RefFabricant} value={fab.RefFabricant.toString()}>
                    {fab.NomFabricant}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Département */}
          <div className="border-t pt-4">
            <Label>Département</Label>
            <Select
              value={formData.RefDepartement?.toString() || 'none'}
              onValueChange={value => {
                if (value === 'none') return handleChange('RefDepartement', null);
                const n = parseInt(value, 10);
                handleChange('RefDepartement', isNaN(n) ? null : n);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un département" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Aucun département</SelectItem>
                {departements.map(dept => (
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
                  value={formData.QtéenInventaire ?? 0}
                  onChange={e => handleChange('QtéenInventaire', e.target.value)}
                />
              </div>
              <div>
                <Label>Qté min</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.Qtéminimum ?? 0}
                  onChange={e => handleChange('Qtéminimum', e.target.value)}
                />
              </div>
              <div>
                <Label>Qté max</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.Qtémax ?? 100}
                  onChange={e => handleChange('Qtémax', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Emplacement, Prix, Devise */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Emplacement</Label>
              <Input
                value={formData.Lieuentreposage}
                onChange={e => handleChange('Lieuentreposage', e.target.value)}
              />
            </div>
            <div>
              <Label>Prix unitaire</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.Prix_unitaire ?? 0}
                onChange={e => handleChange('Prix_unitaire', e.target.value)}
              />
            </div>
            <div>
              <Label>Devise</Label>
              <DeviseSelect
                value={formData.devise || 'CAD'}
                onChange={v => handleChange('devise', v)}
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