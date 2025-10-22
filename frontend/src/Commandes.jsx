import React, { useEffect, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Plus, Edit3, Users, FileText, PackagePlus, Mail, ShoppingCart, CheckCircle, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import axios from "axios";
import HistoriqueDialog from "@/components/commandes/HistoriqueDialog";
import PieceEditForm from "@/components/commandes/PieceEditForm";
import CommandeForm from "@/components/commandes/CommandeForm";
import CartWidget from "@/components/cart/CartWidget";
import { useCart } from "@/components/cart/CartContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Commandes() {
  const [toorders, setToOrders] = useState([]);
  const { addToCart, cartItems } = useCart();
  const isInCart = cartItems.some(item => item.RéfPièce === commande.RéfPièce);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingGoOrder, setEditingGoOrder] = useState(null); 
  const [goOrder, setGoOrder] = useState(null);
  const [fabricants, setFabricants] = useState([]);
  const [viewingHistoryFor, setViewingHistoryFor] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
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

  const handleViewHistory = async (piece) => {
    // Correction: use API instead of undefined URL, handle non-JSON gracefully
    console.log("🔍 Ouverture historique pour pièce:", piece.RéfPièce); // DEBUG
    setViewingHistoryFor(piece);
    setHistoryLoading(true);
    setHistoryData([]);
    try {
      const response = await fetch(`${API}/historique/${piece.RéfPièce}`);
      if (!response.ok) {
        throw new Error("Erreur lors du chargement de l'historique de la pièce.");
      }

      // Handle HTML/text or bad JSON response
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        console.log("📊 Données reçues de l'API:", data); // DEBUG
        console.log("📊 Nombre de lignes:", data.length); // DEBUG
        setHistoryData(data);
      } else {
        const text = await response.text();
        if (text && text.startsWith('<!DOCTYPE')) {
          // Server misrouted, or error page: treat as error
          throw new Error("Réponse inattendue du serveur (HTML au lieu de JSON).");
        }
        // Try parsing anyway, fallback on empty or show error
        try {
          const data = JSON.parse(text);
          setHistoryData(data);
        } catch (parseErr) {
          throw new Error("La réponse de l'historique est invalide ou non parsable.");
        }
      }
    } catch (err) {
      console.error("Erreur chargement historique:", err);
      setHistoryData([]); // reset to empty in case of any error
    } finally {
      setHistoryLoading(false);
    }
  };

  function SoumDemBadge({ soumDem }) {
    return (
      <div className="flex items-center gap-2">
        {soumDem ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            <span>Soumission demandée</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
            <XCircle className="w-4 h-4" />
            <span>Soumission non demandée</span>
          </div>
        )}
      </div>
    );
  }


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
                    {(order.Soumission_LD || order.SoumDem !== undefined) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Soumissions
                          <span className="ml-2">
                            {order.SoumDem ? (
                              <CheckCircle
                                className="w-5 h-5 text-green-500 inline-block"
                                title="Soumission demandée"
                              />
                            ) : (
                              <XCircle
                                className="w-5 h-5 text-red-500 inline-block"
                                title="Soumission non demandée"
                              />
                            )}
                          </span>
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
                      onClick={() => handleViewHistory(order)}
                      title="Voir l'historique"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    {viewingHistoryFor && viewingHistoryFor.RéfPièce === order.RéfPièce && (
                      <HistoriqueDialog
                        piece={viewingHistoryFor}
                        history={historyData}
                        isLoading={historyLoading}
                        onOpenChange={() => setViewingHistoryFor(null)}
                      />
                    )}
                    <Button 
                      onClick={() => addToCart(commande)} 
                      disabled={isInCart}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    <ShoppingCart className="w-4 h-4 mr-2" /> {isInCart ? 'Dans le Email' : 'Ajouter pour soumission'}
                  </Button>
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
         <PieceEditForm
           piece={editingOrder}
           fournisseurs={fournisseurs}
           fabricants={fabricants}
           onSave={() => {
             setEditingOrder(null);
             loadData(currentPage);
           }}
           onCancel={() => setEditingOrder(null)}
         />
       )}


       {/* Passer commande */}
      {goOrder && (
        <CommandeForm
          piece={goOrder} // Pass the entire piece/order object as "piece"
          fournisseurs={fournisseurs}
          fabricants={fabricants}
          onSave={() => {
            setGoOrder(null);
            loadData(currentPage);
          }}
        />
      )}

    </div>
    
  );
}

export default Commandes;
