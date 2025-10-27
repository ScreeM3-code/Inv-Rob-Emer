import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Factory, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import FabricantCard from "@/components/fabricants/FabricantCard";
import FabricantFormDialog from "@/components/fabricants/FabricantFormDialog";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function FabricantsPage() {
  const [fabricants, setFabricants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingFabricant, setEditingFabricant] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadFabricants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API}/fabricant`);
      if (!response.ok) throw new Error("Erreur réseau");
      const data = await response.json();
      console.log("📦 Fabricants chargés:", data); // DEBUG
      setFabricants(data || []);
    } catch (err) {
      console.error("Erreur chargement fabricants:", err);
      setError("Impossible de charger les fabricants.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFabricants();
  }, [loadFabricants]);
  
  const handleSave = async (fabricantData) => {
    try {
        // ✅ FIX: S'assurer que RefFabricant est bien présent pour la mise à jour
        const url = fabricantData.RefFabricant 
            ? `${API}/fabricant/${fabricantData.RefFabricant}`
            : `${API}/fabricant`;
        
        const method = fabricantData.RefFabricant ? 'PUT' : 'POST';

        console.log('📤 Envoi au backend:', { url, method, data: fabricantData }); // DEBUG

        const response = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(fabricantData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Erreur backend:', errorData);
            throw new Error(errorData.detail || "La sauvegarde a échoué");
        }
        
        console.log('✅ Sauvegarde réussie');
        setIsFormOpen(false);
        setEditingFabricant(null);
        await loadFabricants();
    } catch (err) {
      console.error("❌ Erreur sauvegarde:", err);
      setError(err.message);
      alert("Erreur lors de la sauvegarde: " + err.message); // ✅ Alerte pour débogage
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce fabricant ?")) {
      try {
        const response = await fetch(`${API}/fabricant/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("La suppression a échoué");
        await loadFabricants();
      } catch (err) {
        console.error("Erreur suppression:", err);
        setError(err.message);
      }
    }
  };

  const openForm = (fabricant = null) => {
    setEditingFabricant(fabricant);
    setIsFormOpen(true);
  };
  
  // Fonction de filtrage améliorée
  const filteredFabricants = fabricants.filter(f => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Recherche dans le nom
    const matchNom = f.NomFabricant?.toLowerCase().includes(searchLower);
    
    // Recherche dans le domaine
    const matchDomaine = f.Domaine?.toLowerCase().includes(searchLower);
    
    // Recherche dans le contact
    const matchContact = f.NomContact?.toLowerCase().includes(searchLower);
    const matchTitre = f.TitreContact?.toLowerCase().includes(searchLower);
    const matchEmail = f.Email?.toLowerCase().includes(searchLower);
    
    return matchNom || matchDomaine || matchContact || matchTitre || matchEmail;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <Factory className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Fabricants</h1>
              <p className="text-slate-600">Gérez les fabricants de vos pièces</p>
            </div>
          </div>
          <Button 
            onClick={() => openForm()} 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" /> Ajouter un Fabricant
          </Button>
        </div>
        
        {/* Barre de recherche */}
        <div className="mb-6 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input 
              placeholder="Rechercher un fabricant (nom, domaine, contact, email)..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-12 pr-10 h-12 text-base bg-white/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Compteur de résultats */}
          {searchTerm && (
            <div className="mt-3 text-sm text-slate-600 flex items-center gap-2">
              <span className="font-medium">
                {filteredFabricants.length} résultat{filteredFabricants.length !== 1 ? 's' : ''} trouvé{filteredFabricants.length !== 1 ? 's' : ''}
              </span>
              {filteredFabricants.length < fabricants.length && (
                <span className="text-slate-400">
                  sur {fabricants.length} fabricant{fabricants.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Chargement */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          </div>
        )}
        
        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}
        
        {/* Grille des fabricants */}
        {!loading && !error && (
          <>
            {filteredFabricants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredFabricants.map(f => (
                  <FabricantCard 
                    key={f.RefFabricant} 
                    fabricant={f}
                    onEdit={() => openForm(f)}
                    onDelete={() => handleDelete(f.RefFabricant)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white/60 rounded-lg border-2 border-dashed border-slate-200">
                <Factory className="mx-auto w-20 h-20 text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {searchTerm ? 'Aucun fabricant trouvé' : 'Aucun fabricant'}
                </h3>
                <p className="text-slate-600 mb-4">
                  {searchTerm 
                    ? `Aucun résultat pour "${searchTerm}"`
                    : "Commencez par ajouter votre premier fabricant"}
                </p>
                {searchTerm && (
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm('')}
                    className="mt-2"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Effacer la recherche
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {/* Dialog formulaire */}
        {isFormOpen && (
          <FabricantFormDialog
            fabricant={editingFabricant}
            onSave={handleSave}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingFabricant(null);
            }}
          />
        )}
      </div>
    </div>
  );
}