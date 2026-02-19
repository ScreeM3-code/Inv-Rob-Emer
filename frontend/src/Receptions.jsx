import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { ClipboardCheck, Package, Truck, AlertCircle, CheckCircle, FileText, Search  } from 'lucide-react';
import { fetchJson, log } from './lib/utils';
import { toast } from '@/hooks/use-toast';
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { useNavigate } from 'react-router-dom';
import SoumissionsHistoryDialog from '@/components/soumissions/SoumissionsHistoryDialog';
import { usePermissions } from '@/hooks/usePermissions';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Receptions() {
  const [receptions, setReceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFourn, setFilterFourn] = useState('');
  const { can, isAdmin } = usePermissions();
  const [viewingSoumissionsFor, setViewingSoumissionsFor] = useState(null);
  const [partialQuantity, setPartialQuantity] = useState('');
  const [isPartialDialogOpen, setIsPartialDialogOpen] = useState(false);

  useEffect(() => {
    loadReceptions();
  }, []);

  const loadReceptions = async () => {
    try {
      setLoading(true);
      const data = await fetchJson(`${API}/commande`);
      setReceptions(data || []);
    } catch (error) {
      log("Erreur chargement réceptions:", error);
      setReceptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveTotal = async (pieceId) => {
    try {
      await fetchJson(`${API}/ordersall/${pieceId}`, { method: 'PUT' });
      await loadReceptions();
    } catch (error) {
      log("Erreur réception totale:", error);
      toast({ title: 'Erreur réception', description: error.message, variant: 'destructive' });
    }
  };

  const handleReceivePartial = async () => {
    if (!selectedPiece || !partialQuantity) return;
    
    try {
      await fetchJson(`${API}/orderspar/${selectedPiece.RéfPièce}?quantity_received=${partialQuantity}`, { method: 'PUT' });
      setIsPartialDialogOpen(false);
      setSelectedPiece(null);
      setPartialQuantity('');
      await loadReceptions();
    } catch (error) {
      log("Erreur réception partielle:", error);
      toast({ title: 'Erreur réception', description: error.message, variant: 'destructive' });
    }
  };

  const openPartialDialog = (piece) => {
    setSelectedPiece(piece);
    setPartialQuantity('');
    setIsPartialDialogOpen(true);
  };

  const getStockStatus = (qtyInventaire, qtyMinimum) => {
    if (qtyInventaire < qtyMinimum) return "critique";
    if (qtyInventaire <= qtyMinimum) return "faible";
    return "ok";
  };

  const getStockBadge = (statut) => {
    switch (statut) {
      case "critique":
        return <Badge className="bg-red-500 text-white">Stock Critique</Badge>;
      case "faible":
        return <Badge className="bg-yellow-500 text-white">Stock Faible</Badge>;
      default:
        return <Badge className="bg-green-500 text-white">Stock OK</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground /> 
        <div className="text-xl text-gray-600">Chargement des réceptions...</div>
      </div>
    );
  }

  const fournisseursUniques = [...new Set(
    receptions.map(p => p.fournisseur_principal?.NomFournisseur || p.autre_fournisseur?.NomFournisseur || '').filter(Boolean)
  )];

  const filteredReceptions = receptions.filter(piece => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || 
      piece.NomPièce?.toLowerCase().includes(q) ||
      piece.NumPièce?.toLowerCase().includes(q) ||
      piece.Cmd_info?.toLowerCase().includes(q) ||
      piece.fournisseur_principal?.NomFournisseur?.toLowerCase().includes(q) ||
      piece.autre_fournisseur?.NomAutreFournisseur?.toLowerCase().includes(q);
    const matchFourn = !filterFourn || 
      piece.fournisseur_principal?.NomFournisseur === filterFourn ||
      piece.autre_fournisseur?.NomFournisseur === filterFourn;
    return matchSearch && matchFourn;
  });

  return (
    <div className="min-h-screen">
      <AnimatedBackground />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <ClipboardCheck className="h-8 w-8 text-rio-red" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Réceptions de Commandes</h1>
            <p className="text-sm text-gray-600 dark:text-white">Gestion des livraisons et mise à jour du stock</p>
          </div>
        </div>

        {/* Barre de recherche / filtre */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, numéro, DA, fournisseur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {fournisseursUniques.length > 0 && (
            <select
              value={filterFourn}
              onChange={(e) => setFilterFourn(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="">Tous les fournisseurs</option>
              {fournisseursUniques.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          )}
          {(searchQuery || filterFourn) && (
            <Button variant="outline" onClick={() => { setSearchQuery(''); setFilterFourn(''); }}>
              Effacer
            </Button>
          )}
        </div>

        {/* Liste des réceptions */}
        <div className="grid gap-4">
          {filteredReceptions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {receptions.length === 0 ? 'Aucune commande à recevoir' : 'Aucun résultat pour cette recherche'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {receptions.length === 0 ? 'Toutes les commandes ont été réceptionnées.' : 'Essayez d\'autres termes de recherche.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredReceptions.map((piece) => {
              const statutStock = getStockStatus(piece.QtéenInventaire, piece.Qtéminimum);
              const imageUrl = `${API}/pieces/${piece.RéfPièce}/image`;
              const autreFourn = piece.autre_fournisseur || piece.RéfAutreFournisseur || null;
              return (
                <Card key={piece.RéfPièce} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start space-x-4 mb-4">
                          <div className="w-40 h-40 flex-shrink-0 rounded overflow-hidden bg-white border">
                            <img src={imageUrl} alt={piece.NomPièce} className="w-full h-full object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <h2 className="font-semibold text-lg">{piece.NomPièce}</h2>
                              <div className="ml-4">{getStockBadge(statutStock)}</div>
                            </div>

                            <div className="text-sm text-gray-600 mt-1 dark:text-white">N° {piece.NumPièce}</div>
                            <div className="text-sm text-gray-600 mt-1 dark:text-white">N° {piece.NumPièceAutreFournisseur}</div>
                            <div className="text-sm text-gray-600 mt-1 dark:text-white">N° {piece.NoFESTO}</div>

                            {piece.DescriptionPièce && (
                              <p className="text-sm text-gray-500 mt-3 dark:text-white">{piece.DescriptionPièce}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-white">Commandée:</span>
                            <div className="font-semibold text-blue-600">{piece.Qtécommandée}</div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-white">Reçue:</span>
                            <div className="font-semibold text-green-600">{piece.Qtéreçue}</div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-white">À recevoir:</span>
                            <div className="font-semibold text-orange-600">{piece.Qtéarecevoir}</div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-white">Stock actuel:</span>
                            <div className="font-semibold">{piece.QtéenInventaire}</div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-white">Prix unitaire:</span>
                            <div className="font-semibold">{piece.Prix_unitaire.toLocaleString('fr-CA', {style: 'currency', currency: 'CAD'})}</div>
                          </div>
                        </div>

                        {/* Fournisseur */}
                        {piece.fournisseur_principal && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 dark:text-white">Fournisseur</h4>
                            <Badge variant="outline" className="text-rio-red border-rio-red">
                              {piece.fournisseur_principal.NomFournisseur}
                            </Badge>
                          </div>
                        )}

                        {/* Date de commande */}
                        {piece.Datecommande && (
                          <div className="mt-2 text-sm text-gray-500 dark:text-white">
                            Commandé le: {new Date(piece.Datecommande).toLocaleDateString('fr-CA')}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        {can('receptions_update') && <Button
                          onClick={() => handleReceiveTotal(piece.RéfPièce)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={piece.Qtéarecevoir <= 0}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Réception totale
                        </Button>}
                        
                        {can('receptions_update') && <Button
                          onClick={() => openPartialDialog(piece)}
                          variant="outline"
                          disabled={piece.Qtéarecevoir <= 0}
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Réception partielle
                        </Button>}

                        {/* ← NOUVEAU BOUTON */}
                        <Button
                          variant="outline"
                          onClick={() => setViewingSoumissionsFor(piece)}
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Soumissions
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Dialog réception partielle */}
        <Dialog open={isPartialDialogOpen} onOpenChange={setIsPartialDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Réception partielle</DialogTitle>
              <DialogDescription>
                Quantité à recevoir pour {selectedPiece?.NomPièce}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div>
                <Label>Quantité à recevoir</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedPiece?.Qtéarecevoir || 0}
                  value={partialQuantity}
                  onChange={(e) => setPartialQuantity(e.target.value)}
                  placeholder={`Max: ${selectedPiece?.Qtéarecevoir || 0}`}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Quantité restante à recevoir: {selectedPiece?.Qtéarecevoir || 0}
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPartialDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleReceivePartial}
                disabled={!partialQuantity || partialQuantity <= 0 || partialQuantity > (selectedPiece?.Qtéarecevoir || 0)}
                className="bg-rio-red hover:bg-rio-red-dark"
              >
                Confirmer la réception
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {viewingSoumissionsFor && (
          <SoumissionsHistoryDialog
            piece={viewingSoumissionsFor}
            onClose={() => setViewingSoumissionsFor(null)}
          />
        )}
      </div>
    </div>
  );
}

export default Receptions;
