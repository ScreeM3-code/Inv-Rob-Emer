import React, { useEffect, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Plus, Edit3, Users, FileText, PackagePlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function ToOrders() {
  const [toorders, setToOrders] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingGoOrder, setEditingGoOrder] = useState(null); 
  const [goOrder, setGoOrder] = useState(null);
  const [fabricants, setFabricants] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async (page = 1) => {

    try {
      const [toordersRes, fournisseursRes, fabricantsRes] = await Promise.all([
        axios.get(`${API}/toorders`),
        axios.get(`${API}/fournisseurs`),
        axios.get(`${API}/fabricant`)
      ]);
    
      const fabricantsList = fabricantsRes.data || [];
      
      // Remplacer NomFabricant par RefFabricant 
      const commandesAvecRefFabricant = (toordersRes.data || []).map(order => {
        const fab = fabricantsList.find(f => f.NomFabricant === order.NomFabricant);
        return {
          ...order,
          RefFabricant: fab ? fab.RefFabricant : null
        };
      });
  
      setToOrders(commandesAvecRefFabricant);
      setFournisseurs(fournisseursRes.data || []);
      setFabricants(fabricantsList);
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
    }
    setCurrentPage(page);
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
      Lieu_d_entreposage: editingOrder.Lieu_d_entreposage || "",
      QtéenInventaire: editingOrder.QtéenInventaire ?? 0,
      Qtéminimum: editingOrder.Qtéminimum ?? 0,
      Qtémax: editingOrder.Qtémax ?? 100,
      Prix_unitaire: editingOrder.Prix_unitaire ?? 0,
      Soumission_LD: editingOrder.Soumission_LD || "",
      Qtécommandée: editingOrder.Qtécommandée ?? 0,
      Qtéreçue: editingOrder.Qtéreçue ?? 0,
      Datecommande: editingOrder.Datecommande || "",
      Qtéarecevoir: editingOrder.Qtéarecevoir ?? 0,
      Cmd_info: editingOrder.Cmd_info || "",
      Qtéàcommander: editingOrder.Qtéàcommander ?? 0,
    };
    delete cleanedOrder.NomFabricant;

    await axios.put(`${API}/pieces/${editingOrder.RéfPièce}`, cleanedOrder);
    setEditingOrder(null);
    loadData(currentPage);
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
        <div className="grid gap-4">
          {toorders.map((order) => (
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
                          N° {order.NumPièce} • N° Fabricant: {order.NumPièceAutreFournisseur}
                        </p>
                        {order.DescriptionPièce && (
                          <p className="text-sm text-gray-500 mt-1">{order.DescriptionPièce}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500">À commander:</span>
                        <div className="font-semibold text-yellow-600">{order.Qtéàcommander}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Inventaire:</span>
                        <div className="font-semibold text-yellow-600">{order.QtéenInventaire}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Min</span>
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
                              <span className="text-gray-500">Soumission LD:</span>
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

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGoOrder(order)}
                    >
                      <PackagePlus className="h-4 w-4" />
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
      </div>

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
                      value={editingOrder.RéfFournisseur?.toString() || ""}
                      onValueChange={(value) =>
                        setEditingOrder({ ...editingOrder, RéfFournisseur: value ? parseInt(value) : null })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
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
                      value={editingOrder.RéfAutreFournisseur?.toString() || ""}
                      onValueChange={(value) =>
                        setEditingOrder({ ...editingOrder, RéfAutreFournisseur: value ? parseInt(value) : null })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
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
                  value={editingOrder.RefFabricant?.toString() || ""}
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
                    value={editingOrder.Lieu_d_entreposage || ""}
                    onChange={(e) =>
                      setEditingOrder({ ...editingOrder, Lieu_d_entreposage: e.target.value })
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
       {/* Go Dialog - Passer commande */}
      {goOrder && (
        <Dialog open={true} onOpenChange={() => setGoOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Passer une commande</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
              <div>
                <Label>Pièce</Label>
                <Input value={goOrder.NomPièce} disabled />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantité à commander</Label>
                  <Input
                    type="number"
                    value={goOrder.Qtéàcommander ?? 0}
                    onChange={(e) => setGoOrder({ ...goOrder, Qtéàcommander: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Prix unitaire (CAD $)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={goOrder.Prix_unitaire ?? 0}
                    onChange={(e) => setGoOrder({ ...goOrder, Prix_unitaire: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div>
                <Label>Date de commande</Label>
                <Input
                  type="date"
                  value={goOrder.Datecommande ? new Date(goOrder.Datecommande).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                  onChange={(e) => setGoOrder({ ...goOrder, Datecommande: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Commentaire / Info commande</Label>
                <Input
                  value={goOrder.Cmd_info ?? ""}
                  onChange={(e) => setGoOrder({ ...goOrder, Cmd_info: e.target.value })}
                  placeholder="Numéro de bon de commande, fournisseur contacté, etc."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setGoOrder(null)}>
                Annuler
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    const commandeData = {
                      ...goOrder,
                      Qtécommandée: goOrder.Qtéàcommander,
                      Qtéarecevoir: goOrder.Qtéàcommander,
                      Qtéreçue: 0
                    };
                    
                    // Retire les champs calculés/affichage
                    delete commandeData.NomFabricant;
                    delete commandeData.fournisseur_principal;
                    delete commandeData.autre_fournisseur;
                    
                    await axios.put(`${API}/pieces/${goOrder.RéfPièce}`, commandeData);
                    setGoOrder(null);
                    loadData();
                  } catch (error) {
                    console.error("Erreur passage commande:", error);
                    alert("Erreur: " + (error.response?.data?.detail || error.message));
                  }
                }}
                className="bg-rio-red hover:bg-rio-red-dark"
              >
                Passer la commande
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
    
  );
}

export default ToOrders;
