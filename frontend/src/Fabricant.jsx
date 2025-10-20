import React, { useEffect, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import axios from "axios";
import { Plus, Package, Edit3, Trash2, AlertTriangle, TrendingUp, Search, Users, Building, DollarSign, FileText, Phone, MapPin } from "lucide-react"
import { Textarea } from "./components/ui/textarea";
import FabricantCard from "./components/fabricants/FabricantCard";
import FabricantFormDialog from "./components/fabricants/FabricantFormDialog";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Fabricant() {
  const [fabricant, setFabricant] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [editingFabricant, setEditingFabricant] = useState(null);
  const [isAddFabricantOpen, setIsAddFabricantOpen] = useState(false);
  const filteredFabricants = fabricants.filter(f => {
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
  const [NewFabricant, setNewFabricant] = useState({
    NomFabricant: "",
    NomContact: "",
    TitreContact: "",
    Email: ""
  });

  // Charger toutes les Founisseur au démarrage

  useEffect(() => {
    loadFabricant();
  }, []);

  const handleUpdateFabricant = async (formData) => {
    try {
      await axios.put(`${API}/fabricant/${editingFabricant.RefFabricant}`, formData);
      setEditingFabricant(null);
      loadFabricant();
    } catch (error) {
      console.error("Erreur modification fabricant:", error);
    }
  };

  const loadFabricant = async () => {
    try {
      const res = await axios.get(`${API}/fabricant`);
      console.log("📦 Fabricants chargés:", res.data); // DEBUG
      setFabricant(res.data || []);
    } catch (error) {
      console.error("Erreur chargement fabricant:", error);
    }
  };

  const handleAddFabricant = async () => {
    try {
      await axios.post(`${API}/fabricant`, NewFabricant);
      setNewFabricant({ 
        NomFabricant: "",
        NomContact: "",
        TitreContact: "",
        Email: ""
      });
      setIsAddFabricantOpen(false);
      loadFabricant(currentPage);
    } catch (error) {
      console.error("Erreur ajout fabricant:", error);
    }
  };
 // Supprimer un Fabricant
  const handleDeleteFabricant = async (RefFabricant) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce fabricant ?")) {
      try {
        await axios.delete(`${API}/fabricant/${RefFabricant}`);
        loadFabricant(currentPage);
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
      }
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header avec bouton */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Fabricant</h2>
          {/* Liste des Fabricants */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {fabricant.map((f) => (
                  <FabricantCard
                    key={f.RefFabricant}
                    fabricant={f}
                    onEdit={() => setEditingFabricant(f)}
                    onDelete={() => handleDeleteFabricant(f.RefFabricant)}
                  />
                ))}
              </div>
            <Dialog open={isAddFabricantOpen} onOpenChange={setIsAddFabricantOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setOpenAdd(true)} className="bg-rio-red hover:bg-rio-red-dark">
                  Ajouter fabricant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Ajouter un nouveau Fabricant</DialogTitle>
                 </DialogHeader>
                 <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                 <div>
                   <Label>Nom du fabricant</Label>
                   <Input
                     value={NewFabricant.NomFabricant}
                     onChange={(e) => setNewFabricant({...NewFabricant, NomFabricant: e.target.value})}
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <Label>Contact</Label>
                     <Input
                       value={NewFabricant.NomContact}
                       onChange={(e) => setNewFabricant({...NewFabricant, NomContact: e.target.value})}
                     />
                   </div>
                   <div>
                     <Label>Titre</Label>
                     <Input
                       value={NewFabricant.TitreContact}
                       onChange={(e) => setNewFabricant({...NewFabricant, TitreContact: e.target.value})}
                     />
                   </div>
                 </div>
                 <div>
                   <Label>Email</Label>
                   <Input
                     value={NewFabricant.Email}
                     onChange={(e) => setNewFabricant({...NewFabricant, Email: e.target.value})}
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <Label>Domaine pour logo</Label>
                     <Input
                       value={NewFabricant.Domaine}
                       onChange={(e) => setNewFabricant({...NewFabricant, Domaine: e.target.value})}
                     />
                   </div>
                 </div>
               </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddFabricantOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddFabricant} className="bg-rio-red hover:bg-rio-red-dark">
                    Ajouter Fabricant
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog> 
        </div>

        {/* Liste des Fabricant */}
        {isAddFabricantOpen && (
          <FabricantFormDialog
            onSave={handleAddFabricant}
            onCancel={() => setIsAddFabricantOpen(false)}
          />
        )}

        {editingFabricant && (
          <FabricantFormDialog
            fabricant={editingFabricant}
            onSave={handleUpdateFabricant}
            onCancel={() => setEditingFabricant(null)}
          />
        )}
      </div>
     </div>
  );
}

export default Fabricant;
