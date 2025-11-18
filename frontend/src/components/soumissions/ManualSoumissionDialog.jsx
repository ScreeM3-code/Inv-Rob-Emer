import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, Upload, Loader2 } from "lucide-react";
import { fetchJson } from '../../lib/utils';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

export default function ManualSoumissionDialog({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  
  const [formData, setFormData] = useState({
    RéfFournisseur: null,
    EmailsDestinataires: '',
    Sujet: 'Demande de soumission',
    MessageCorps: '',
    Notes: '',
    selectedPieces: [] // [{RéfPièce, Quantite}]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [fournisseursRes, piecesRes] = await Promise.all([
        fetchJson(`${API_URL}/fournisseurs`),
        fetchJson(`${API_URL}/pieces`)
      ]);
      setFournisseurs(fournisseursRes || []);
      setPieces(piecesRes || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    }
  };

  const handleAddPiece = () => {
    setFormData({
      ...formData,
      selectedPieces: [...formData.selectedPieces, { RéfPièce: null, Quantite: 1 }]
    });
  };

  const handleRemovePiece = (index) => {
    setFormData({
      ...formData,
      selectedPieces: formData.selectedPieces.filter((_, i) => i !== index)
    });
  };

  const handlePieceChange = (index, field, value) => {
    const updated = [...formData.selectedPieces];
    updated[index][field] = field === 'Quantite' ? parseInt(value) || 1 : parseInt(value);
    setFormData({ ...formData, selectedPieces: updated });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.RéfFournisseur) {
      alert('Sélectionnez un fournisseur');
      return;
    }
    if (!formData.EmailsDestinataires) {
      alert('Entrez au moins un email');
      return;
    }
    if (formData.selectedPieces.length === 0) {
      alert('Ajoutez au moins une pièce');
      return;
    }
    if (formData.selectedPieces.some(p => !p.RéfPièce)) {
      alert('Toutes les pièces doivent être sélectionnées');
      return;
    }

    try {
      setLoading(true);

      // Récupérer l'utilisateur
      const userData = await fetchJson(`${API_URL}/current-user`);

      // Préparer les données des pièces
      const piecesData = formData.selectedPieces.map(sp => {
        const piece = pieces.find(p => p.RéfPièce === sp.RéfPièce);
        return {
          RéfPièce: sp.RéfPièce,
          NomPièce: piece?.NomPièce || '',
          NumPièce: piece?.NumPièce || '',
          NumPièceAutreFournisseur: piece?.NumPièceAutreFournisseur || '',
          DescriptionPièce: piece?.DescriptionPièce || '',
          Quantite: sp.Quantite,
          Prix_unitaire: piece?.Prix_unitaire || 0
        };
      });

      // Créer la soumission
      const soumission = await fetchJson(`${API_URL}/soumissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RéfFournisseur: formData.RéfFournisseur,
          EmailsDestinataires: formData.EmailsDestinataires,
          Sujet: formData.Sujet,
          MessageCorps: formData.MessageCorps || 'Soumission ajoutée manuellement',
          Pieces: piecesData,
          User: userData.user || 'Système',
          Notes: formData.Notes || 'Ajouté manuellement depuis l\'interface'
        })
      });

      // Si un PDF est fourni, l'uploader
      if (pdfFile && soumission.RefSoumission) {
        const formDataPdf = new FormData();
        formDataPdf.append('file', pdfFile);

        await fetch(`${API_URL}/uploads/soumission/${soumission.RefSoumission}`, {
          method: 'POST',
          body: formDataPdf
        });
      }

      alert('✅ Soumission ajoutée avec succès');
      onSuccess();
    } catch (error) {
      console.error('Erreur création:', error);
      alert('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedFournisseur = fournisseurs.find(f => f.RéfFournisseur === formData.RéfFournisseur);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une soumission manuellement</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Fournisseur */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Fournisseur *</Label>
                <Select
                  value={formData.RéfFournisseur?.toString() || ''}
                  onValueChange={(value) => {
                    const id = parseInt(value);
                    const fourn = fournisseurs.find(f => f.RéfFournisseur === id);
                    const emails = fourn?.contacts?.map(c => c.Email).filter(Boolean).join(', ') || '';
                    setFormData({
                      ...formData,
                      RéfFournisseur: id,
                      EmailsDestinataires: emails
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {fournisseurs.map(f => (
                      <SelectItem key={f.RéfFournisseur} value={f.RéfFournisseur.toString()}>
                        {f.NomFournisseur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Emails destinataires *</Label>
                <Input
                  value={formData.EmailsDestinataires}
                  onChange={(e) => setFormData({ ...formData, EmailsDestinataires: e.target.value })}
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">Séparez plusieurs emails par des virgules</p>
              </div>
            </CardContent>
          </Card>

          {/* Pièces */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Pièces demandées *</Label>
                <Button size="sm" variant="outline" onClick={handleAddPiece}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une pièce
                </Button>
              </div>

              {formData.selectedPieces.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4 border-2 border-dashed rounded">
                  Aucune pièce ajoutée
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.selectedPieces.map((sp, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded">
                      <div className="flex-1">
                        <Select
                          value={sp.RéfPièce?.toString() || ''}
                          onValueChange={(value) => handlePieceChange(index, 'RéfPièce', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une pièce" />
                          </SelectTrigger>
                          <SelectContent>
                            {pieces.map(p => (
                              <SelectItem key={p.RéfPièce} value={p.RéfPièce.toString()}>
                                {p.NomPièce} ({p.NumPièce})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-24">
                        <Input
                          type="number"
                          min="1"
                          value={sp.Quantite}
                          onChange={(e) => handlePieceChange(index, 'Quantite', e.target.value)}
                          placeholder="Qté"
                        />
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemovePiece(index)}
                        className="text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Détails */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Sujet</Label>
                <Input
                  value={formData.Sujet}
                  onChange={(e) => setFormData({ ...formData, Sujet: e.target.value })}
                />
              </div>

              <div>
                <Label>Message / Description</Label>
                <Textarea
                  value={formData.MessageCorps}
                  onChange={(e) => setFormData({ ...formData, MessageCorps: e.target.value })}
                  rows={4}
                  placeholder="Détails de la soumission..."
                />
              </div>

              <div>
                <Label>Notes internes</Label>
                <Textarea
                  value={formData.Notes}
                  onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
                  rows={2}
                  placeholder="Notes pour votre équipe..."
                />
              </div>

              {/* Upload PDF */}
              <div>
                <Label className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Pièce jointe (PDF)
                </Label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                />
                {pdfFile && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {pdfFile.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              'Créer la soumission'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}