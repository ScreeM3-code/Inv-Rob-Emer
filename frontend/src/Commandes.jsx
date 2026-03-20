import React, { useEffect, useState } from "react";
import { fetchJson, log } from './lib/utils';
import HistoriqueDialog from "@/components/commandes/HistoriqueDialog";
import { toast } from '@/hooks/use-toast';
import PieceEditForm from "@/components/commandes/PieceEditForm";
import CommandeForm from "@/components/commandes/CommandeForm";
import CommandeCard from "@/components/commandes/CommandeCard";
import CartWidget from "@/components/cart/CartWidget";
import { useCart } from "@/components/cart/CartContext";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { usePermissions } from '@/hooks/usePermissions';

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
  const [departements, setDepartements] = useState([]);
  const { can, isAdmin } = usePermissions();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (page = 1) => {
    try {
      const [toorders, fournisseurs, fabricants, departements] = await Promise.all([
        fetchJson(`${API}/toorders`),
        fetchJson(`${API}/fournisseurs`),
        fetchJson(`${API}/fabricant`),
        fetchJson(`${API}/departements`),
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
      setDepartements(Array.isArray(departements) ? departements : []);
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
      setViewingHistoryFor(piece);
      setHistoryData(data);
    } catch (err) {
      console.error("Erreur chargement historique:", err);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

    const handleUpdateDepartement = async (pieceId, refDepartement) => {
      try {
        await fetchJson(`${API}/pieces/${pieceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ RefDepartement: refDepartement })
        });
        // Mettre à jour localement pour éviter un rechargement complet
        setPieces(prev => prev.map(p =>
          p.RéfPièce === pieceId
            ? {
                ...p,
                RefDepartement: refDepartement,
                NomDepartement: refDepartement
                  ? departements.find(d => d.RefDepartement === refDepartement)?.NomDepartement || null
                  : null
              }
            : p
        ));
      } catch (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
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
        devise: updatedPiece.devise || 'CAD',
        fournisseurs: updatedPiece.fournisseurs || []
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
      
      // 2. Si c'est une NOUVELLE commande, mettre à jour la soumission
      if (isNewOrder) {
        const userData = await fetchJson(`${API}/current-user`);
        const userName = userData.user?.username || "Système";  
        
        // Ajouter à l'historique de mouvements (existant)
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
        
        log('📝 Ajout historique mouvement:', historiqueEntry);
        await fetchJson(`${API}/historique`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(historiqueEntry)
        });

        // ← NOUVEAU : Mettre à jour la soumission associée
        try {
          // Trouver la dernière soumission pour cette pièce
          const soumission = await fetchJson(`${API}/soumissions/piece/${updatedPiece.RéfPièce}/derniere`);
          
          if (soumission) {
            log('🔍 Soumission trouvée:', soumission);
            
            // Mettre à jour le statut de la soumission
            await fetchJson(
              `${API}/soumissions/${soumission.RefSoumission}/statut-complet?statut=Commandée`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  note: updatedPiece.Cmd_info || `Commandée le ${new Date().toLocaleDateString('fr-CA')}`,
                  date_rappel: null
                })
              }
            );
            
            // Enregistrer le prix commandé
            await fetchJson(`${API}/soumissions/${soumission.RefSoumission}/prix`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                RefSoumission: soumission.RefSoumission,
                RéfPièce: updatedPiece.RéfPièce,
                PrixUnitaire: parseFloat(updatedPiece.Prix_unitaire || 0),
                DelaiLivraison: updatedPiece.delai_livraison || '',
                Commentaire: `Commande passée - Qté: ${updatedPiece.Qtécommandée}`
              })
            });
           
            // Si un PDF a été fourni depuis le formulaire de commande, l'uploader vers la soumission
            if (updatedPiece.pdfFile) {
              try {
                const formDataPdf = new FormData();
                formDataPdf.append('file', updatedPiece.pdfFile);

                await fetch(`${API}/uploads/soumission/${soumission.RefSoumission}`, {
                  method: 'POST',
                  body: formDataPdf
                });
                log('📎 PDF uploadé vers la soumission');
              } catch (upErr) {
                console.error('⚠️ Erreur upload PDF soumission (non bloquant):', upErr);
              }
            }
            
            log('✅ Soumission mise à jour en "Commandée"');
          } else {
            log('⚠️ Aucune soumission trouvée pour cette pièce — création automatique en cours');
            try {
              // Construire les données de la pièce pour la nouvelle soumission
              const piecesForSoumission = [{
                RéfPièce: updatedPiece.RéfPièce,
                NomPièce: updatedPiece.NomPièce || '',
                NumPièce: updatedPiece.NumPièce || '',
                NumPièceAutreFournisseur: updatedPiece.NumPièceAutreFournisseur || '',
                DescriptionPièce: updatedPiece.DescriptionPièce || '',
                Quantite: updatedPiece.Qtécommandée || updatedPiece.Qtéàcommander || 0,
                Prix_unitaire: updatedPiece.Prix_unitaire || 0
              }];

              const newSoumission = await fetchJson(`${API}/soumissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  RéfFournisseur: updatedPiece.RéfFournisseur || updatedPiece.RéfAutreFournisseur || null,
                  EmailsDestinataires: '',
                  Sujet: 'Commande automatique',
                  MessageCorps: updatedPiece.Cmd_info || 'Créée automatiquement lors de la commande',
                  Pieces: piecesForSoumission,
                  User: userName,
                  Notes: 'Créée automatiquement lors de la commande'
                })
              });

              if (newSoumission && newSoumission.RefSoumission) {
                log('✅ Soumission créée automatiquement:', newSoumission);

                // Marquer la soumission comme Commandée
                try {
                  await fetchJson(
                    `${API}/soumissions/${newSoumission.RefSoumission}/statut-complet?statut=Commandée`,
                    {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        note: updatedPiece.Cmd_info || `Commandée le ${new Date().toLocaleDateString('fr-CA')}`,
                        date_rappel: null
                      })
                    }
                  );

                  // Enregistrer le prix commandé
                  await fetchJson(`${API}/soumissions/${newSoumission.RefSoumission}/prix`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      RefSoumission: newSoumission.RefSoumission,
                      RéfPièce: updatedPiece.RéfPièce,
                      PrixUnitaire: parseFloat(updatedPiece.Prix_unitaire || 0),
                      DelaiLivraison: updatedPiece.delai_livraison || '',
                      Commentaire: `Commande passée - Qté: ${updatedPiece.Qtécommandée}`
                    })
                  });

                  // Uploader PDF si fourni
                  if (updatedPiece.pdfFile) {
                    try {
                      const formDataPdf = new FormData();
                      formDataPdf.append('file', updatedPiece.pdfFile);

                      await fetch(`${API}/uploads/soumission/${newSoumission.RefSoumission}`, {
                        method: 'POST',
                        body: formDataPdf
                      });
                      log('📎 PDF uploadé vers la nouvelle soumission');
                    } catch (upErr) {
                      console.error('⚠️ Erreur upload PDF nouvelle soumission (non bloquant):', upErr);
                    }
                  }

                  log('✅ Soumission créée et mise à jour en "Commandée"');
                } catch (innerErr) {
                  console.error('⚠️ Erreur lors de la mise à jour de la nouvelle soumission (non bloquant):', innerErr);
                }
              } else {
                log('⚠️ Échec création soumission automatique');
              }
            } catch (createErr) {
              console.error('⚠️ Erreur création soumission automatique (non bloquant):', createErr);
            }
          }
        } catch (soumErr) {
          console.error('⚠️ Erreur mise à jour soumission (non bloquant):', soumErr);
          // On ne bloque pas la commande si la mise à jour de la soumission échoue
        }
        
        toast({ title: 'Succès', description: 'Commande passée avec succès !' });
      } else {
        toast({ title: 'Succès', description: 'Pièce modifiée avec succès !' });
      }
      
      setEditingOrder(null);
      setGoOrder(null);
      await loadData(currentPage);
      
    } catch (error) {
      log("❌ Erreur lors de la mise à jour:", error);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
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
        {can('soumissions_view') && <Button 
          variant="outline" 
          onClick={() => navigate("/soumissions-historique")}
          className="border-blue-600 text-blue-600 hover:bg-blue-50"
        >
          <FileText className="w-4 h-4 mr-2" />
          Historique des soumissions
        </Button>}

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
                  onRefresh={() => loadData(currentPage)}
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
          departements={departements}
          onUpdateDepartement={handleUpdateDepartement}
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