import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Badge } from './components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Loader2, FileText, Trash2, Plus } from 'lucide-react';
import { fetchJson } from './lib/utils';
import { toast } from '@/hooks/use-toast';
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import SoumissionDetailDialog from '@/components/soumissions/SoumissionDetailDialog';
import { Edit , CircleCheck, AlertTriangle} from 'lucide-react';
import ManualSoumissionDialog from '@/components/soumissions/ManualSoumissionDialog';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

// Fonction pour obtenir le badge selon le statut
const getStatutBadge = {
  Envoyée: { label: "📤 Envoyée", color: "bg-blue-500 text-white", icon: <AlertTriangle className="w-4 h-4" /> },
  "Prix reçu": { label: "💰 Prix reçu", color: "bg-blue-500 text-white", icon: <AlertTriangle className="w-4 h-4" /> },
  Commandée: { label: "✅ Commandée", color: "bg-purple-500 text-white", icon: <CircleCheck className="w-4 h-4" /> },
  Annulée: { label: "❌ Annulée", color: "bg-red-500 text-white", icon: <CircleCheck className="w-4 h-4" /> }
};

export default function SoumissionsHistorique() {
  const [soumissions, setSoumissions] = useState([]);
  const StatutBadge = getStatutBadge[soumissions.Statut] || getStatutBadge.Envoyée;
  const [loading, setLoading] = useState(true);
  const [selectedSoumission, setSelectedSoumission] = useState(null);
  const [manualDialog, setManualDialog] = useState({ open: false });
  const [filterStatut, setFilterStatut] = useState('tous');

  useEffect(() => {
    loadSoumissions();
  }, []);

  const loadSoumissions = async () => {
    try {
      setLoading(true);
      // Force un nouveau fetch sans cache
      const data = await fetchJson(`${API_URL}/soumissions?t=${Date.now()}`);
      console.log('📊 Soumissions chargées:', data); // ← DEBUG
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
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const handleStatutChange = async (soumissionId, newStatut) => {
    try {
      console.log(`🔄 Changement statut: ${soumissionId} → ${newStatut}`); // ← DEBUG
      
      const response = await fetchJson(
        `${API_URL}/soumissions/${soumissionId}/statut?statut=${encodeURIComponent(newStatut)}`,
        { method: 'PUT' }
      );
      
      console.log('✅ Réponse backend:', response); // ← DEBUG
      
      // Recharger les données
      await loadSoumissions();
      
    } catch (error) {
      console.error('❌ Erreur changement statut:', error);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Filtrage par statut
  const filteredSoumissions = filterStatut === 'tous' 
    ? soumissions 
    : soumissions.filter(s => s.Statut === filterStatut);

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historique des Soumissions</h1>
              <p className="text-sm text-gray-600 dark:text-white">
                Suivi des demandes de soumissions envoyées
              </p>
            </div>
          </div>
            {/* Boutons d'action */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setManualDialog({ open: true })}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter manuellement
              </Button>
            </div>
          {/* Filtre par statut */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Filtrer:</span>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                <SelectItem value="Envoyée">📤 Envoyée</SelectItem>
                <SelectItem value="Prix reçu">💰 Prix reçu</SelectItem>
                <SelectItem value="Commandée">✅ Commandée</SelectItem>
                <SelectItem value="Annulée">❌ Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{soumissions.length}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {soumissions.filter(s => s.Statut === 'Prix reçu').length}
                </p>
                <p className="text-sm text-gray-600">Prix reçus</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {soumissions.filter(s => s.Statut === 'Commandée').length}
                </p>
                <p className="text-sm text-gray-600">Commandées</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {soumissions.filter(s => s.Statut === 'Envoyée').length}
                </p>
                <p className="text-sm text-gray-600">En attente</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Soumissions {filterStatut !== 'tous' && `- ${filterStatut}`} ({filteredSoumissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSoumissions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p>Aucune soumission {filterStatut !== 'tous' && `avec le statut "${filterStatut}"`}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date d'envoi</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Nb pièces</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date réponse</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredSoumissions.map((soumission) => (
                    <TableRow key={soumission.RefSoumission}>
                      <TableCell className="font-medium">
                        {formatDate(soumission.DateEnvoi)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          {soumission.fournisseur_nom || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{soumission.Pieces?.length || 0} pièce(s)</Badge>
                      </TableCell>
                      
                      {/* Badge statut */}
                      <TableCell>
                        {soumission.Statut === 'Envoyée' && (
                          <Badge className="bg-blue-500 text-white">📤 Envoyée</Badge>
                        )}
                        {soumission.Statut === 'Prix reçu' && (
                          <Badge className="bg-green-500 text-white">💰 Prix reçu</Badge>
                        )}
                        {soumission.Statut === 'Commandée' && (
                          <Badge className="bg-purple-500 text-white">✅ Commandée</Badge>
                        )}
                        {soumission.Statut === 'Annulée' && (
                          <Badge className="bg-red-500 text-white">❌ Annulée</Badge>
                        )}
                        {!soumission.Statut && (
                          <Badge className="bg-blue-500 text-white">📤 Envoyée</Badge>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-sm text-gray-500">
                        {soumission.DateReponse ? formatDate(soumission.DateReponse) : '-'}
                      </TableCell>
                      <TableCell>{soumission.User || 'N/A'}</TableCell>
                      
                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          {/* Bouton Gérer (ouvre le dialog détaillé) */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedSoumission(soumission)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Gérer
                          </Button>
                          
                          {/* Boutons de changement de statut rapide */}
                          {soumission.Statut === 'Envoyée' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={async () => {
                                  await handleStatutChange(soumission.RefSoumission, 'Prix reçu');
                                }}
                              >
                                💰 Prix reçu
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500 text-red-500 hover:bg-red-50"
                                onClick={async () => {
                                  if (confirm('Annuler cette soumission ?')) {
                                    await handleStatutChange(soumission.RefSoumission, 'Annulée');
                                  }
                                }}
                              >
                                ❌ Annuler
                              </Button>
                            </>
                          )}
                          
                          {soumission.Statut === 'Prix reçu' && (
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={async () => {
                                await handleStatutChange(soumission.RefSoumission, 'Commandée');
                              }}
                            >
                              ✅ Commander
                            </Button>
                          )}
                          
                          {/* Bouton Supprimer (toujours visible) */}
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

        {/* Dialog Détails (inchangé) */}
        {selectedSoumission && (
          <SoumissionDetailDialog
            soumission={selectedSoumission}
            onClose={() => setSelectedSoumission(null)}
            onUpdate={loadSoumissions}
          />
        )}
      </div>
      {manualDialog.open && (
        <ManualSoumissionDialog
          onClose={() => setManualDialog({ open: false })}
          onSuccess={() => {
            setManualDialog({ open: false });
            loadSoumissions();
          }}
        />
      )}
    </div>
  );
}