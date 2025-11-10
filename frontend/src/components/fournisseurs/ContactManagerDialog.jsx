import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, User, Mail, Phone, Briefcase } from "lucide-react";
import ContactForm from './ContactForm';

export default function ContactManagerDialog({ fournisseur, onSaveContact, onDeleteContact, onCancel }) {
  const [editingContact, setEditingContact] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleSave = (contactData) => {
    onSaveContact({ ...contactData, RéfFournisseur: fournisseur.RéfFournisseur });
    setEditingContact(null);
    setIsAdding(false);
  };

  const startEditing = (contact) => {
    setIsAdding(false);
    setEditingContact(contact);
  };

  const startAdding = () => {
    setEditingContact(null);
    setIsAdding(true);
  };
  
  const cancelForm = () => {
    setEditingContact(null);
    setIsAdding(false);
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gérer les contacts de {fournisseur.NomFournisseur}</DialogTitle>
          <DialogDescription>Ajoutez, modifiez ou supprimez les contacts pour ce fournisseur.</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto px-6 space-y-4">
          {fournisseur.contacts?.map(contact => (
             editingContact?.RéfContact === contact.RéfContact ? (
              <ContactForm key={contact.RéfContact} contact={editingContact} onSave={handleSave} onCancel={cancelForm} />
            ) : (
              <div key={contact.RéfContact} className="p-3 rounded-lg border flex items-start justify-between">
                <div className="space-y-1 text-sm">
                   <p className="font-semibold text-base flex items-center gap-2"><User className="w-4 h-4 text-blue-600"/>{contact.Nom} {contact.Titre && <span className="text-xs text-slate-500 font-normal">({contact.Titre})</span>}</p>
                   {contact.Email && <a href={`mailto:${contact.Email}`} className="flex items-center gap-2 text-blue-700 hover:underline"><Mail className="w-4 h-4"/>{contact.Email}</a>}
                   {contact.Telephone && <p className="flex items-center gap-2"><Phone className="w-4 h-4"/>{contact.Telephone}</p>}
                   {contact.Produit && <p className="flex items-center gap-2 text-slate-600"><Briefcase className="w-4 h-4"/>{contact.Produit}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEditing(contact)}><Edit className="w-4 h-4 text-slate-600" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDeleteContact(contact.RéfContact)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              </div>
            )
          ))}

          {isAdding && (
            <ContactForm onSave={handleSave} onCancel={cancelForm} />
          )}
          
          {!isAdding && !editingContact && (
            <Button variant="outline" onClick={startAdding} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Ajouter un contact
            </Button>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}