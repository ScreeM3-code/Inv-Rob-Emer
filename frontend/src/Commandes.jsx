import React, { useEffect, useState } from "react";
import { fetchJson, log } from './lib/utils';
import HistoriqueDialog from "@/components/commandes/HistoriqueDialog";
import PieceEditForm from "@/components/commandes/PieceEditForm";
import CommandeForm from "@/components/commandes/CommandeForm";
import CommandeCard from "@/components/commandes/CommandeCard";
import CartWidget from "@/components/cart/CartWidget";
import { useCart } from "@/components/cart/CartContext";
import AnimatedBackground from "@/components/ui/AnimatedBackground";

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
      const [toorders, fournisseurs, fabricants] = await Promise.all([
        fetchJson(`${API}/toorders`),
        fetchJson(`${API}/fournisseurs`),
        fetchJson(`${API}/fabricant`)
      ]);
    
      const fabricantsList = fabricants || [];
      
      // Remplacer NomFabricant par RefFabricant 
      const commandesAvecRefFabricant = (toorders || []).map(order => {
        const fab = fabricantsList.find(f => f.NomFabricant === order.NomFabricant);
        return {
          ...order,
          RefFabricant: fab ? fab.RefFabricant : null
        };
      });
  
      setToOrders(commandesAvecRefFabricant);
      setFournisseurs(fournisseurs || []);
      setFabricants(fabricantsList);
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
    }
    setCurrentPage(page);
  };

  const handleViewHistory = async (piece) => {
    log("🔍 Ouverture historique pour pièce:", piece.RéfPièce);
    setHistoryLoading(true);
    try {
      const data = await fetchJson(`${API}/historique/${piece.RéfPièce}`);
      log("📊 Données reçues de l'API (historique):", data);
      setHistoryData(data);
    } catch (err) {
      console.error("Erreur chargement historique:", err);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

const handleUpdateOrder = async (updatedPiece, isNewOrder = false) => {
  try {
    log('🔄 Mise à jour commande:', updatedPiece);
    
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
    delete cleanedOrder.fournisseur_principal;
    delete cleanedOrder.autre_fournisseur;

  log('📤 Envoi au backend:', cleanedOrder);

    // 1. Mettre à jour la pièce
  const updatedData = await fetchJson(`${API}/pieces/${updatedPiece.RéfPièce}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanedOrder)
  });
  log('✅ Réponse backend (update):', updatedData);
    
    // 2. Si c'est une NOUVELLE commande (pas juste une édition), ajouter l'historique
    if (isNewOrder) {
      const userData = await fetchJson(`${API}/current-user`);
      const userName = userData.user || "Système";
      
      const historiqueEntry = {
        Opération: "Commande",
        DateCMD: new Date().toISOString(),
        DateRecu: null,
        RéfPièce: updatedPiece.RéfPièce,
        nompiece: updatedPiece.NomPièce,
        numpiece: updatedPiece.NumPièce,
        qtécommande: String(updatedPiece.Qtécommandée || 0),
        QtéSortie: "0",
        description: updatedPiece.DescriptionPièce || "",
        User: userName,
        Delais: null
      };
      
      log('📝 Ajout historique:', historiqueEntry);
      
      const histData = await fetchJson(`${API}/historique`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historiqueEntry)
      });
      log('✅ Réponse backend (historique):', histData);
      
      alert('✅ Commande passée avec succès !');
    } else {
      alert('✅ Pièce modifiée avec succès !');
    }
    
    setEditingOrder(null);
    setGoOrder(null);
    await loadData(currentPage);
    
  } catch (error) {
    log("❌ Erreur lors de la mise à jour:", error);
    alert("❌ Erreur: " + error.message);
  }
};

   return (
    <div className="min-h-screen flex flex-col">
      <AnimatedBackground /> 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Commandes à passer</h1>
          <p className="text-sm text-gray-600 dark:text-white">Pièces nécessitant une commande</p>
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
          onSave={(updatedPiece) => handleUpdateOrder(updatedPiece, false)}
          onCancel={() => setEditingOrder(null)}
        />
      )}

      {/* Dialog passer commande */}
      {goOrder && (
        <CommandeForm
          piece={goOrder}
          fournisseurs={fournisseurs}
          fabricants={fabricants}
          onSave={(updatedPiece) => handleUpdateOrder(updatedPiece, true)}
          onCancel={() => setGoOrder(null)}
        />
      )}
    </div>
  );
}

export default Commandes;