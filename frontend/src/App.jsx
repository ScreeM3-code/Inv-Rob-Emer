import React, { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import { PieceCard } from "@/components/inventaire/PieceCard";
import { fetchJson, log } from './lib/utils';
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Plus, Package, Loader2, Edit3, Trash2, AlertTriangle, TrendingUp, Search, Users, Building2, DollarSign, FileText, Phone, MapPin, Cog, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PieceEditDialog from "@/components/inventaire/PieceEditDialog";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { Badge } from "./components/ui/badge";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Hook personnalisé pour lazy loading par scroll
function useInfiniteScroll(items, itemsPerPage = 50) {
  const [displayCount, setDisplayCount] = useState(itemsPerPage);
  const loaderRef = useRef(null);

  useEffect(() => {
    // Reset quand les items changent
    setDisplayCount(itemsPerPage);
  }, [items, itemsPerPage]);

  useEffect(() => {
    const handleScroll = () => {
      if (!loaderRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      
      // Si on est à 80% du scroll et il reste des items
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        setDisplayCount(prev => {
          const newCount = prev + itemsPerPage;
          return Math.min(newCount, items.length);
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [items.length, itemsPerPage]);

  const displayedItems = items.slice(0, displayCount);
  const hasMore = displayCount < items.length;

  return { displayedItems, loaderRef, hasMore };
}

function Dashboard () {
  const [pieces, setPieces] = useState([]);
  const navigate = useNavigate();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [stats, setStats] = useState({ total_pieces: 0, stock_critique: 0, valeur_stock: 0, pieces_a_commander: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPiece, setEditingPiece] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [groupes, setGroupes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    statut: "tous",
    stock: "tous",
    groupe: "tous",
    commande: "tous"
  });
  // Note: quick-remove quantity is now per-card; removed global quickRemoveQty

  // Filtrage des pièces
  let filteredPieces = pieces.filter(piece => {
    // Filtre de commande
    if (filters.commande === "en_commande" && (!piece.Qtécommandée || piece.Qtécommandée <= 0)) {
      return false;
    }
    if (filters.commande === "sans_commande" && piece.Qtécommandée > 0) {
      return false;
    }
    return true;
  });

  const { displayedItems, loaderRef, hasMore } = useInfiniteScroll(filteredPieces, 30);

    useEffect(() => {
    // Charger toutes les pièces au démarrage
    loadData(0, '');
  }, []);

  const loadData = async (page = 0, search = '') => {
    try {
      setLoading(true);

      const cleanedSearch = search.trim();

      const groupes = await fetchJson(`${API}/groupes`);
        setGroupes(groupes || []);
        setCategories(groupes.NomCategorie || []);
        
      
      
      // ✅ Construire l'URL avec les filtres
      const params = new URLSearchParams();
      if (cleanedSearch) params.append('search', cleanedSearch);
      if (filters.statut !== 'tous') params.append('statut', filters.statut);
      if (filters.stock !== 'tous') params.append('stock', filters.stock);
      
      const piecesUrl = `${API}/pieces?${params.toString()}`;

      log('🔍 URL appelée:', piecesUrl);

      try {
        const [pieces, fournisseurs, stats, fabricants, groupes] = await Promise.all([
          fetchJson(piecesUrl),
          fetchJson(`${API}/fournisseurs`),
          fetchJson(`${API}/stats`),
          fetchJson(`${API}/fabricant`),
          fetchJson(`${API}/groupes`)
        ]);

        setPieces(Array.isArray(pieces) ? pieces : []);
        setFournisseurs(fournisseurs || []);
        setStats(stats || { total_pieces: 0, stock_critique: 0, valeur_stock: 0, pieces_a_commander: 0 });
        setFabricants(fabricants || []);
        setGroupes(groupes || []);
      } catch (error) {
        log("❌ Erreur lors du chargement:", error);
        // Reset states to safe defaults on error
        setPieces([]);
        setFournisseurs([]);
        setStats({ total_pieces: 0, stock_critique: 0, valeur_stock: 0, pieces_a_commander: 0 });
        setFabricants([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddToGroupe = async (pieceId, groupeId, quantite = 1) => {
    try {
      await fetchJson(`${API}/groupes/pieces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RefGroupe: groupeId,
          RéfPièce: pieceId,
          Quantite: quantite
        })
      });
      await loadData(currentPage, searchTerm);
    } catch (error) {
      console.error('❌ Erreur ajout au groupe:', error);
      alert('Erreur : ' + (error.message || 'Cette pièce est peut-être déjà dans ce groupe'));
    }
  };

  // Retirer une pièce d'un groupe
  const handleRemoveFromGroupe = async (pieceGroupeId) => {
    try {
      await fetchJson(`${API}/groupes/pieces/${pieceGroupeId}`, {
        method: 'DELETE'
      });
      await loadData(currentPage, searchTerm);
    } catch (error) {
      console.error('❌ Erreur retrait du groupe:', error);
      alert('Erreur : ' + error.message);
    }
  };

  const [fabricants, setFabricants] = useState([]);
  const [newPiece, setNewPiece] = useState({
    NomPièce: "",
    DescriptionPièce: "",
    NumPièce: "",
    RéfFournisseur: null,
    RéfAutreFournisseur: null,
    NumPièceAutreFournisseur: "",
    RefFabricant: null,
    Lieuentreposage: "",
    QtéenInventaire: 0,
    Qtéminimum: 0,
    Qtémax: 100,
    Prix_unitaire: 0,
    Soumission_LD: "",
    SoumDem: false
  });



  

  useEffect(() => {
    // ✅ Recharger dès que les filtres changent
    const timer = setTimeout(() => {
      loadData(currentPage, searchTerm);
    }, 300); // Réduit à 300ms
    
    return () => clearTimeout(timer);
  }, [searchTerm, filters.statut, filters.stock, filters.commande]);

  const handleQuickRemove = async (piece, amountArg) => {
    const parsedAmount = parseInt(amountArg, 10);
    const amount = isNaN(parsedAmount) ? 0 : parsedAmount;
    if (amount <= 0) {
      alert('Entrez une quantité valide (> 0) pour la sortie rapide.');
      return;
    }

    if (piece.QtéenInventaire <= 0) {
      alert("Le stock est déjà à zéro.");
      return;
    }

    if (amount > piece.QtéenInventaire) {
      alert("La quantité demandée dépasse le stock disponible.");
      return;
    }

    const originalPiece = pieces.find((p) => p.RéfPièce === piece.RéfPièce);
    const updatedPiece = { ...piece, QtéenInventaire: piece.QtéenInventaire - amount };

    setPieces((prev) =>
      prev.map((p) => (p.RéfPièce === piece.RéfPièce ? updatedPiece : p))
    );

    try {
      const userData = await fetchJson(`${API}/current-user`);
      const user = userData.user;

      // 1. Mettre à jour le stock de la pièce
      await fetchJson(`${API}/pieces/${piece.RéfPièce}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ QtéenInventaire: updatedPiece.QtéenInventaire }),
      });

      const historyEntry = {
        Opération: "Sortie rapide",
        QtéSortie: amount.toString(),
        RéfPièce: piece.RéfPièce,
        nompiece: piece.NomPièce,
        numpiece: piece.NumPièce,
        User: user || "Système",
        DateRecu: new Date().toISOString(),
        description: piece.DescriptionPièce,
      };

      await fetchJson(`${API}/historique`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(historyEntry),
      });
    } catch (error) {
      console.error("Erreur lors de la sortie rapide:", error);
      if (originalPiece) {
        setPieces((prev) =>
          prev.map((p) => (p.RéfPièce === piece.RéfPièce ? originalPiece : p))
        );
      }
      alert(
        "L'opération a échoué. Veuillez vérifier la console et vous assurer que le backend est démarré."
      );
    }
  };


  // Ajouter une pièce
  const handleAddPiece = async () => {
    try {
      // Validation basique
      if (!newPiece.NomPièce?.trim()) {
        alert("Le nom de la pièce est obligatoire");
        return;
      }

  const npQInv = parseInt(newPiece.QtéenInventaire, 10);
  const npQMin = parseInt(newPiece.Qtéminimum, 10);
  const npQMax = parseInt(newPiece.Qtémax, 10);

  const cleanedPiece = {
        NomPièce: newPiece.NomPièce.trim(),
        DescriptionPièce: newPiece.DescriptionPièce?.trim() || "",
        NumPièce: newPiece.NumPièce?.trim() || "",
        RéfFournisseur: newPiece.RéfFournisseur || null,
        RéfAutreFournisseur: newPiece.RéfAutreFournisseur || null,
        NumPièceAutreFournisseur: newPiece.NumPièceAutreFournisseur?.trim() || "",
        RefFabricant: newPiece.RefFabricant || null,
        Lieuentreposage: newPiece.Lieuentreposage?.trim() || "",
        QtéenInventaire: isNaN(npQInv) ? 0 : npQInv,
        Qtéminimum: isNaN(npQMin) ? 0 : npQMin,
        Qtémax: isNaN(npQMax) ? 100 : npQMax,
        Prix_unitaire: parseFloat(newPiece.Prix_unitaire) || 0,
        Soumission_LD: newPiece.Soumission_LD?.trim() || "",
        SoumDem: newPiece.SoumDem || false
      };

  import("./lib/utils").then(({ log }) => log('➕ Création de pièce:', cleanedPiece)); // Debug

      const piece = await fetchJson(`${API}/pieces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedPiece)
      });
      
      log('✅ Pièce créée:', piece);

      // Fermer le dialog
      setIsAddDialogOpen(false);
      
      // Reset form
      setNewPiece({
        NomPièce: "",
        DescriptionPièce: "",
        NumPièce: "",
        RéfFournisseur: null,
        RéfAutreFournisseur: null,
        NumPièceAutreFournisseur: "",
        RefFabricant: null,
        Lieuentreposage: "",
        QtéenInventaire: 0,
        Qtéminimum: 0,
        Qtémax: 100,
        Prix_unitaire: 0,
        Soumission_LD: "",
        SoumDem: false
      });

      // Recharger les données
      await loadData(currentPage, searchTerm);
      
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout:", error);
      console.error("❌ Réponse serveur:", error.response?.data);
      alert("Erreur lors de l'ajout: " + (error.response?.data?.detail || error.message));
    }
  };

  // Correction de la fonction handleUpdatePiece pour compatibilité et robustesse
  const handleUpdatePiece = async () => {
    if (!editingPiece || !editingPiece.RéfPièce) {
      alert("Impossible de déterminer la pièce à mettre à jour.");
      return;
    }
    
    try {
      const qInv = parseInt(editingPiece.QtéenInventaire, 10);
      const qMin = parseInt(editingPiece.Qtéminimum, 10);
      const qMax = parseInt(editingPiece.Qtémax, 10);
      const prixVal = parseFloat(editingPiece.Prix_unitaire);

      const dataToSend = {
        NomPièce: editingPiece.NomPièce || "",
        DescriptionPièce: editingPiece.DescriptionPièce || "",
        NumPièce: editingPiece.NumPièce || "",
        RéfFournisseur: editingPiece.RéfFournisseur || null,
        RéfAutreFournisseur: editingPiece.RéfAutreFournisseur || null,
        NumPièceAutreFournisseur: editingPiece.NumPièceAutreFournisseur || "",
        RefFabricant: editingPiece.RefFabricant || null,
        Lieuentreposage: editingPiece.Lieuentreposage || "",
        QtéenInventaire: isNaN(qInv) ? 0 : qInv,
        Qtéminimum: isNaN(qMin) ? 0 : qMin,
        Qtémax: isNaN(qMax) ? 100 : qMax,
        Prix_unitaire: isNaN(prixVal) ? 0 : prixVal,
        Soumission_LD: editingPiece.Soumission_LD || "",
        SoumDem: editingPiece.SoumDem || false
      };

  import("./lib/utils").then(({ log }) => log('📤 Données envoyées:', dataToSend)); // Debug

      await fetchJson(`${API}/pieces/${editingPiece.RéfPièce}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });
      setEditingPiece(null);
      await loadData(currentPage);
    } catch (error) {
      log("❌ Erreur lors de la mise à jour:", error);
      alert("Erreur: " + error.message);
    }
  };

  // Supprimer une pièce
  const handleDeletePiece = async (pieceId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette pièce ?")) {
      try {
        await fetchJson(`${API}/pieces/${pieceId}`, { method: 'DELETE' });
        loadData(currentPage);
      } catch (error) {
        log("❌ Erreur lors de la suppression:", error);
        alert("Erreur lors de la suppression: " + error.message);
      }
    }
  };

 
   return (
    <div className="min-h-screen from-slate-50 via-blue-50 to-indigo-50">
      <AnimatedBackground /> 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        {/* Header avec bouton d'ajout */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <Package className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inventaire des Pièces</h1>
              <p className="text-slate-600 dark:text-white">Gérez vos pièces et votre stock</p>
            </div>
          </div>
          <Button 
            onClick={() => {
              setNewPiece({
                NomPièce: "",
                DescriptionPièce: "",
                NumPièce: "",
                RéfFournisseur: null,
                RéfAutreFournisseur: null,
                NumPièceAutreFournisseur: "",
                RefFabricant: null,
                Lieuentreposage: "",
                QtéenInventaire: 0,
                Qtéminimum: 0,
                Qtémax: 100,
                Prix_unitaire: 0,
                Soumission_LD: "",
                SoumDem: false
              });
              setIsAddDialogOpen(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> Ajouter une Pièce
          </Button>
          
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card hover:shadow-2xl transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium dark:text-gray-100">Total Pièces</CardTitle>
              <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:scale-110 transition-transform">
                <Package className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-gray-100">{stats.total_pieces.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card className="glass-card hover:shadow-2xl transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium dark:text-gray-100">Stock Critique</CardTitle>
              <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-4 w-4 text-red-400" />
               </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold  dark:text-gray-100">{stats.stock_critique.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card className="glass-card hover:shadow-2xl transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium dark:text-gray-100">Valeur Stock</CardTitle>
              <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:scale-110 transition-transform">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold  dark:text-gray-100">
                {stats.valeur_stock.toLocaleString('fr-CA', {style: 'currency', currency: 'CAD'})}
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card hover:shadow-2xl transition-all duration-300 group cursor-pointer"
            onClick={() => navigate("/commandes")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium dark:text-gray-100">À Commander</CardTitle>
              <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:scale-110 transition-transform">
                <Package className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600  dark:text-yellow-600">
                {stats.pieces_a_commander.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Search et Filtres */}
        <Card className="mb-6 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" />
                <Input
                  placeholder="Rechercher par nom ou référence..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Filtres:</span>
                {/* <Select
                  value={filters.statut}
                  onValueChange={(value) => setFilters({...filters, statut: value})}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tous statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous statuts</SelectItem>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="obsolete">Obsolète</SelectItem>
                    <SelectItem value="discontinue">Discontinué</SelectItem>
                  </SelectContent>
                </Select>*/}
                
                <Select
                  value={filters.stock}
                  onValueChange={(value) => setFilters({...filters, stock: value})}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tous stocks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous stock</SelectItem>
                    <SelectItem value="ok">Stock OK</SelectItem>
                    <SelectItem value="faible">Stock Faible</SelectItem>
                    <SelectItem value="critique">Stock Critique</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.commande}
                  onValueChange={(value) => setFilters({...filters, commande: value})}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Commandes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes commandes</SelectItem>
                    <SelectItem value="en_commande">En commande</SelectItem>
                    <SelectItem value="sans_commande">Sans commande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des pièces avec lazy loading */}
{loading ? (
  <div className="flex justify-center py-10">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600"/>
  </div>
) : pieces.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune pièce trouvée</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filters.statut !== "tous" || filters.stock !== "tous" 
              ? "Essayez de modifier vos filtres de recherche." 
              : "Commencez par ajouter une nouvelle pièce."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {displayedItems.map((piece) => {
              const fournisseur = fournisseurs.find(f => f.RéfFournisseur === piece.RéfFournisseur);
              const autreFournisseur = fournisseurs.find(f => f.RéfFournisseur === piece.RéfAutreFournisseur);
              const fabricant = fabricants.find(f => f.RefFabricant === piece.RefFabricant);
              return (
                <PieceCard
                  key={piece.RéfPièce}
                  piece={piece}
                  fournisseur={fournisseur}
                  autreFournisseur={autreFournisseur}
                  fabricant={fabricant}
                  groupes={groupes}
                  pieceGroupes={groupes.flatMap(g => g.pieces || []).filter(gp => gp.RéfPièce === piece.RéfPièce)}
                  onEdit={() => setEditingPiece(piece)}
                  onDelete={() => handleDeletePiece(piece.RéfPièce)}
                  onQuickRemove={(qty) => handleQuickRemove(piece, qty)}
                  onAddToGroupe={handleAddToGroupe}
                  onRemoveFromGroupe={handleRemoveFromGroupe}
                />
              );
            })}
          </div>
          
          {/* Trigger pour charger plus */}
          {hasMore && (
            <div ref={loaderRef} className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">
                Chargement de {displayedItems.length}/{pieces.length} pièces...
              </span>
            </div>
          )}
        </>
      )}

        {/* Message si aucune pièce */}
        {!loading && displayedItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune pièce trouvée</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filters.statut !== "tous" || filters.stock !== "tous" 
                ? "Essayez de modifier vos filtres de recherche." 
                : "Commencez par ajouter une nouvelle pièce."}
            </p>
          </div>
        )}

        {pieces.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune pièce trouvée</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? "Essayez avec un autre terme de recherche." : "Votre inventaire sera affiché ici."}
            </p>
          </div>
        )}
      </div>
      {/* Dialog d'édition */}
      {editingPiece && (
        <PieceEditDialog
          piece={editingPiece}
          fournisseurs={fournisseurs}
          fabricants={fabricants}
          onSave={handleUpdatePiece}
          onCancel={() => setEditingPiece(null)}
          onChange={(field, value) => setEditingPiece({...editingPiece, [field]: value})}
        />
      )}

      {/* Dialog d'ajout */}
      {isAddDialogOpen && (
        <PieceEditDialog
          piece={newPiece}
          fournisseurs={fournisseurs}
          fabricants={fabricants}
          onSave={handleAddPiece}
          onCancel={() => setIsAddDialogOpen(false)}
          onChange={(field, value) => setNewPiece({...newPiece, [field]: value})}
        />
      )}
    </div>
  );
}
export default Dashboard;
