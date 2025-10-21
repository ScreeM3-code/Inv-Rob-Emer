import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Plus, Package, Loader2, AlertTriangle, DollarSign } from "lucide-react";
import { PieceCard } from "@/components/inventaire/PieceCard";
import PieceAddDialog from "@/components/inventaire/PieceAddDialog";
import PieceEditDialog from "@/components/inventaire/PieceEditDialog";
import InventoryFilters from "@/components/inventaire/InventoryFilters";
import ToOrders from "./ToOrders";
import Fournisseurs from "./Fournisseur";
import Fabricant from "./Fabricant";
import Historique from "./Historique";
import Receptions from "./Receptions";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Navigation Component
const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Inventaire", icon: Package },
    { path: "/fournisseurs", label: "Fournisseurs" },
    { path: "/fabricant", label: "Fabricant" },
    { path: "/to-orders", label: "Commander" },
    { path: "/receptions", label: "Réceptions" },
    { path: "/historique", label: "Historique" }
  ];

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
              {navItems.map(({ path, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === path
                      ? 'bg-rio-red text-white'
                      : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [pieces, setPieces] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [fabricants, setFabricants] = useState([]);
  const [stats, setStats] = useState({ 
    total_pieces: 0, 
    stock_critique: 0, 
    valeur_stock: 0, 
    pieces_a_commander: 0 
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    statut: "tous",
    alerte: "tous"
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPiece, setEditingPiece] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  
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

  // Charger les données
  const loadData = async (page = 0, search = '') => {
    try {
      setLoading(true);
      const cleanedSearch = search.trim();
      const piecesUrl = cleanedSearch
        ? `${API}/pieces?limit=50&offset=${page * 50}&search=${encodeURIComponent(cleanedSearch)}`
        : `${API}/pieces?limit=50&offset=${page * 50}`;

      const [piecesRes, fournisseursRes, statsRes, fabricantsRes] = await Promise.all([
        axios.get(piecesUrl),
        axios.get(`${API}/fournisseurs`),
        axios.get(`${API}/stats`),
        axios.get(`${API}/fabricant`),
      ]);

      setPieces(piecesRes.data || []);
      setFournisseurs(fournisseursRes.data || []);
      setStats(statsRes.data || { total_pieces: 0, stock_critique: 0, valeur_stock: 0, pieces_a_commander: 0 });
      setFabricants(fabricantsRes.data || []);
    } catch (error) {
      console.error("❌ Erreur chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(0, '');
  }, []);

  useEffect(() => {
    if (searchTerm === '' && currentPage === 0) return;
    const timer = setTimeout(() => {
      loadData(currentPage, searchTerm);
    }, 700);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm]);

  // Filtrage des pièces avec statut_stock du backend
  const filteredPieces = pieces.filter(piece => {
    // Filtre recherche
    const matchSearch = searchTerm === '' ||
      piece.NomPièce?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      piece.NumPièce?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      piece.NumPièceAutreFournisseur?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      piece.DescriptionPièce?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtre statut (utilise statut_stock du backend)
    const matchStatut = filters.statut === "tous" || piece.statut_stock === filters.statut;
    
    // Filtre alerte
    const matchAlerte = filters.alerte === "tous" ||
      (filters.alerte === "alerte" && piece.QtéenInventaire <= piece.Qtéminimum) ||
      (filters.alerte === "normal" && piece.QtéenInventaire > piece.Qtéminimum);
    
    return matchSearch && matchStatut && matchAlerte;
  });

  // Sortie rapide d'une pièce
  const handleQuickRemove = async (piece) => {
    if (piece.QtéenInventaire <= 0) {
      alert("Le stock est déjà à zéro.");
      return;
    }

    try {
      const response = await fetch(`${API}/current-user`);
      const data = await response.json();
      const user = data.user;

      await fetch(`${API}/pieces/${piece.RéfPièce}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ QtéenInventaire: piece.QtéenInventaire - 1 }),
      });

      const historyEntry = {
        Opération: "Sortie rapide",
        QtéSortie: "1",
        RéfPièce: piece.RéfPièce,
        nompiece: piece.NomPièce,
        numpiece: piece.NumPièce,
        User: user || "Système",
        DateRecu: new Date().toISOString(),
        description: `Sortie de 1 unité depuis la page d'inventaire.`,
      };

      await fetch(`${API}/historique`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(historyEntry),
      });

      loadData(currentPage, searchTerm);
    } catch (error) {
      console.error("Erreur sortie rapide:", error);
      alert("Erreur lors de la sortie rapide");
    }
  };

  // Ajouter une pièce
  const handleAddPiece = async () => {
    try {
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

      await axios.post(`${API}/pieces`, cleanedPiece);
      
      setIsAddDialogOpen(false);
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

      await loadData(currentPage, searchTerm);
    } catch (error) {
      console.error("❌ Erreur ajout:", error);
      alert("Erreur lors de l'ajout: " + (error.response?.data?.detail || error.message));
    }
  };

  // Modifier une pièce
  const handleUpdatePiece = async () => {
    if (!editingPiece || !editingPiece.RéfPièce) {
      alert("Impossible de déterminer la pièce à mettre à jour.");
      return;
    }
    
    try {
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
      loadData(currentPage, searchTerm);
    } catch (error) {
      console.error("Erreur mise à jour:", error.response?.data || error.message);
      alert("Erreur: " + (error.response?.data?.detail || error.message));
    }
  };

  // Supprimer une pièce
  const handleDeletePiece = async (pieceId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette pièce ?")) {
      try {
        await axios.delete(`${API}/pieces/${pieceId}`);
        loadData(currentPage, searchTerm);
      } catch (error) {
        console.error("Erreur suppression:", error);
      }
    }
  };

  // Gestionnaires de changement
  const handleNewPieceChange = (field, value) => {
    setNewPiece(prev => ({ ...prev, [field]: value }));
  };

  const handleEditPieceChange = (field, value) => {
    setEditingPiece(prev => ({ ...prev, [field]: value }));
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pièces</CardTitle>
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
              <div className="text-2xl font-bold">
                {stats.valeur_stock.toLocaleString('fr-CA', {style: 'currency', currency: 'CAD'})}
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition">
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

        {/* Bouton Ajouter */}
        <div className="flex justify-end mb-6">
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-rio-red hover:bg-rio-red-dark"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle pièce
          </Button>
        </div>

        {/* Filtres */}
        <InventoryFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFilterChange={handleFilterChange}
          resultCount={filteredPieces.length}
          totalCount={pieces.length}
        />

        {/* Chargement */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Grille des pièces */}
            {filteredPieces.length > 0 ? (
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
                      onEdit={() => setEditingPiece(piece)}
                      onDelete={() => handleDeletePiece(piece.RéfPièce)}
                      onQuickRemove={() => handleQuickRemove(piece)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/60 rounded-lg border-2 border-dashed">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune pièce trouvée</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || filters.statut !== "tous" || filters.alerte !== "tous"
                    ? "Essayez de modifier vos filtres de recherche."
                    : "Commencez par ajouter une nouvelle pièce."}
                </p>
              </div>
            )}

            {/* Pagination */}
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
                disabled={pieces.length < 50}
              >
                Suivant
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Dialog Ajout */}
      {isAddDialogOpen && (
        <PieceAddDialog
          piece={newPiece}
          fournisseurs={fournisseurs}
          fabricants={fabricants}
          onSave={handleAddPiece}
          onCancel={() => setIsAddDialogOpen(false)}
          onChange={handleNewPieceChange}
        />
      )}

      {/* Dialog Édition */}
      {editingPiece && (
        <PieceEditDialog
          piece={editingPiece}
          fournisseurs={fournisseurs}
          fabricants={fabricants}
          onSave={handleUpdatePiece}
          onCancel={() => setEditingPiece(null)}
          onChange={handleEditPieceChange}
        />
      )}
    </div>
  );
};

// App Principal
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