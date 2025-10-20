import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import ToOrders from "./ToOrders";
import Fournisseurs from "./Fournisseur";
import Fabricant from "./Fabricant";
import Historique from "./Historique";
import Receptions from "./Receptions";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Plus, Package, Loader2, Edit3, Trash2, AlertTriangle, TrendingUp, Search, Users, Building2, DollarSign, FileText, Phone, MapPin, Cog, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PieceCard } from "@/components/inventaire/PieceCard";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Navigation = () => {
  const location = useLocation();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-4">
              <Package className="h-8 w-8 text-rio-red" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inventaire Robots</h1>
                <p className="text-sm text-gray-600">Maintenance</p>
              </div>
            </div>

            <nav className="flex space-x-6">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'bg-rio-red text-white'
                    : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                }`}
              >
                <Package className="h-4 w-4 inline mr-2" />
                Inventaire
              </Link>
              <Link
                to="/fournisseurs"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/fournisseurs'
                    ? 'bg-rio-red text-white'
                    : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                }`}
              >
                <Store className="h-4 w-4 inline mr-2" />
                Fournisseurs
              </Link>
              <Link
                to="/fabricant"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/fabricant'
                    ? 'bg-rio-red text-white'
                    : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                }`}
              >
                <Cog className="h-4 w-4 inline mr-2" />
                Fabricant
              </Link>
              <Link
                to="/to-orders"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/to-orders'
                    ? 'bg-rio-red text-white'
                    : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                }`}
              >
                <Package className="h-4 w-4 inline mr-2" />
                Commander
              </Link>
              <Link
                to="/receptions"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/receptions'
                    ? 'bg-rio-red text-white'
                    : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                }`}
              >
                <Package className="h-4 w-4 inline mr-2" />
                Réceptions
              </Link>
              <Link
                to="/historique"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/historique'
                    ? 'bg-rio-red text-white'
                    : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Historique
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

const Dashboard = () => {
  const [pieces, setPieces] = useState([]);
  const navigate = useNavigate();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [stats, setStats] = useState({ total_pieces: 0, stock_critique: 0, valeur_stock: 0, pieces_a_commander: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPiece, setEditingPiece] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const filteredPieces = pieces.filter(piece => {
    // Filtre de recherche
    const matchSearch = searchTerm === '' ||
      piece.NomPièce?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      piece.NumPièce?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      piece.NumPièceAutreFournisseur?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      piece.DescriptionPièce?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtre de statut
    const matchStatut = filters.statut === "tous" || 
      (filters.statut === "ok" && piece.stockStatus === "ok") ||
      (filters.statut === "faible" && piece.stockStatus === "faible") ||
      (filters.statut === "critique" && piece.stockStatus === "critique");
    
    // Filtre d'alerte
    const matchAlerte = filters.alerte === "tous" ||
      (filters.alerte === "alerte" && piece.QtéenInventaire <= piece.Qtéminimum) ||
      (filters.alerte === "normal" && piece.QtéenInventaire > piece.Qtéminimum);
    
    return matchSearch && matchStatut && matchAlerte;
  });
  
  const [filters, setFilters] = useState({
    statut: "tous",
    alerte: "tous"
  });
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
    SoumDem: ""
  });

  useEffect(() => {
    // Charger toutes les pièces au démarrage
    loadData(0, '');
  }, []);

  const loadData = async (page = 0, search = '') => {
    try {
      setLoading(true);

      const cleanedSearch = search.trim();
      const piecesUrl = cleanedSearch
        ? `${API}/pieces?limit=20&offset=${page * 20}&search=${encodeURIComponent(cleanedSearch)}`
        : `${API}/pieces`;

      console.log('🔍 URL appelée:', piecesUrl); // Debug

      const [piecesRes, fournisseursRes, statsRes, fabricantsRes] = await Promise.all([
        axios.get(piecesUrl),
        axios.get(`${API}/fournisseurs`),
        axios.get(`${API}/stats`),
        axios.get(`${API}/fabricant`),
      ]);

      console.log('📦 Pièces reçues:', piecesRes.data?.length, 'pièces'); // Debug
      console.log('📊 Stats:', statsRes.data); // Debug

      setPieces(piecesRes.data || []);
      setFournisseurs(fournisseursRes.data || []);
      setStats(statsRes.data || { total_pieces: 0, stock_critique: 0, valeur_stock: 0, pieces_a_commander: 0 });
      setFabricants(fabricantsRes.data || []);
    } catch (error) {
      console.error("❌ Erreur lors du chargement:", error);
      console.error("❌ Détails:", error.response?.data); // Debug
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Délai uniquement pour la recherche (pas au premier chargement)
    if (searchTerm === '' && currentPage === 0) return; // Skip le premier chargement
    
    const timer = setTimeout(() => {
      loadData(currentPage, searchTerm);
    }, 700); // Réduit à 300ms pour meilleure réactivité
    
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm]);

  const handleQuickRemove = async (piece) => {
    if (piece.QtéenInventaire <= 0) {
      alert("Le stock est déjà à zéro.");
      return;
    }

    const originalPiece = pieces.find((p) => p.RéfPièce === piece.RéfPièce);
    const updatedPiece = { ...piece, QtéenInventaire: piece.QtéenInventaire - 1 };

    setPieces((prev) =>
      prev.map((p) => (p.RéfPièce === piece.RéfPièce ? updatedPiece : p))
    );

    try {
      const response = await fetch(`${API}/current-user`);
      const data = await response.json();
      const user = data.user;

      // 1. Mettre à jour le stock de la pièce
      const pieceUpdateResponse = await fetch(`${API}/pieces/${piece.RéfPièce}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ QtéenInventaire: updatedPiece.QtéenInventaire }),
      });

      if (!pieceUpdateResponse.ok)
        throw new Error("La mise à jour de la pièce a échoué.");

      const historyEntry = {
        Opération: "Sortie rapide",
        QtéSortie: "1",
        RéfPièce: piece.RéfPièce,
        nompiece: piece.NomPièce,
        numpiece: piece.NumPièce,
        User: user?.full_name || "Système",
        DateRecu: new Date().toISOString(),
        description: `Sortie de 1 unité depuis la page d'inventaire.`,
      };

      const historyResponse = await fetch(`${API}/historique`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(historyEntry),
      });

      if (!historyResponse.ok)
        throw new Error("L'enregistrement de l'historique a échoué.");
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

      const cleanedPiece = {
        NomPièce: newPiece.NomPièce.trim(),
        DescriptionPièce: newPiece.DescriptionPièce?.trim() || "",
        NumPièce: newPiece.NumPièce?.trim() || "",
        RéfFournisseur: newPiece.RéfFournisseur || null,
        RéfAutreFournisseur: newPiece.RéfAutreFournisseur || null,
        NumPièceAutreFournisseur: newPiece.NumPièceAutreFournisseur?.trim() || "",
        RefFabricant: newPiece.RefFabricant || null,
        Lieuentreposage: newPiece.Lieuentreposage?.trim() || "",
        QtéenInventaire: parseInt(newPiece.QtéenInventaire) || 0,
        Qtéminimum: parseInt(newPiece.Qtéminimum) || 0,
        Qtémax: parseInt(newPiece.Qtémax) || 100,
        Prix_unitaire: parseFloat(newPiece.Prix_unitaire) || 0,
        Soumission_LD: newPiece.Soumission_LD?.trim() || "",
        SoumDem: newPiece.SoumDem?.trim() || ""
      };

      console.log('➕ Création de pièce:', cleanedPiece); // Debug

      const response = await axios.post(`${API}/pieces`, cleanedPiece);
      
      console.log('✅ Pièce créée:', response.data); // Debug

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
        SoumDem: ""
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
      // Préparer les données à envoyer (uniquement les champs modifiables)
      const dataToSend = {
        NomPièce: editingPiece.NomPièce || "",
        DescriptionPièce: editingPiece.DescriptionPièce || "",
        NumPièce: editingPiece.NumPièce || "",
        RéfFournisseur: editingPiece.RéfFournisseur || null,
        RéfAutreFournisseur: editingPiece.RéfAutreFournisseur || null,
        NumPièceAutreFournisseur: editingPiece.NumPièceAutreFournisseur || "",
        RefFabricant: editingPiece.RefFabricant || null,
        Lieuentreposage: editingPiece.Lieuentreposage || "",
        QtéenInventaire: parseInt(editingPiece.QtéenInventaire) || 0,
        Qtéminimum: parseInt(editingPiece.Qtéminimum) || 0,
        Qtémax: parseInt(editingPiece.Qtémax) || 100,
        Prix_unitaire: parseFloat(editingPiece.Prix_unitaire) || 0,
        Soumission_LD: editingPiece.Soumission_LD || "",
        SoumDem: editingPiece.SoumDem || ""
      };

      await axios.put(`${API}/pieces/${editingPiece.RéfPièce}`, dataToSend);
      setEditingPiece(null);
      loadData(currentPage);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error.response?.data || error.message);
      alert("Erreur: " + (error.response?.data?.detail || error.response?.data?.message || error.message));
    }
  };

  // Supprimer une pièce
  const handleDeletePiece = async (pieceId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette pièce ?")) {
      try {
        await axios.delete(`${API}/pieces/${pieceId}`);
        loadData(currentPage);
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
      }
    }
  };



   return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Pièces
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_pieces.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Critique</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.stock_critique.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valeur Stock</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.valeur_stock.toLocaleString('fr-CA', {style: 'currency', currency: 'CAD'})}</div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-lg transition"
            onClick={() => navigate("/to-orders")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">À Commander</CardTitle>
              <Package className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pieces_a_commander.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
         {/* Actions */}
        <div className="flex justify-end space-x-4 mb-6">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-rio-red hover:bg-rio-red-dark">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle pièce
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ajouter une nouvelle pièce</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>N° de pièce</Label>
                    <Input
                      value={newPiece.NumPièce}
                      onChange={(e) => setNewPiece({...newPiece, NumPièce: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Nom de la pièce</Label>
                    <Input
                      value={newPiece.NomPièce}
                      onChange={(e) => setNewPiece({...newPiece, NomPièce: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newPiece.DescriptionPièce}
                    onChange={(e) => setNewPiece({...newPiece, DescriptionPièce: e.target.value})}
                  />
                </div>

                {/* Fournisseurs */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Fournisseurs</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fournisseur principal</Label>
                      <Select
                        value={newPiece.RéfFournisseur?.toString() || ""}
                        onValueChange={(value) =>
                          setNewPiece({
                            ...newPiece,
                            RéfFournisseur: value ? parseInt(value) : null
                          })
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
                        value={newPiece.RéfAutreFournisseur?.toString() || ""}
                        onValueChange={(value) =>
                          setNewPiece({
                            ...newPiece,
                            RéfAutreFournisseur: value
                              ? parseInt(value)
                              : null
                          })
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
                      value={newPiece.NumPièceAutreFournisseur}
                      onChange={(e) => setNewPiece({...newPiece, NumPièceAutreFournisseur: e.target.value})}
                    />
                  </div>
                </div>

                {/* Fabricant */}
                <div className="border-t pt-4">
                  <Label>Fabricant</Label>
                  <Select value={newPiece.RefFabricant?.toString() || ""} onValueChange={(value) => setNewPiece({...newPiece, RefFabricant: value ? parseInt(value) : null})}>
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

                {/* Quantités et stockage */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Quantités et stockage</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Qté en stock</Label>
                      <Input
                        type="number"
                        value={newPiece.QtéenInventaire}
                        onChange={(e) => setNewPiece({...newPiece, QtéenInventaire: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <Label>Qté minimum</Label>
                      <Input
                        type="number"
                        value={newPiece.Qtéminimum}
                        onChange={(e) => setNewPiece({...newPiece, Qtéminimum: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <Label>Qté maximum</Label>
                      <Input
                        type="number"
                        value={newPiece.Qtémax}
                        onChange={(e) => setNewPiece({...newPiece, Qtémax: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label>Emplacement</Label>
                      <Input
                        value={newPiece.Lieuentreposage}
                        onChange={(e) => setNewPiece({...newPiece, Lieuentreposage: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Prix unitaire (CAD $)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newPiece.Prix_unitaire}
                        onChange={(e) => setNewPiece({...newPiece, Prix_unitaire: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddPiece} className="bg-rio-red hover:bg-rio-red-dark">
                  Ajouter Pièce
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search et Filtres */}
        <Card className="mb-6 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher par nom ou référence..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/50"
                />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">Filtres:</span>
                <Select
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
                </Select>
                
                <Select
                  value={filters.alerte}
                  onValueChange={(value) => setFilters({...filters, alerte: value})}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tous stocks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous statuts</SelectItem>
                    <SelectItem value="ok">Stock OK</SelectItem>
                    <SelectItem value="faible">Stock Faible</SelectItem>
                    <SelectItem value="critique">Stock Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des pièces en grille */}
        {loading ? (
           <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredPieces.map((piece) => {
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
                  onEdit={() => {setEditingPiece(piece); setIsFormOpen(true)}}
                  onDelete={() => handleDeletePiece(piece.RéfPièce)}
                  onQuickRemove={() => handleQuickRemove(piece)}
                />
              )
            })}
          </div>
        )}

        {/* Message si aucune pièce */}
        {!loading && filteredPieces.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune pièce trouvée</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filters.statut !== "tous" || filters.alerte !== "tous" 
                ? "Essayez de modifier vos filtres de recherche." 
                : "Commencez par ajouter une nouvelle pièce."}
            </p>
          </div>
        )}

        {/* Navigation pagination */}
        <div className="flex justify-center space-x-4 mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            Précédent
          </Button>
          <span className="py-2 px-4 text-gray-600">Page {currentPage + 1}</span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={pieces.length < 20}
          >
            Suivant
          </Button>
        </div>

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

      {/* Edit Dialog - Interface complète avec fournisseurs */}
      {editingPiece && (
        <Dialog open={true} onOpenChange={() => setEditingPiece(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier la pièce</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
              <div>
                <Label>Nom de la pièce</Label>
                <Input
                  value={editingPiece.NomPièce}
                  onChange={(e) => setEditingPiece({...editingPiece, NomPièce: e.target.value})}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={editingPiece.DescriptionPièce || ""}
                  onChange={(e) =>
                    setEditingPiece({
                      ...editingPiece,
                      DescriptionPièce: e.target.value
                    })
                  }
                />
              </div>
              {/* Fournisseurs */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-700 mb-3">
                  Fournisseurs
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fournisseur principal</Label>
                    <Select
                      value={editingPiece.RéfFournisseur != null ? editingPiece.RéfFournisseur.toString() : "none"}
                      onValueChange={(value) =>
                        setEditingPiece({
                          ...editingPiece,
                          RéfFournisseur: value === "none" ? null : parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun fournisseur</SelectItem>
                        {Array.isArray(fournisseurs) &&
                          fournisseurs.map((f) => (
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
                      value={editingPiece.RéfAutreFournisseur != null ? editingPiece.RéfAutreFournisseur.toString() : "none"}
                      onValueChange={(value) =>
                        setEditingPiece({
                          ...editingPiece,
                          RéfAutreFournisseur: value === "none" ? null : parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun fournisseur</SelectItem>
                        {Array.isArray(fournisseurs) &&
                          fournisseurs.map((f) => (
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
                    value={editingPiece.NumPièceAutreFournisseur || ""}
                    onChange={(e) =>
                      setEditingPiece({ ...editingPiece, NumPièceAutreFournisseur: e.target.value })
                    }
                  />
                </div>
              </div>
              {/* Fabricant */}
              <div className="border-t pt-4">
                <Label>Fabricant</Label>
                <Select
                  value={editingPiece.RefFabricant != null ? editingPiece.RefFabricant.toString() : "none"}
                  onValueChange={(value) =>
                    setEditingPiece({
                      ...editingPiece,
                      RefFabricant: value === "none" ? null : parseInt(value)
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fabricant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun fabricant</SelectItem>
                    {Array.isArray(fabricants) &&
                      fabricants.map((fab) => (
                        <SelectItem key={fab.RefFabricant} value={fab.RefFabricant.toString()}>
                          {fab.NomFabricant}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Qté stock</Label>
                  <Input
                    type="number"
                    value={editingPiece.QtéenInventaire ?? ""}
                    min={0}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditingPiece({
                        ...editingPiece,
                        QtéenInventaire: v === "" ? "" : parseInt(v) >= 0 ? parseInt(v) : 0,
                      });
                    }}
                  />
                </div>
                <div>
                  <Label>Qté min</Label>
                  <Input
                    type="number"
                    value={editingPiece.Qtéminimum ?? ""}
                    min={0}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditingPiece({
                        ...editingPiece,
                        Qtéminimum: v === "" ? "" : parseInt(v) >= 0 ? parseInt(v) : 0,
                      });
                    }}
                  />
                </div>
                <div>
                  <Label>Qté max</Label>
                  <Input
                    type="number"
                    value={editingPiece.Qtémax ?? ""}
                    min={0}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditingPiece({
                        ...editingPiece,
                        Qtémax: v === "" ? "" : parseInt(v) >= 0 ? parseInt(v) : 0,
                      });
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Emplacement</Label>
                  <Input
                    value={editingPiece.Lieuentreposage || ""}
                    onChange={(e) =>
                      setEditingPiece({
                        ...editingPiece,
                        Lieuentreposage: e.target.value
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Prix unitaire (CAD $)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={editingPiece.Prix_unitaire ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditingPiece({
                        ...editingPiece,
                        Prix_unitaire: v === "" ? "" : parseFloat(v) >= 0 ? parseFloat(v) : 0,
                      });
                    }}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPiece(null)}>
                Annuler
              </Button>
              <Button
                onClick={handleUpdatePiece}
                disabled={
                  !editingPiece.NomPièce ||
                  (typeof editingPiece.QtéenInventaire === "string" && editingPiece.QtéenInventaire === "") ||
                  (typeof editingPiece.Prix_unitaire === "string" && editingPiece.Prix_unitaire === "")
                }
                className="bg-rio-red hover:bg-rio-red-dark"
              >
                Sauvegarder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
  
  function App() {
    return (
      <div className="App">
        <BrowserRouter>
          <Navigation />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/fournisseurs" element={<Fournisseurs />} />
            <Route path="/fabricant" element={<Fabricant />} />
            <Route path="/to-orders" element={<ToOrders />} />
            <Route path="/receptions" element={<Receptions />} />
            <Route path="/historique" element={<Historique />} />
          </Routes>
        </BrowserRouter>
    </div>
  );
}
export default App;
