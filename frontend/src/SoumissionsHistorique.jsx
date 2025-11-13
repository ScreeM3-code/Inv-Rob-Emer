import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Badge } from './components/ui/badge';
import { Loader2, FileText, Trash2, Eye } from 'lucide-react';
import { fetchJson } from './lib/utils';
import AnimatedBackground from "@/components/ui/AnimatedBackground";

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

export default function SoumissionsHistorique() {
  const [soumissions, setSoumissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSoumission, setSelectedSoumission] = useState(null);

  useEffect(() => {
    loadSoumissions();
  }, []);

  const loadSoumissions = async () => {
    try {
      setLoading(true);
      const data = await fetchJson(`${API_URL}/soumissions`);
      setSoumissions(data || []);
    } catch (error) {
      console.error('Erreur chargement soumissions:', error);
      setSoumissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette soumission de l\'historique ?')) return;
    
    try {
      await fetchJson(`${API_URL}/soumissions/${id}`, { method: 'DELETE' });
      await loadSoumissions();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AnimatedBackground />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <FileText className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historique des Soumissions</h1>
            <p className="text-sm text-gray-600 dark:text-white">
              Suivi des demandes de soumissions envoyées
            </p>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Soumissions envoyées ({soumissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {soumissions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p>Aucune soumission envoyée pour le moment</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date d'envoi</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Destinataires</TableHead>
                      <TableHead>Nb pièces</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {soumissions.map((soumission) => (
                      <TableRow key={soumission.RefSoumission}>
                        <TableCell className="font-medium">
                          {formatDate(soumission.DateEnvoi)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            {soumission.fournisseur_nom || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {soumission.EmailsDestinataires?.split(',').length || 0} email(s)
                        </TableCell>
                        <TableCell>
                          <Badge>{soumission.Pieces?.length || 0} pièce(s)</Badge>
                        </TableCell>
                        <TableCell>{soumission.User || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedSoumission(soumission)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(soumission.RefSoumission)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog Détails */}
        {selectedSoumission && (
          <Dialog open={true} onOpenChange={() => setSelectedSoumission(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-blue-600">
              <DialogHeader>
                <DialogTitle>Détails de la soumission</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-white">Date d'envoi</p>
                    <p className="text-sm ">{formatDate(selectedSoumission.DateEnvoi)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-white">Fournisseur</p>
                    <p className="text-sm">{selectedSoumission.fournisseur_nom}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-white">Utilisateur</p>
                    <p className="text-sm">{selectedSoumission.User}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-white">Destinataires</p>
                    <p className="text-sm">{selectedSoumission.EmailsDestinataires}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2 dark:text-white">Sujet</p>
                  <p className="text-sm p-2 rounded border border-blue-600">{selectedSoumission.Sujet}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2 dark:text-white">Pièces demandées</p>
                  <div className="border rounded border-blue-600">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Référence</TableHead>
                          <TableHead>Quantité</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSoumission.Pieces?.map((piece, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{piece.NomPièce}</TableCell>
                            <TableCell className="text-sm text-gray-500 dark:text-white ">
                              {piece.NumPièce}
                            </TableCell>
                            <TableCell>{piece.Quantite}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2 dark:text-white">Message</p>
                  <pre className="text-xs whitespace-pre-wrap p-3 rounded border border-blue-600 font-mono">
                    {selectedSoumission.MessageCorps}
                  </pre>
                </div>

                {selectedSoumission.Notes && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2 dark:text-white">Notes</p>
                    <p className="text-sm p-2 bg-yellow-50 rounded border border-yellow-200">
                      {selectedSoumission.Notes}
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}