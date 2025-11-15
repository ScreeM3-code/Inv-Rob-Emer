import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, DollarSign, Package, Save, AlertCircle } from 'lucide-react';
import { fetchJson } from '../../lib/utils';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

export default function SoumissionDetailDialog({ soumission, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [prixData, setPrixData] = useState({});
  const [noteStatut, setNoteStatut] = useState('');
  const [dateRappel, setDateRappel] = useState('');
  const [prixRecus, setPrixRecus] = useState([]);

  useEffect(() => {
    if (soumission) {
      loadPrixRecus();
      setNoteStatut(soumission.NoteStatut || '');
      setDateRappel(soumission.DateRappel ? soumission.DateRappel.split('T')[0] : '');
    }
  }, [soumission]);

  const loadPrixRecus = async () => {
    try {
      const data = await fetchJson(`${API_URL}/soumissions/${soumission.RefSoumission}/prix`);
      setPrixRecus(data || []);
      
      // Initialiser prixData avec les prix existants
      const initialPrix = {};
      data.forEach(p => {
        initialPrix[p.RéfPièce] = {
          PrixUnitaire: p.PrixUnitaire,
          DelaiLivraison: p.DelaiLivraison,
          Commentaire: p.Commentaire
        };
      });
      setPrixData(initialPrix);
    } catch (error) {
      console.error('Erreur chargement prix:', error);
    }
  };

  const handleSavePrix = async (piece) => {
    const prix = prixData[piece.RéfPièce];
    if (!prix || !prix.PrixUnitaire) {
      alert('Veuillez entrer un prix');
      return;
    }

    try {
      setLoading(true);
      await fetchJson(`${API_URL}/soumissions/${soumission.RefSoumission}/prix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RefSoumission: soumission.RefSoumission,
          RéfPièce: piece.RéfPièce,
          PrixUnitaire: parseFloat(prix.PrixUnitaire),
          DelaiLivraison: prix.DelaiLivraison || '',
          Commentaire: prix.Commentaire || ''
        })
      });
      await loadPrixRecus();
    } catch (error) {
      alert('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatut = async (newStatut) => {
    try {
      setLoading(true);
      await fetchJson(
        `${API_URL}/soumissions/${soumission.RefSoumission}/statut-complet?statut=${encodeURIComponent(newStatut)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            note: noteStatut,
            date_rappel: dateRappel || null
          })
        }
      );
      onUpdate();
      onClose();
    } catch (error) {
      alert('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateJoursDepuis = () => {
    if (!soumission.DateEnvoi) return 0;
    const now = new Date();
    const envoi = new Date(soumission.DateEnvoi);
    return Math.floor((now - envoi) / (1000 * 60 * 60 * 24));
  };

  const joursDepuis = calculateJoursDepuis();
  const shouldRemind = joursDepuis >= 7 && soumission.Statut === 'Envoyée';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Gestion de la soumission - {soumission.fournisseur_nom}</span>
            <Badge className={
              soumission.Statut === 'Envoyée' ? 'bg-blue-500' :
              soumission.Statut === 'Prix reçu' ? 'bg-green-500' :
              soumission.Statut === 'Commandée' ? 'bg-purple-500' : 'bg-red-500'
            }>
              {soumission.Statut}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alerte rappel */}
          {shouldRemind && (
            <Card className="border-orange-500 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                  <div>
                    <p className="font-semibold text-orange-900">
                      Soumission envoyée il y a {joursDepuis} jours
                    </p>
                    <p className="text-sm text-orange-700">
                      Suggestion : Relancer le fournisseur ?
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Infos générales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Date d'envoi</p>
                <p className="font-medium">
                  {new Date(soumission.DateEnvoi).toLocaleDateString('fr-CA', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Utilisateur</p>
                <p className="font-medium">{soumission.User}</p>
              </div>
              <div>
                <p className="text-gray-500">Destinataires</p>
                <p className="font-medium text-xs">{soumission.EmailsDestinataires}</p>
              </div>
              <div>
                <p className="text-gray-500">Nombre de pièces</p>
                <p className="font-medium">{soumission.Pieces?.length || 0} pièce(s)</p>
              </div>
            </CardContent>
          </Card>

          {/* Saisie des prix */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Prix et délais de livraison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pièce</TableHead>
                    <TableHead>Qté</TableHead>
                    <TableHead>Prix unitaire</TableHead>
                    <TableHead>Délai</TableHead>
                    <TableHead>Commentaire</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {soumission.Pieces?.map((piece, idx) => {
                    const prixExistant = prixRecus.find(p => p.RéfPièce === piece.RéfPièce);
                    return (
                      <TableRow key={idx} className={prixExistant ? 'bg-green-50' : ''}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{piece.NomPièce}</p>
                            <p className="text-xs text-gray-500">{piece.NumPièce}</p>
                          </div>
                        </TableCell>
                        <TableCell>{piece.Quantite}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00 $"
                            className="w-24"
                            value={prixData[piece.RéfPièce]?.PrixUnitaire || ''}
                            onChange={(e) => setPrixData({
                              ...prixData,
                              [piece.RéfPièce]: {
                                ...prixData[piece.RéfPièce],
                                PrixUnitaire: e.target.value
                              }
                            })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Ex: 2-3 sem"
                            className="w-28"
                            value={prixData[piece.RéfPièce]?.DelaiLivraison || ''}
                            onChange={(e) => setPrixData({
                              ...prixData,
                              [piece.RéfPièce]: {
                                ...prixData[piece.RéfPièce],
                                DelaiLivraison: e.target.value
                              }
                            })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Note..."
                            className="w-32"
                            value={prixData[piece.RéfPièce]?.Commentaire || ''}
                            onChange={(e) => setPrixData({
                              ...prixData,
                              [piece.RéfPièce]: {
                                ...prixData[piece.RéfPièce],
                                Commentaire: e.target.value
                              }
                            })}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleSavePrix(piece)}
                            disabled={loading}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Note et rappel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes et suivi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Note sur le statut</Label>
                <Textarea
                  placeholder="Ex: Fournisseur a répondu par téléphone, prix compétitif..."
                  value={noteStatut}
                  onChange={(e) => setNoteStatut(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Date de rappel (optionnel)
                </Label>
                <Input
                  type="date"
                  value={dateRappel}
                  onChange={(e) => setDateRappel(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Changer le statut</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {soumission.Statut === 'Envoyée' && (
                  <>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleChangeStatut('Prix reçu')}
                      disabled={loading}
                    >
                      💰 Marquer "Prix reçu"
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-500 text-red-500"
                      onClick={() => handleChangeStatut('Annulée')}
                      disabled={loading}
                    >
                      ❌ Annuler
                    </Button>
                  </>
                )}
                {soumission.Statut === 'Prix reçu' && (
                  <>
                    <Button
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => handleChangeStatut('Commandée')}
                      disabled={loading}
                    >
                      ✅ Marquer "Commandée"
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleChangeStatut('Envoyée')}
                      disabled={loading}
                    >
                      ← Retour à "Envoyée"
                    </Button>
                  </>
                )}
                {soumission.Statut === 'Commandée' && (
                  <Badge className="bg-purple-500 text-white px-4 py-2">
                    ✅ Soumission traitée et commandée
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}