import React, { useEffect, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Edit3, Users, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import axios from "axios";
import { CheckCircle, PackagePlus } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Commande() {
  const [commande, setCommande] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [fabricants, setFabricants] = useState([]);
  const [openPartial, setOpenPartial] = useState(false);
  const [qtyReceived, setQtyReceived] = useState(0);
  const [selectedPieceId, setSelectedPieceId] = useState(null);

  const loadData = async () => {
    try {
      const [commandeRes, fournisseursRes, fabricantsRes] = await Promise.all([
        axios.get(`${API}/commande`),
        axios.get(`${API}/fournisseurs`),
        axios.get(`${API}/fabricant`)
      ]);

      const fabricantsList = fabricantsRes.data || [];

      // Remplacer NomFabricant par RefFabricant si possible
      const commandesAvecRefFabricant = (commandeRes.data || []).map(order => {
        const fab = fabricantsList.find(f => f.NomFabricant === order.NomFabricant);
        return {
          ...order,
          RefFabricant: fab ? fab.RefFabricant : null
        };
      });

      setCommande(commandesAvecRefFabricant);
      setFournisseurs(fournisseursRes.data || []);
      setFabricants(fabricantsList);
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
    }
  };

  // Réception totale
  const handleReceiveTotal = async (RéfPièce) => {
    try {
      await axios.put(`${API}/ordersall/${RéfPièce}`);
      // Recharger les données après la réception
      loadData();
    } catch (error) {
      console.error("Erreur réception totale:", error);
    }
  };

  // Réception partielle
  const handleReceivePartial = async () => {
    if (!selectedPieceId || !qtyReceived) return;
    
    try {
      await axios.put(`${API}/orderspar/${selectedPieceId}`, null, {
        params: { quantity_received: qtyReceived }
      });
      
      setOpenPartial(false);
      setQtyReceived(0);
      setSelectedPieceId(null);
      // Recharger les données après la réception
      loadData();
    } catch (error) {
      console.error("Erreur réception partielle:", error);
    }
  };

  // Mettre à jour une commande/pièce
  const handleUpdateOrder = async () => {
    try {
      const cleanedOrder = {
        ...editingOrder,
        RéfPièce: editingOrder.RéfPièce,
        NomPièce: editingOrder.NomPièce || "",
        DescriptionPièce: editingOrder.DescriptionPièce || "",
        NumPièce: editingOrder.NumPièce || "",
        RéfFournisseur: editingOrder.RéfFournisseur || null,
        RéfAutreFournisseur: editingOrder.RéfAutreFournisseur || null,
        NumPièceAutreFournisseur: editingOrder.NumPièceAutreFournisseur || "",
        RefFabricant: editingOrder.RefFabricant || null,
        Lieuentreposage: editingOrder.Lieuentreposage || "",
        QtéenInventaire: editingOrder.QtéenInventaire ?? 0,
        Qtéminimum: editingOrder.Qtéminimum ?? 0,
        Qtémax: editingOrder.Qtémax ?? 100,
        Prix_unitaire: editingOrder.Prix_unitaire ?? 0,
        Soumission_LD: editingOrder.Soumission_LD || "",
        SoumDem: editingOrder.SoumDem || ""
      };
      delete cleanedOrder.NomFabricant;
      delete cleanedOrder.fournisseur_principal;
      delete cleanedOrder.autre_fournisseur;
      delete cleanedOrder.Qtécommandée;
      delete cleanedOrder.Datecommande;
      delete cleanedOrder.Qtéreçue;
      delete cleanedOrder.Qtéarecevoir;
      delete cleanedOrder.Cmd_info;
      delete cleanedOrder.Qtéàcommander;

      await axios.put(`${API}/pieces/${editingOrder.RéfPièce}`, cleanedOrder);
      setEditingOrder(null);
      loadData();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error.response?.data || error.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Commandes en cours</h1>
          <p className="text-gray-600">Gestion des réceptions de pièces commandées</p>
        </div>

        <div className="grid gap-4">
          {commande.map((order) => (
            <Card key={order.RéfPièce} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center">
                          {order.NomPièce}
                        </h3>
                        <p className="text-sm text-gray-600">
                          N° {order.NumPièce} {order.NumPièceAutreFournisseur && `• N° Fabricant: ${order.NumPièceAutreFournisseur}`}
                        </p>
                        {order.DescriptionPièce && (
                          <p className="text-sm text-gray-500 mt-1">{order.DescriptionPièce}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500">Date commande:</span>
                        <div className="font-semibold text-yellow-600">
                          {order.Datecommande ? new Date(order.Datecommande).toLocaleDateString() : "Non définie"}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Quantité à recevoir:</span>
                        <div className="font-semibold text-yellow-600">{order.Qtéarecevoir || 0}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Quantité reçue:</span>
                        <div className="font-semibold text-yellow-600">{order.Qtéreçue || 0}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Commentaire:</span>
                        <div className="font-semibold">{order.Cmd_info || "Aucun"}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500">Quantité commandée:</span>
                        <div className="font-semibold text-yellow-600">{order.Qtécommandée || 0}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Inventaire:</span>
                        <div className="font-semibold text-yellow-600">{order.QtéenInventaire}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Min:</span>
                        <div className="font-semibold text-yellow-600">{order.Qtéminimum}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Prix unitaire:</span>
                        <div className="font-semibold">
                          {order.Prix_unitaire.toLocaleString("fr-CA", {
                            style: "currency",
                            currency: "CAD",
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {/* Fournisseurs */}
                    {(order.fournisseur_principal || order.autre_fournisseur || order.NomFabricant) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Fournisseurs
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {order.fournisseur_principal && (
                            <Badge variant="outline" className="text-rio-red border-rio-red">
                              Principal: {order.fournisseur_principal.NomFournisseur}
                            </Badge>
                          )}
                          {order.autre_fournisseur && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              Autre: {order.autre_fournisseur.NomFournisseur}
                            </Badge>
                          )}
                          {order.NomFabricant && (
                            <Badge variant="outline" className="bg-indigo-600 text-white">
                              Fabricant: {order.NomFabricant}
                            </Badge>
                          )}
                        </div>
                        {order.NumPièceAutreFournisseur && (
                          <p className="text-xs text-gray-500 mt-1">
                            N° autre fournisseur: {order.NumPièceAutreFournisseur}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Soumissions */}
                    {(order.Soumission_LD || order.SoumDem) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Soumissions
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {order.Soumission_LD && (
                            <div>
                              <span className="text-gray-500">Soumission:</span>
                              <div className="font-medium">{order.Soumission_LD}</div>
                            </div>
                          )}
                          {order.SoumDem && (
                            <div>
                              <span className="text-gray-500">Soum. demandée:</span>
                              <div className="font-medium">{order.SoumDem}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Réception totale */}
                    <Button 
                      onClick={() => handleReceiveTotal(order.RéfPièce)} 
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4" /> 
                      Reçu
                    </Button>
                    
                    {/* Réception partielle */}
                    <Button
                      onClick={() => {
                        setSelectedPieceId(order.RéfPièce);
                        setOpenPartial(true);
                      }}
                      variant="secondary"
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <PackagePlus className="w-4 h-4" /> 
                      Partielle
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingOrder(order)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {commande.length === 0 && (
          <div className="text-center py-12">
            <PackagePlus className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune commande en cours</h3>
            <p className="mt-1 text-sm text-gray-500">
              Les pièces commandées apparaîtront ici.
            </p>
          </div>
        )}
      </div>

      {/* Fenêtre réception partielle */}
      <Dialog open={openPartial} onOpenChange={setOpenPartial}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réception partielle</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Label>Quantité reçue</Label>
            <Input
              type="number"
              value={qtyReceived}
              onChange={(e) => setQtyReceived(parseInt(e.target.value) || 0)}
              placeholder="Quantité reçue"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPartial(false)}>
              Annuler
            </Button>
            <Button onClick={handleReceivePartial} className="bg-blue-600 hover:bg-blue-700">
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingOrder && (
        <Dialog open={true} onOpenChange={() => setEditingOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier la pièce</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
              <div>
                <Label>Nom de la pièce</Label>
                <Input
                  value={editingOrder.NomPièce}
                  onChange={(e) => setEditingOrder({ ...editingOrder, NomPièce: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={editingOrder.DescriptionPièce || ""}
                  onChange={(e) => setEditingOrder({ ...editingOrder, DescriptionPièce: e.target.value })}
                />
              </div>

              {/* Fournisseurs */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-700 mb-3">Fournisseurs</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fournisseur principal</Label>
                    <Select
                      value={editingOrder.RéfFournisseur?.toString() || "none"}
                      onValueChange={(value) =>
                        setEditingOrder({ ...editingOrder, RéfFournisseur: value ? parseInt(value) : null })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun fournisseur</SelectItem>
                        {fournisseurs.map((f) => (
                          <SelectItem key={f.RéfFournisseur} value={f.RéfFournisseur.toString()}>
                            {f.NomFournisseur}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Autre fournisseur</Label>
                    <Select
                      value={editingOrder.RéfAutreFournisseur?.toString() || "none"}
                      onValueChange={(value) =>
                        setEditingOrder({ ...editingOrder, RéfAutreFournisseur: value ? parseInt(value) : null })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun fournisseur</SelectItem>
                        {fournisseurs.map((f) => (
                          <SelectItem key={f.RéfFournisseur} value={f.RéfFournisseur.toString()}>
                            {f.NomFournisseur}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-2">
                  <Label>N° pièce autre fournisseur</Label>
                  <Input
                    value={editingOrder.NumPièceAutreFournisseur || ""}
                    onChange={(e) =>
                      setEditingOrder({ ...editingOrder, NumPièceAutreFournisseur: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Fabricant */}
              <div className="border-t pt-4">
                <Label>Fabricant</Label>
                <Select
                  value={editingOrder.RefFabricant?.toString() || "none"}
                  onValueChange={(value) =>
                    setEditingOrder({
                      ...editingOrder,
                      RefFabricant: value ? parseInt(value) : null,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fabricant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun fabricant</SelectItem>
                    {fabricants.map((fab) => (
                      <SelectItem key={fab.RefFabricant} value={fab.RefFabricant.toString()}>
                        {fab.NomFabricant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stock */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <Label>Qté stock</Label>
                  <Input
                    type="number"
                    value={editingOrder.QtéenInventaire}
                    onChange={(e) =>
                      setEditingOrder({ ...editingOrder, QtéenInventaire: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label>Qté min</Label>
                  <Input
                    type="number"
                    value={editingOrder.Qtéminimum}
                    onChange={(e) =>
                      setEditingOrder({ ...editingOrder, Qtéminimum: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label>Qté max</Label>
                  <Input
                    type="number"
                    value={editingOrder.Qtémax}
                    onChange={(e) =>
                      setEditingOrder({ ...editingOrder, Qtémax: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Emplacement</Label>
                  <Input
                    value={editingOrder.Lieuentreposage || ""}
                    onChange={(e) =>
                      setEditingOrder({ ...editingOrder, Lieuentreposage: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Prix unitaire (CAD $)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingOrder.Prix_unitaire}
                    onChange={(e) =>
                      setEditingOrder({ ...editingOrder, Prix_unitaire: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingOrder(null)}>
                Annuler
              </Button>
              <Button onClick={handleUpdateOrder} className="bg-rio-red hover:bg-rio-red-dark">
                Sauvegarder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default Commande;