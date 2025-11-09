import React, { useState, useEffect, useCallback } from "react";
import { fetchJson, log } from './lib/utils';
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Search, X, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import FournisseurCard from "@/components/fournisseurs/FournisseurCard";
import FournisseurFormDialog from "@/components/fournisseurs/FournisseurFormDialog";
import ContactManagerDialog from "@/components/fournisseurs/ContactManagerDialog";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingFournisseur, setEditingFournisseur] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [managingContactsFor, setManagingContactsFor] = useState(null);

  const loadFournisseurs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
  const data = await fetchJson(`${API}/fournisseurs`);
  log("🏢 Fournisseurs chargés:", data);
  setFournisseurs(data || []);
    } catch (err) {
      log("❌ Erreur chargement fournisseurs:", err);
      setError(`Impossible de charger les fournisseurs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFournisseurs();
  }, [loadFournisseurs]);
  
  const handleSaveFournisseur = async (fournisseurData) => {
    try {
        const url = fournisseurData.RéfFournisseur 
            ? `${API}/fournisseurs/${fournisseurData.RéfFournisseur}`
            : `${API}/fournisseurs`;
        
        const method = fournisseurData.RéfFournisseur ? 'PUT' : 'POST';

    await fetchJson(url, {
      method: method,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(fournisseurData)
    });
        
        setIsFormOpen(false);
        setEditingFournisseur(null);
        await loadFournisseurs();
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
      setError(err.message);
    }
  };

  const handleDeleteFournisseur = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?")) {
      try {
  await fetchJson(`${API}/fournisseurs/${id}`, { method: 'DELETE' });
  await loadFournisseurs();
      } catch (err) {
        console.error("Erreur suppression:", err);
        setError(err.message);
      }
    }
  };

  const openForm = (fournisseur = null) => {
    setEditingFournisseur(fournisseur);
    setIsFormOpen(true);
  };

  const handleSaveContact = async (contactData) => {
    try {
      const url = contactData.RéfContact
        ? `${API}/fournisseurs/contacts/${contactData.RéfContact}`
        : `${API}/fournisseurs/contacts`;
      const method = contactData.RéfContact ? 'PUT' : 'POST';
      
      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });
      await loadFournisseurs();

      // Rafraîchir le fournisseur dans le dialogue
      const updatedFournisseurs = await fetchJson(`${API}/fournisseurs`);
      const freshFournisseur = updatedFournisseurs.find(f => f.RéfFournisseur === contactData.RéfFournisseur);
      setManagingContactsFor(freshFournisseur);

    } catch (err) {
      console.error("Erreur sauvegarde contact:", err);
      setError(err.message);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) {
      try {
  await fetchJson(`${API}/fournisseurs/contacts/${contactId}`, { method: 'DELETE' });
  await loadFournisseurs();
        
        // Mettre à jour le state local
        setManagingContactsFor(prev => {
            if (!prev) return null;
            const newContacts = prev.contacts.filter(c => c.RéfContact !== contactId);
            return { ...prev, contacts: newContacts };
        });

      } catch (err) {
        console.error("Erreur suppression contact:", err);
        setError(err.message);
      }
    }
  };
  
  // Fonction de filtrage améliorée avec recherche dans les contacts
  const filteredFournisseurs = fournisseurs.filter(f => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Recherche dans le nom du fournisseur
    const matchNom = f.NomFournisseur?.toLowerCase().includes(searchLower);
    
    // Recherche dans l'adresse
    const matchAdresse = f.Adresse?.toLowerCase().includes(searchLower);
    const matchVille = f.Ville?.toLowerCase().includes(searchLower);
    const matchPays = f.Pays?.toLowerCase().includes(searchLower);
    
    // Recherche dans le téléphone
    const matchTel = f.NuméroTél?.toLowerCase().includes(searchLower);
    
    // Recherche dans les produits et marques
    const matchProduit = f.Produit?.toLowerCase().includes(searchLower);
    const matchMarque = f.Marque?.toLowerCase().includes(searchLower);
    const matchNumSap = f.NumSap?.toLowerCase().includes(searchLower);
    
    // Recherche dans les contacts (NOM, EMAIL, TELEPHONE, TITRE)
    const matchContacts = f.contacts?.some(contact => 
      contact.Nom?.toLowerCase().includes(searchLower) ||
      contact.Email?.toLowerCase().includes(searchLower) ||
      contact.Telephone?.toLowerCase().includes(searchLower) ||
      contact.Cell?.toLowerCase().includes(searchLower) ||
      contact.Titre?.toLowerCase().includes(searchLower)
    );
    
    return matchNom || matchAdresse || matchVille || matchPays || matchTel || 
           matchProduit || matchMarque || matchNumSap || matchContacts;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Fournisseurs</h1>
              <p className="text-slate-600">Gérez vos contacts et partenaires commerciaux</p>
            </div>
          </div>
          <Button 
            onClick={() => openForm()} 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" /> Ajouter un Fournisseur
          </Button>
        </div>
        
        {/* Barre de recherche */}
        <div className="mb-6 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input 
              placeholder="Rechercher un fournisseur (nom, contact, email, téléphone, produit, adresse)..." 
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
                {filteredFournisseurs.length} résultat{filteredFournisseurs.length !== 1 ? 's' : ''} trouvé{filteredFournisseurs.length !== 1 ? 's' : ''}
              </span>
              {filteredFournisseurs.length < fournisseurs.length && (
                <span className="text-slate-400">
                  sur {fournisseurs.length} fournisseur{fournisseurs.length !== 1 ? 's' : ''}
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
        
        {/* Grille des fournisseurs */}
        {!loading && !error && (
          <>
            {filteredFournisseurs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredFournisseurs.map(f => (
                  <FournisseurCard 
                    key={f.RéfFournisseur} 
                    fournisseur={f}
                    onEdit={() => openForm(f)}
                    onDelete={() => handleDeleteFournisseur(f.RéfFournisseur)}
                    onManageContacts={() => setManagingContactsFor(f)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white/60 rounded-lg border-2 border-dashed border-slate-200">
                <Building2 className="mx-auto w-20 h-20 text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {searchTerm ? 'Aucun fournisseur trouvé' : 'Aucun fournisseur'}
                </h3>
                <p className="text-slate-600 mb-4">
                  {searchTerm 
                    ? `Aucun résultat pour "${searchTerm}"`
                    : "Commencez par ajouter votre premier fournisseur"}
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

        {/* Dialog formulaire fournisseur */}
        {isFormOpen && (
          <FournisseurFormDialog
            fournisseur={editingFournisseur}
            onSave={handleSaveFournisseur}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingFournisseur(null);
            }}
          />
        )}

        {/* Dialog gestion contacts */}
        {managingContactsFor && (
          <ContactManagerDialog
            fournisseur={managingContactsFor}
            onSaveContact={handleSaveContact}
            onDeleteContact={handleDeleteContact}
            onCancel={() => setManagingContactsFor(null)}
          />
        )}
      </div>
    </div>
  );
}