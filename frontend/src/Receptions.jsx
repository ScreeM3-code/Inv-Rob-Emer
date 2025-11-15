import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { ClipboardCheck, Package, Truck, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { fetchJson, log } from './lib/utils';
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { useNavigate } from 'react-router-dom';
import SoumissionsHistoryDialog from '@/components/soumissions/SoumissionsHistoryDialog';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Receptions() {
  const [receptions, setReceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [selectedPiece, setSelectedPiece] = useState(null);
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
      alert("Erreur lors de la réception totale: " + error.message);
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
      alert("Erreur lors de la réception partielle: " + error.message);
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

        {/* Liste des réceptions */}
        <div className="grid gap-4">
          {receptions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune commande à recevoir</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Toutes les commandes ont été réceptionnées.
                </p>
              </CardContent>
            </Card>
          ) : (
            receptions.map((piece) => {
              const statutStock = getStockStatus(piece.QtéenInventaire, piece.Qtéminimum);
              return (
                <Card key={piece.RéfPièce} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <div>
                            <h2 className="font-semibold text-lg">{piece.NomPièce}  {getStockBadge(statutStock)} </h2>
                             <p className="text-sm text-gray-600">N° {piece.NumPièce}</p>
                            {piece.DescriptionPièce && (
                              <p className="text-sm text-gray-500 mt-1">{piece.DescriptionPièce}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-gray-500">Commandée:</span>
                            <div className="font-semibold text-blue-600">{piece.Qtécommandée}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Reçue:</span>
                            <div className="font-semibold text-green-600">{piece.Qtéreçue}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">À recevoir:</span>
                            <div className="font-semibold text-orange-600">{piece.Qtéarecevoir}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Stock actuel:</span>
                            <div className="font-semibold">{piece.QtéenInventaire}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Prix unitaire:</span>
                            <div className="font-semibold">{piece.Prix_unitaire.toLocaleString('fr-CA', {style: 'currency', currency: 'CAD'})}</div>
                          </div>
                        </div>

                        {/* Fournisseur */}
                        {piece.fournisseur_principal && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Fournisseur</h4>
                            <Badge variant="outline" className="text-rio-red border-rio-red">
                              {piece.fournisseur_principal.NomFournisseur}
                            </Badge>
                          </div>
                        )}

                        {/* Date de commande */}
                        {piece.Datecommande && (
                          <div className="mt-2 text-sm text-gray-500">
                            Commandé le: {new Date(piece.Datecommande).toLocaleDateString('fr-CA')}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <Button
                          onClick={() => handleReceiveTotal(piece.RéfPièce)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={piece.Qtéarecevoir <= 0}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Réception totale
                        </Button>
                        
                        <Button
                          onClick={() => openPartialDialog(piece)}
                          variant="outline"
                          disabled={piece.Qtéarecevoir <= 0}
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Réception partielle
                        </Button>

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
