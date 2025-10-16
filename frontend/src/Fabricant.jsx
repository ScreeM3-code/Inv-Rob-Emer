import React, { useEffect, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import axios from "axios";
import { Plus, Package, Edit3, Trash2, AlertTriangle, TrendingUp, Search, Users, Building, DollarSign, FileText, Phone, MapPin } from "lucide-react"
import { Textarea } from "./components/ui/textarea";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function Fabricant() {
  const [fabricant, setFabricant] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isAddFabricantOpen, setIsAddFabricantOpen] = useState(false);
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


  const loadFabricant = async () => {
    try {
      const res = await axios.get(`${API}/fabricant`);
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
        <div className="grid gap-4">
          {fabricant.map((f) => (
            <Card key={f.RefFabricant} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  {f.Domaine ? (
                    <img
                      src={`https://logo.clearbit.com/${f.Domaine}`}
                      alt={f.NomFournisseur}
                      className="h-10 w-10 rounded"
                      onError={(e) => { e.target.src = "/logos/default.png"; }}
                    />
                  ) : (
                    <Building className="h-10 w-10 text-rio-red" />
                  )}
      
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{f.NomFabricant}</h3>
                      {f.NomContact && (
                        <p className="text-gray-600">{f.NomContact} {f.TitreContact && `- ${f.TitreContact}`}</p>
                        )}
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    </div>
                  </div>

                  <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteFabricant(f.RefFabricant)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
     </div>
  );
}

export default Fabricant;
