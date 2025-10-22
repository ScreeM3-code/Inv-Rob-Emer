import React, { useEffect, useState } from "react";
import axios from "axios";
import HistoriqueDialog from "@/components/commandes/HistoriqueDialog";
import PieceEditForm from "@/components/commandes/PieceEditForm";
import CommandeForm from "@/components/commandes/CommandeForm";
import CommandeCard from "@/components/commandes/CommandeCard";
import CartWidget from "@/components/cart/CartWidget";
import { useCart } from "@/components/cart/CartContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Commandes() {
  const [toorders, setToOrders] = useState([]);
  const { addToCart, cartItems } = useCart();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [fabricants, setFabricants] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [goOrder, setGoOrder] = useState(null);
  const [viewingHistoryFor, setViewingHistoryFor] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

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
    console.log("🔍 Ouverture historique pour pièce:", piece.RéfPièce);
    setViewingHistoryFor(piece);
    setHistoryLoading(true);
    setHistoryData([]);
    
    try {
      const response = await fetch(`${API}/historique/${piece.RéfPièce}`);
      if (!response.ok) {
        throw new Error("Erreur lors du chargement de l'historique de la pièce.");
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        console.log("📊 Données reçues de l'API:", data);
        setHistoryData(data);
      } else {
        const text = await response.text();
        if (text && text.startsWith('<!DOCTYPE')) {
          throw new Error("Réponse inattendue du serveur (HTML au lieu de JSON).");
        }
        try {
          const data = JSON.parse(text);
          setHistoryData(data);
        } catch (parseErr) {
          throw new Error("La réponse de l'historique est invalide ou non parsable.");
        }
      }
    } catch (err) {
      console.error("Erreur chargement historique:", err);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleUpdateOrder = async (updatedPiece) => {
    try {
      const cleanedOrder = {
        ...updatedPiece,
        RéfPièce: updatedPiece.RéfPièce,
        NomPièce: updatedPiece.NomPièce || "",
        DescriptionPièce: updatedPiece.DescriptionPièce || "",
        NumPièce: updatedPiece.NumPièce || "",
        RéfFournisseur: updatedPiece.RéfFournisseur || null,
        RéfAutreFournisseur: updatedPiece.RéfAutreFournisseur || null,
        NumPièceAutreFournisseur: updatedPiece.NumPièceAutreFournisseur || "",
        RefFabricant: updatedPiece.RefFabricant || null,
        Lieuentreposage: updatedPiece.Lieuentreposage || "",
        QtéenInventaire: updatedPiece.QtéenInventaire ?? 0,
        Qtéminimum: updatedPiece.Qtéminimum ?? 0,
        Qtémax: updatedPiece.Qtémax ?? 100,
        Prix_unitaire: updatedPiece.Prix_unitaire ?? 0,
        Soumission_LD: updatedPiece.Soumission_LD || "",
        Qtécommandée: updatedPiece.Qtécommandée ?? 0,
        Qtéreçue: updatedPiece.Qtéreçue ?? 0,
        Datecommande: updatedPiece.Datecommande || "",
        Qtéarecevoir: updatedPiece.Qtéarecevoir ?? 0,
        Cmd_info: updatedPiece.Cmd_info || "",
        Qtéàcommander: updatedPiece.Qtéàcommander ?? 0,
      };
      
      delete cleanedOrder.NomFabricant;

      await axios.put(`${API}/pieces/${updatedPiece.RéfPièce}`, cleanedOrder);
      setEditingOrder(null);
      loadData(currentPage);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error.response?.data || error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Commandes à passer</h1>
          <p className="text-sm text-gray-600">Pièces nécessitant une commande</p>
        </div>

        {/* Liste des commandes */}
        <div className="grid gap-4">
          {toorders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucune pièce à commander pour le moment
            </div>
          ) : (
            toorders.map((order) => {
              const isInCart = cartItems.some(item => item.RéfPièce === order.RéfPièce);
              
              return (
                <CommandeCard
                  key={order.RéfPièce}
                  order={order}
                  isInCart={isInCart}
                  onAddToCart={addToCart}
                  onViewHistory={handleViewHistory}
                  onEdit={() => setEditingOrder(order)}
                  onOrder={() => setGoOrder(order)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Widget panier flottant */}
      <CartWidget />

      {/* Dialog historique */}
      {viewingHistoryFor && (
        <HistoriqueDialog
          piece={viewingHistoryFor}
          history={historyData}
          isLoading={historyLoading}
          onOpenChange={() => setViewingHistoryFor(null)}
        />
      )}

      {/* Dialog édition pièce */}
      {editingOrder && (
        <PieceEditForm
          piece={editingOrder}
          fournisseurs={fournisseurs}
          fabricants={fabricants}
          onSave={handleUpdateOrder}
          onCancel={() => setEditingOrder(null)}
        />
      )}

      {/* Dialog passer commande */}
      {goOrder && (
        <CommandeForm
          piece={goOrder}
          fournisseurs={fournisseurs}
          fabricants={fabricants}
          onSave={() => {
            setGoOrder(null);
            loadData(currentPage);
          }}
          onCancel={() => setGoOrder(null)}
        />
      )}
    </div>
  );
}

export default Commandes;