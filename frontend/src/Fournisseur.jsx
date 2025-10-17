import React, { useEffect, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import axios from "axios";
import { Building2, Trash2, Phone, MapPin } from "lucide-react";
import { Textarea } from "./components/ui/textarea";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Fournisseurs() {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [isAddFournisseurOpen, setIsAddFournisseurOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);

  const [NewFournisseur, setNewFournisseur] = useState({
    NomFournisseur: "",
    NomContact: "",
    TitreContact: "",
    Adresse: "",
    Ville: "",
    CodePostal: "",
    Pays: "",
    NuméroTél: "",
    NumTélécopie: ""
  });

  const [newContact, setNewContact] = useState({
    Nom: "",
    Titre: "",
    Email: "",
    Telephone: "",
    Cell: "",
    RéfFournisseur: null,
  });

  const [editContact, setEditContact] = useState(null);

  useEffect(() => {
    loadFournisseurs();
  }, []);

  const loadFournisseurs = async () => {
    try {
      const res = await axios.get(`${API}/fournisseurs`);
      setFournisseurs(res.data || []);
    } catch (error) {
      console.error("Erreur chargement fournisseurs:", error);
    }
  };

  // Ajouter un fournisseur
  const handleAddFournisseur = async () => {
    try {
      await axios.post(`${API}/fournisseurs`, NewFournisseur);
      setNewFournisseur({
        NomFournisseur: "",
        NomContact: "",
        TitreContact: "",
        Adresse: "",
        Ville: "",
        CodePostal: "",
        Pays: "",
        NuméroTél: "",
        NumTélécopie: ""
      });
      setIsAddFournisseurOpen(false);
      loadFournisseurs();
    } catch (error) {
      console.error("Erreur ajout fournisseur:", error);
    }
  };

  // Supprimer un fournisseur
  const handleDeleteFournisseur = async (RéfFournisseur) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?")) {
      try {
        await axios.delete(`${API}/fournisseur/${RéfFournisseur}`);
        loadFournisseurs();
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
      }
    }
  };

  // Ajouter un contact
  const handleAddContact = async () => {
    try {
      await axios.post(`${API}/contacts`, newContact);
      setIsAddContactOpen(false);
      setNewContact({ Nom: "", Titre: "", Email: "", Telephone: "", Cell: "", RéfFournisseur: null});
      loadFournisseurs();
    } catch (error) {
      console.error("Erreur ajout contact:", error);
    }
  };

  // Supprimer un contact
  const handleDeleteContact = async (contactId) => {
    if (window.confirm("Supprimer ce contact ?")) {
      try {
        await axios.delete(`${API}/contacts/${contactId}`);
        loadFournisseurs();
      } catch (error) {
        console.error("Erreur suppression contact:", error);
      }
    }
  };

  // Modifier un contact
  const handleUpdateContact = async () => {
    try {
      await axios.put(`${API}/contacts/${editContact.RéfContact}`, editContact);
      setIsEditContactOpen(false);
      setEditContact(null);
      loadFournisseurs();
    } catch (error) {
      console.error("Erreur modification contact:", error);
    }
  };

  const openAddContact = (fournisseurId) => {
    setNewContact({ ...newContact, RéfFournisseur: fournisseurId });
    setIsAddContactOpen(true);
  };

  const openEditContact = (contact) => {
    setEditContact(contact);
    setIsEditContactOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header avec bouton */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Fournisseurs</h2>
          <Dialog open={isAddFournisseurOpen} onOpenChange={setIsAddFournisseurOpen}>
            <DialogTrigger asChild>
              <Button className="bg-rio-red hover:bg-rio-red-dark">Ajouter fournisseur</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau Fournisseur</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                <Label>Nom du fournisseur</Label>
                <Input
                  value={NewFournisseur.NomFournisseur}
                  onChange={(e) => setNewFournisseur({ ...NewFournisseur, NomFournisseur: e.target.value })}
                />
                <Label>Téléphone</Label>
                <Input
                  value={NewFournisseur.NuméroTél}
                  onChange={(e) => setNewFournisseur({ ...NewFournisseur, NuméroTél: e.target.value })}
                />
                <Label>Ville</Label>
                <Input
                  value={NewFournisseur.Ville}
                  onChange={(e) => setNewFournisseur({ ...NewFournisseur, Ville: e.target.value })}
                />
                <Label>Pays</Label>
                <Input
                  value={NewFournisseur.Pays}
                  onChange={(e) => setNewFournisseur({ ...NewFournisseur, Pays: e.target.value })}
                />
                <Label>Adresse complète</Label>
                <Textarea
                  value={NewFournisseur.Adresse}
                  onChange={(e) => setNewFournisseur({ ...NewFournisseur, Adresse: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddFournisseurOpen(false)}>Annuler</Button>
                <Button className="bg-rio-red hover:bg-rio-red-dark" onClick={handleAddFournisseur}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Liste des fournisseurs */}
        <div className="grid gap-4">
          {fournisseurs.map((f) => (
            <Card key={f.RéfFournisseur} className="hover:shadow-md transition-shadow">
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
                    <Building2 className="h-10 w-10 text-rio-red" />
                  )}
  
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{f.NomFournisseur}</h3>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {f.NuméroTél && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{f.NuméroTél}</span>
                        </div>
                      )}
                      {f.Ville && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{f.Ville}, {f.Pays}</span>
                        </div>
                      )}
                      {f.Adresse && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Adresse:</span>
                          <div>{f.Adresse}</div>
                        </div>
                      )}
                    </div>

                    {/* Contacts */}
                    {f.contacts && f.contacts.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium">Contacts</h4>
                        <ul className="text-sm text-gray-600 space-y-2">
                          {f.contacts.map((c) => (
                            <li key={c.RéfContact} className="flex justify-between items-center">
                              <span>
                                {c.Nom} {c.Titre && `(${c.Titre})`} - {c.Email} - {c.Telephone}
                              </span>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => openEditContact(c)}>Modifier</Button>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteContact(c.RéfContact)}>Supprimer</Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => openAddContact(f.RéfFournisseur)}>
                      Ajouter Contact
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFournisseur(f.RéfFournisseur)}
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

      {/* Dialog Ajouter Contact */}
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter Contact</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Input placeholder="Nom" value={newContact.Nom} onChange={(e) => setNewContact({ ...newContact, Nom: e.target.value })} />
            <Input placeholder="Titre" value={newContact.Titre} onChange={(e) => setNewContact({ ...newContact, Titre: e.target.value })} />
            <Input placeholder="Email" value={newContact.Email} onChange={(e) => setNewContact({ ...newContact, Email: e.target.value })} />
            <Input placeholder="Téléphone" value={newContact.Telephone} onChange={(e) => setNewContact({ ...newContact, Telephone: e.target.value })} />
            <Input placeholder="Cell" value={newContact.Cell} onChange={(e) => setNewContact({ ...newContact, Cell: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddContactOpen(false)}>Annuler</Button>
            <Button className="bg-rio-red hover:bg-rio-red-dark" onClick={handleAddContact}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifier Contact */}
      <Dialog open={isEditContactOpen} onOpenChange={setIsEditContactOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier Contact</DialogTitle></DialogHeader>
          {editContact && (
            <div className="grid gap-4 py-4">
              <Input placeholder="Nom" value={editContact.Nom} onChange={(e) => setEditContact({ ...editContact, Nom: e.target.value })} />
              <Input placeholder="Titre" value={editContact.Titre} onChange={(e) => setEditContact({ ...editContact, Titre: e.target.value })} />
              <Input placeholder="Email" value={editContact.Email} onChange={(e) => setEditContact({ ...editContact, Email: e.target.value })} />
              <Input placeholder="Téléphone" value={editContact.Telephone} onChange={(e) => setEditContact({ ...editContact, Telephone: e.target.value })} />
              <Input placeholder="Cell" value={editContact.Cell} onChange={(e) => setEditContact({ ...editContact, Cell: e.target.value })} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditContactOpen(false)}>Annuler</Button>
            <Button className="bg-rio-red hover:bg-rio-red-dark" onClick={handleUpdateContact}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Fournisseurs;
