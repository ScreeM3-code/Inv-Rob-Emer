import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import { PieceCard } from "@/components/inventaire/PieceCard";
import { fetchJson, log } from './lib/utils';
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Plus, Package, Loader2, AlertTriangle, Search, DollarSign, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PieceEditDialog from "@/components/inventaire/PieceEditDialog";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { usePermissions } from './hooks/usePermissions';
import * as XLSX from 'xlsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Hook personnalisé pour lazy loading par scroll
function useInfiniteScroll(items, itemsPerPage = 50) {
  const [displayCount, setDisplayCount] = useState(itemsPerPage);
  // callback ref setter for the loader element (works well with IntersectionObserver)
  const [loaderEl, setLoaderEl] = useState(null);

  useEffect(() => {
    // Reset display count when the total number of items changes
    setDisplayCount(itemsPerPage);
  }, [items.length, itemsPerPage]);

  useEffect(() => {
    if (!loaderEl) return;
    if (displayCount >= items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setDisplayCount((prev) => Math.min(prev + itemsPerPage, items.length));
          }
        });
      },
      { root: null, rootMargin: '300px', threshold: 0.1 }
    );

    observer.observe(loaderEl);
    return () => observer.disconnect();
  }, [loaderEl, items.length, itemsPerPage, displayCount]);

  const displayedItems = items.slice(0, displayCount);
  const hasMore = displayCount < items.length;

  // return the setter as the ref to attach to the loader element
  return { displayedItems, loaderRef: setLoaderEl, hasMore };
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
  const [departements, setDepartements] = useState([]);
  const { can, isAdmin } = usePermissions();
  const [filters, setFilters] = useState({ statut: 'tous', stock: 'tous', commande: 'tous', departement: 'tous' });


  // Filtrage des pièces
  let filteredPieces = pieces.filter(piece => {
    // Filtre de commande
    if (filters.commande === "en_commande" && (!piece.Qtécommandée || piece.Qtécommandée <= 0)) {
      return false;
    }
    if (filters.commande === "sans_commande" && piece.Qtécommandée > 0) {
      return false;
    }
    if (filters.departement !== 'tous') {
      if (String(piece.RefDepartement) !== filters.departement) return false;
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
        // Les catégories sont extraites via /groupes/categories séparément, ou déduite des groupes :
        const cats = [...new Map((groupes || []).filter(g => g.NomCategorie).map(g => [g.RefCategorie, { RefCategorie: g.RefCategorie, NomCategorie: g.NomCategorie }])).values()];
        setCategories(cats);
        
      
      
      // ✅ Construire l'URL avec les filtres
      const params = new URLSearchParams();
      if (cleanedSearch) params.append('search', cleanedSearch);
      if (filters.statut !== 'tous') params.append('statut', filters.statut);
      if (filters.stock !== 'tous') params.append('stock', filters.stock);
      
      const piecesUrl = `${API}/pieces?${params.toString()}`;

      log('🔍 URL appelée:', piecesUrl);

      try {
        const [pieces, fournisseurs, stats, fabricants, groupes, departements] = await Promise.all([
          fetchJson(piecesUrl),
          fetchJson(`${API}/fournisseurs`),
          fetchJson(`${API}/stats`),
          fetchJson(`${API}/fabricant`),
          fetchJson(`${API}/groupes`),
          fetchJson(`${API}/departements`),
        ]);

        setPieces(Array.isArray(pieces) ? pieces : []);
        setFournisseurs(fournisseurs || []);
        setStats(stats || { total_pieces: 0, stock_critique: 0, valeur_stock: 0, pieces_a_commander: 0 });
        setFabricants(fabricants || []);
        setGroupes(groupes || []);
        setDepartements(Array.isArray(departements) ? departements : []);
      } catch (error) {
        log("❌ Erreur lors du chargement:", error);
        // Reset states to safe defaults on error
        setPieces([]);
        setFournisseurs([]);
        setStats({ total_pieces: 0, stock_critique: 0, valeur_stock: 0, pieces_a_commander: 0 });
        setFabricants([]);
        setGroupes([]);
        setDepartements([]);
      }
    } finally {
      setLoading(false);
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
      toast({ title: 'Erreur', description: error.message || 'Cette pièce est peut-être déjà dans ce groupe', variant: 'destructive' });
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
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
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
      toast({ title: 'Attention', description: 'Entrez une quantité valide (> 0) pour la sortie rapide.' });
      return;
    }

    if (piece.QtéenInventaire <= 0) {
      toast({ title: 'Attention', description: 'Le stock est déjà à zéro.' });
      return;
    }

    if (amount > piece.QtéenInventaire) {
      toast({ title: 'Attention', description: 'La quantité demandée dépasse le stock disponible.' });
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
        User: user?.username || "Système",
        DateRecu: new Date().toISOString(),
        description: piece.DescriptionPièce,
      };

      await fetchJson(`${API}/historique`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(historyEntry),
      });

      // Afficher une confirmation toast
      try {
        toast({
          title: 'Sortie rapide',
          description: `${amount} pièce(s) retirée(s) : ${piece.NomPièce}`,
        });
      } catch (tErr) {
        // ne bloque pas si le toast n'est pas disponible
        console.warn('Toast error:', tErr);
      }
    } catch (error) {
      console.error("Erreur lors de la sortie rapide:", error);
      if (originalPiece) {
        setPieces((prev) =>
          prev.map((p) => (p.RéfPièce === piece.RéfPièce ? originalPiece : p))
        );
      }
      toast({ title: 'Erreur', description: "L'opération a échoué. Veuillez vérifier la console et vous assurer que le backend est démarré.", variant: 'destructive' });
    }
  };


  // Ajouter une pièce
  const handleAddPiece = async () => {
    try {
      // Validation basique
      if (!newPiece.NomPièce?.trim()) {
        toast({ title: 'Attention', description: 'Le nom de la pièce est obligatoire' });
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
        SoumDem: newPiece.SoumDem || false,
        NoFESTO: newPiece.NoFESTO?.trim() || "",
        RTBS: (newPiece.RTBS === "" || newPiece.RTBS == null) ? null : parseFloat(newPiece.RTBS),
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
        SoumDem: false,
        NoFESTO: "",
        RTBS: null
      });

      // Recharger les données
      await loadData(currentPage, searchTerm);
      
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout:", error);
      console.error("❌ Réponse serveur:", error.response?.data);
      toast({ title: 'Erreur', description: (error.response?.data?.detail || error.message), variant: 'destructive' });
    }
  };

  // Correction de la fonction handleUpdatePiece pour compatibilité et robustesse
  const handleUpdatePiece = async () => {
    if (!editingPiece || !editingPiece.RéfPièce) {
      toast({ title: 'Erreur', description: 'Impossible de déterminer la pièce à mettre à jour.', variant: 'destructive' });
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
        Qtémax: isNaN(qMax) ? 10 : qMax,
        Prix_unitaire: isNaN(prixVal) ? 0 : prixVal,
        Soumission_LD: editingPiece.Soumission_LD || "",
        SoumDem: editingPiece.SoumDem || false,
        NoFESTO: editingPiece.NoFESTO?.trim() || "",
        RTBS: (editingPiece.RTBS === "" || editingPiece.RTBS == null) ? null : parseFloat(editingPiece.RTBS),
        RefDepartement: editingPiece.RefDepartement ?? null,
        devise: editingPiece.devise || 'CAD',
      };

      // ✅ Mise à jour optimiste
      setPieces(prevPieces => 
        prevPieces.map(p => 
          p.RéfPièce === editingPiece.RéfPièce 
            ? { ...p, ...dataToSend }
            : p
        )
      );
      
      // Envoyer au serveur
      const updatedPiece = await fetchJson(`${API}/pieces/${editingPiece.RéfPièce}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });
      
      // ✅ Mettre à jour avec la réponse serveur
      setPieces(prevPieces => 
        prevPieces.map(p => 
          p.RéfPièce === updatedPiece.RéfPièce 
            ? updatedPiece
            : p
        )
      );
      
      setEditingPiece(null);
    } catch (error) {
      log("❌ Erreur lors de la mise à jour:", error);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      // ✅ En cas d'erreur, recharger pour avoir l'état correct
      await loadData(currentPage);
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
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      }
    }
  };

  // Export Excel des pièces
  const handleExportExcel = () => {
    const data = filteredPieces.map(p => ({
      'Réf Pièce':        p.RéfPièce,
      'Nom':              p.NomPièce,
      'Description':      p.DescriptionPièce || '',
      'N° Pièce':         p.NumPièce || '',
      'Fabricant':        p.NomFabricant || '',
      'Fournisseur':      p.fournisseur_principal?.NomFournisseur || '',
      'N° Fournisseur':   p.fournisseur_principal?.NumPièceFournisseur || '',
      'Lieu entreposage': p.Lieuentreposage || '',
      'Qté inventaire':   p.QtéenInventaire ?? 0,
      'Qté minimum':      p.Qtéminimum ?? 0,
      'Qté max':          p.Qtémax ?? 0,
      'Qté à commander':  p.Qtéàcommander ?? 0,
      'Qté commandée':    p.Qtécommandée ?? 0,
      'Prix unitaire':    p.Prix_unitaire ?? 0,
      'Statut stock':     p.statut_stock || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pièces');

    const cols = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(key.length, 14) }));
    ws['!cols'] = cols;

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `inventaire_pieces_${date}.xlsx`);
  };

 
   return (
    <div className="min-h-screen w-full p-2 from-slate-50 via-blue-50 to-indigo-50">
      <AnimatedBackground />
      <Toaster />
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-6">

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
            variant="outline"
            onClick={handleExportExcel}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Exporter Excel
          </Button>

          {can('inventaire_create') && <Button 
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
          </Button>}
          
        </div>

        {/* Stats Cards */}
        <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card className="glass-card hover:shadow-2xl transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium dark:text-gray-100">Total Pièces</CardTitle>
              <div className="p-1 md:p-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:scale-110 transition-transform">
                <Package className="h-3 w-3 md:h-4 md:w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-xl md:text-2xl font-bold dark:text-gray-100">{(stats.total_pieces || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card className="glass-card hover:shadow-2xl transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium dark:text-gray-100">Stock Critique</CardTitle>
              <div className="p-1 md:p-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-red-400" />
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-xl md:text-2xl font-bold  dark:text-gray-100">{(stats.stock_critique || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card className="glass-card hover:shadow-2xl transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium dark:text-gray-100">Valeur Stock</CardTitle>
              <div className="p-1 md:p-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:scale-110 transition-transform">
                <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold  dark:text-gray-100">
                {(stats.valeur_stock || 0).toLocaleString('fr-CA', {style: 'currency', currency: 'CAD'})}
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card hover:shadow-2xl transition-all duration-300 group cursor-pointer"
            onClick={() => {can('commandes_view') && navigate("/commandes")}}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium dark:text-gray-100">À Commander</CardTitle>
              <div className="p-1 md:p-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:scale-110 transition-transform">
                <Package className="h-3 w-3 md:h-4 md:w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-xl md:text-2xl font-bold text-yellow-600  dark:text-yellow-600">
                {(stats.pieces_a_commander || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Search et Filtres */}
        <Card className="mb-4 md:mb-6 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-3 md:p-6">
            <div className="flex flex-col lg:flex-row gap-3 md:gap-4 items-center">
              <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 md:w-4 md:h-4" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 md:pl-10 h-9 md:h-10 text-sm"
                />
              </div>
              
              <div className="flex items-center gap-2 text-xs md:text-sm w-full lg:w-auto">
                <span className="font-medium hidden md:inline">Filtres:</span>
                
                <Select
                  value={filters.stock}
                  onValueChange={(value) => setFilters({...filters, stock: value})}
                >
                  <SelectTrigger className="w-full lg:w-[140px] h-9 text-xs md:text-sm">
                    <SelectValue placeholder="Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous stock</SelectItem>
                    <SelectItem value="ok">Stock OK</SelectItem>
                    <SelectItem value="faible">Stock Faible</SelectItem>
                    <SelectItem value="critique">Stock Critique</SelectItem>
                  </SelectContent>
                </Select>
 
                <Select
                  value={filters.departement}
                  onValueChange={(value) => setFilters({...filters, departement: value})}
                >
                  <SelectTrigger className="w-full lg:w-[160px] h-9 text-xs md:text-sm">
                    <SelectValue placeholder="Département" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous dépt.</SelectItem>
                    {departements.map(d => (
                      <SelectItem key={d.RefDepartement} value={d.RefDepartement.toString()}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: d.Couleur || '#6366f1' }}
                          />
                          {d.NomDepartement}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.commande}
                  onValueChange={(value) => setFilters({...filters, commande: value})}
                >
                  <SelectTrigger className="w-full lg:w-[140px] h-9 text-xs md:text-sm">
                    <SelectValue placeholder="Commandes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes</SelectItem>
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
            {searchTerm || filters.stock !== "tous" || filters.departement !== "tous" || filters.commande !== "tous"
              ? "Essayez de modifier vos filtres de recherche." 
              : "Commencez par ajouter une nouvelle pièce."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 md:gap-5 w-full">
            {displayedItems.map((piece) => {
              const fournisseur = piece.fournisseur_principal || null;
              const autreFournisseur = (piece.fournisseurs || []).find(f => !f.EstPrincipal) || null;
              const fabricant = fabricants.find(f => f.RefFabricant === piece.RefFabricant);
              return (
                <PieceCard
                  key={piece.RéfPièce}
                  piece={piece}
                  fournisseur={fournisseur}
                  autreFournisseur={autreFournisseur}
                  fabricant={fabricant}
                  groupes={groupes}                                  
                  departements={departements}
                  onUpdateDepartement={handleUpdateDepartement}
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

      </div>
      {/* Dialog d'édition */}
      {editingPiece && (
        <PieceEditDialog
          piece={editingPiece}
          fournisseurs={fournisseurs}
          fabricants={fabricants}
          departements={departements}
          onUpdateDepartement={handleUpdateDepartement}
          onSave={handleUpdatePiece}
          onCancel={() => setEditingPiece(null)}
          onChange={(field, value) => setEditingPiece(prev => ({...prev, [field]: value}))}
        />
      )}

      {/* Dialog d'ajout */}
      {isAddDialogOpen && (
        <PieceEditDialog
          piece={newPiece}
          fournisseurs={fournisseurs}
          fabricants={fabricants}
          departements={departements}
          onUpdateDepartement={handleUpdateDepartement}
          onSave={handleAddPiece}
          onCancel={() => setIsAddDialogOpen(false)}
          onChange={(field, value) => setNewPiece(prev => ({...prev, [field]: value}))}
        />
      )}
    </div>
  );
}
export default Dashboard;