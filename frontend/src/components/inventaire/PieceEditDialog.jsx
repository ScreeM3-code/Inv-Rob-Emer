import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PieceFournisseursEditor from '@/components/pieces/PieceFournisseursEditor';
import BarcodeScanner from "./BarcodeScanner";

function DeviseSelect({ value, onChange }) {
  const DEVISES = ['CAD', 'USD'];
  const [custom, setCustom] = React.useState(
    value && !DEVISES.includes(value) ? value : ''
  );
  const isAutre = value && !DEVISES.includes(value);

  return (
    <div className="flex gap-2">
      <Select
        value={isAutre ? 'autre' : (value || 'CAD')}
        onValueChange={v => {
          if (v === 'autre') onChange('');
          else onChange(v);
        }}
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
          value={custom}
          onChange={e => { setCustom(e.target.value); onChange(e.target.value); }}
        />
      )}
    </div>
  );
}

export default function PieceEditDialog({
  piece,
  fournisseurs,
  fabricants,
  onSave,
  onCancel,
  onChange,
  departements = [],
  isEditing = false
}) {
  if (!piece) return null;

  // State local pour tous les champs texte — pas de debounce, mise à jour immédiate
  const [local, setLocal] = useState({
    NomPièce:                   piece.NomPièce                   || '',
    DescriptionPièce:           piece.DescriptionPièce           || '',
    NumPièce:                   piece.NumPièce                   || '',
    NumPièceAutreFournisseur:   piece.NumPièceAutreFournisseur   || '',
    RTBS:                       piece.RTBS                       || '',
    NoFESTO:                    piece.NoFESTO                    || '',
    Lieuentreposage:            piece.Lieuentreposage            || '',
  });
  
  const [pendingImageUrl, setPendingImageUrl] = useState(null);

  // Met à jour le state local ET notifie le parent immédiatement
  const handleText = (field, value) => {
    setLocal(prev => ({ ...prev, [field]: value }));
    onChange(field, value);
  };

  // Pour les champs non-texte (select, number) on notifie directement le parent
  const handleOther = (field, value) => {
    onChange(field, value);
  };

  const handleBarcodeResult = (data) => {
    if (data.NomPièce) {
      handleText('NomPièce', data.NomPièce);
    }
    if (data.DescriptionPièce) {
      handleText('DescriptionPièce', data.DescriptionPièce);
    }
    if (data.NumPièce) {
      handleText('NumPièce', data.NumPièce);
    }
    if (data.QtéenInventaire != null) {
      handleOther('QtéenInventaire', data.QtéenInventaire);
    }
    if (data.image_url) {
      setPendingImageUrl(data.image_url);
    }
  };

  const handleBarcodeNotFound = (code) => {
    handleText('NumPièce', code);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg"> {isEditing ? 'Modifier' : 'Ajouter'} la pièce</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:gap-4 py-3 md:py-4">

          {/* Scanner code barre */}
          <BarcodeScanner
            onResult={handleBarcodeResult}
            onNotFound={handleBarcodeNotFound}
          />

          {/* Nom */}
          <div>
            <Label className="text-xs md:text-sm">Nom de la pièce *</Label>
            <Input
              value={local.NomPièce}
              onChange={e => handleText('NomPièce', e.target.value)}
              className="h-9 md:h-10 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs md:text-sm">Description</Label>
            <Input
              value={local.DescriptionPièce}
              onChange={e => handleText('DescriptionPièce', e.target.value)}
              className="h-9 md:h-10 text-sm"
            />
          </div>

          {/* Numéros de pièce */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <Label className="text-xs md:text-sm">N° de pièce</Label>
              <Input
                value={local.NumPièce}
                onChange={e => handleText('NumPièce', e.target.value)}
                className="h-9 md:h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs md:text-sm">N° pièce fournisseur</Label>
              <Input
                value={local.NumPièceAutreFournisseur}
                onChange={e => handleText('NumPièceAutreFournisseur', e.target.value)}
                className="h-9 md:h-10 text-sm"
              />
            </div>
          </div>

          {/* N° SAP et FESTO */}
          <div className="hidden md:grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">N° SAP</Label>
              <Input
                value={local.RTBS}
                onChange={e => handleText('RTBS', e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-sm">N° Festo</Label>
              <Input
                value={local.NoFESTO}
                onChange={e => handleText('NoFESTO', e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          {/* Fournisseurs */}
          <div className="border-t pt-3 md:pt-4">
            <h4 className="font-semibold text-gray-700 mb-2 md:mb-3 text-sm md:text-base dark:text-white">Fournisseurs</h4>
            <PieceFournisseursEditor
              fournisseurs={piece.fournisseurs || []}
              allFournisseurs={fournisseurs || []}
              onChange={newList => handleOther('fournisseurs', newList)}
            />
          </div>

          {/* Fabricant */}
          <div className="border-t pt-3 md:pt-4">
            <Label className="text-xs md:text-sm">Fabricant</Label>
            <Select
              value={piece.RefFabricant?.toString() || 'none'}
              onValueChange={value => {
                if (value === 'none') return handleOther('RefFabricant', null);
                const n = parseInt(value, 10);
                handleOther('RefFabricant', isNaN(n) ? null : n);
              }}
            >
              <SelectTrigger className="h-9 md:h-10 text-sm">
                <SelectValue placeholder="Sélectionner un fabricant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {fabricants.map(fab => (
                  <SelectItem key={fab.RefFabricant} value={fab.RefFabricant.toString()}>
                    {fab.NomFabricant}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Département */}
          <div>
            <Label>Département</Label>
            <Select
              value={piece.RefDepartement?.toString() || 'none'}
              onValueChange={value => {
                const n = value === 'none' ? null : parseInt(value, 10);
                handleOther('RefDepartement', isNaN(n) ? null : n);
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
          <div className="border-t pt-3 md:pt-4">
            <h4 className="font-semibold text-gray-700 mb-2 md:mb-3 text-sm md:text-base dark:text-white">Quantités</h4>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div>
                <Label className="text-xs md:text-sm">Stock *</Label>
                <Input
                  type="number"
                  min={0}
                  value={piece.QtéenInventaire ?? 0}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '') return handleOther('QtéenInventaire', 0);
                    const n = parseInt(v, 10);
                    handleOther('QtéenInventaire', Math.max(0, isNaN(n) ? 0 : n));
                  }}
                  className="h-9 md:h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs md:text-sm">Min *</Label>
                <Input
                  type="number"
                  min={0}
                  value={piece.Qtéminimum ?? 0}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '') return handleOther('Qtéminimum', 0);
                    const n = parseInt(v, 10);
                    handleOther('Qtéminimum', Math.max(0, isNaN(n) ? 0 : n));
                  }}
                  className="h-9 md:h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs md:text-sm">Max</Label>
                <Input
                  type="number"
                  min={0}
                  value={piece.Qtémax ?? 100}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '') return handleOther('Qtémax', 100);
                    const n = parseInt(v, 10);
                    handleOther('Qtémax', Math.max(0, isNaN(n) ? 0 : n));
                  }}
                  className="h-9 md:h-10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Emplacement et Prix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <Label className="text-xs md:text-sm">Emplacement</Label>
              <Input
                value={local.Lieuentreposage}
                onChange={e => handleText('Lieuentreposage', e.target.value)}
                className="h-9 md:h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs md:text-sm">Prix unitaire ({piece.devise || 'CAD'}) *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={piece.Prix_unitaire ?? 0}
                onChange={e => {
                  const v = e.target.value;
                  handleOther('Prix_unitaire', v === '' ? 0 : Math.max(0, parseFloat(v) || 0));
                }}
                className="h-9 md:h-10 text-sm"
              />
            </div>
            <div>
              <Label>Devise</Label>
              <DeviseSelect
                value={piece.devise || 'CAD'}
                onChange={v => handleOther('devise', v)}
              />
            </div>
          </div>

        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} className="h-9 text-sm">
            Annuler
          </Button>
          <Button
            onClick={onSave}
            disabled={!local.NomPièce?.trim()}
            className="bg-rio-red hover:bg-rio-red-dark h-9 text-sm"
          >
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}