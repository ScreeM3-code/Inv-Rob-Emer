import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, User, Phone, Mail, MapPin, Edit, Trash2, Users, ShoppingBasket, Component, Webhook  } from "lucide-react";

export default function FournisseurCard({ fournisseur, onEdit, onDelete, onManageContacts }) {
  const InfoItem = ({ icon, text }) => (
    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-white">
      {icon}
      <span className="truncate">{text}</span>
    </div>
  );

  const logoUrl = fournisseur.Domaine ? `https://logo.clearbit.com/${fournisseur.Domaine}` : '';
  const handleLogoError = (e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; };

  const contacts = fournisseur.contacts || [];

  return (
    <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {fournisseur.Domaine ? (
            <>
              <img src={logoUrl} alt={fournisseur.NomFournisseur} className="w-8 h-8 rounded" onError={handleLogoError} />
            </>
          ) : (
            <Building2 className="w-8 h-8 text-blue-600" />
          )}
          <span className="truncate">{fournisseur.NomFournisseur}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
          <div className="space-y-2">
            <InfoItem icon={<Component className="w-4 h-4" />}  text={`Marque: ${fournisseur.Marque || ''}`} />
            <InfoItem icon={<ShoppingBasket className="w-4 h-4" />} text={`Produit: ${fournisseur.Produit || ''}`} />
            <InfoItem icon={<Webhook  className="w-4 h-4" />} text={`Sap: ${fournisseur.NumSap || ''}`} />
        </div>
        <div className="space-y-2">
            <InfoItem icon={<User className="w-4 h-4" />} text={`${fournisseur.NomContact || 'Contact principal N/A'}`} />
            {fournisseur.NuméroTél && <InfoItem icon={<Phone className="w-4 h-4" />} text={fournisseur.NuméroTél} />}
            {(fournisseur.Adresse || fournisseur.Ville) && <InfoItem icon={<MapPin className="w-4 h-4" />} text={`${fournisseur.Adresse || ''}, ${fournisseur.Ville || ''}`} />}
        </div>
        
        {contacts.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Contacts</h4>
            {contacts.slice(0, 2).map((contact, index) => (
              <div key={index} className="text-sm">
                <p className="font-medium truncate">{contact.Nom}</p>
                <a href={`mailto:${contact.Email}`} className="flex items-center gap-1 text-blue-600 hover:underline truncate">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span>{contact.Email}</span>
                </a>
              </div>
            ))}
            {contacts.length > 2 && <p className="text-xs text-slate-500 mt-1">et {contacts.length - 2} autre(s)...</p>}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4 flex justify-end gap-2">
        <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="w-4 h-4 text-red-500" /></Button>
        <Button variant="outline" size="icon" onClick={onEdit}><Edit className="w-4 h-4" /></Button>
        <Button size="sm" onClick={onManageContacts}><Users className="w-4 h-4 mr-2" />Gérer contacts</Button>
      </CardFooter>
    </Card>
  );
}