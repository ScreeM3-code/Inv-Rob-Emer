import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, User, Phone, Mail, MapPin, Edit, Trash2, Users, ShoppingBasket, Component, Webhook  } from "lucide-react";
import { usePermissions } from '@/hooks/usePermissions';

export default function FournisseurCard({ fournisseur, onEdit, onDelete, onManageContacts }) {
  const InfoItem = ({ icon, text }) => (
    <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600 dark:text-white">
      {icon}
      <span className="truncate">{text}</span>
    </div>
  );

  const logoUrl = fournisseur.Domaine ? `https://img.logo.dev/${fournisseur.Domaine}?token=pk_I3--EpsKQV-62K22jiWMbw` : '';
  const handleLogoError = (e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; };
  const { can, isAdmin } = usePermissions();
  const contacts = fournisseur.contacts || [];

  return (
    <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="p-3 md:p-6">
        <CardTitle className="flex items-center gap-2 md:gap-3 text-sm md:text-base">
          {fournisseur.Domaine ? (
            <>
              <img src={logoUrl} alt={fournisseur.NomFournisseur} className="w-6 h-6 md:w-8 md:h-8 rounded" onError={handleLogoError} />
            </>
          ) : (
            <Building2 className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
          )}
          <span className="truncate">{fournisseur.NomFournisseur}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 md:space-y-4 p-3 md:p-6 pt-0">
        
        {/* Infos secondaires - masquées sur mobile */}
        <div className="hidden md:block space-y-2">
          <InfoItem icon={<Component className="w-4 h-4" />}  text={`Marque: ${fournisseur.Marque || ''}`} />
          <InfoItem icon={<ShoppingBasket className="w-4 h-4" />} text={`Produit: ${fournisseur.Produit || ''}`} />
          <InfoItem icon={<Webhook  className="w-4 h-4" />} text={`Sap: ${fournisseur.NumSap || ''}`} />
          {(fournisseur.Adresse || fournisseur.Ville) && (
            <InfoItem icon={<MapPin className="w-4 h-4" />} text={`${fournisseur.Adresse || ''}, ${fournisseur.Ville || ''}`} />
          )}
        </div>
        
        {/* Contacts - masqués sur mobile */}
        {contacts.length > 0 && (
          <div className="md:block border-t pt-3 space-y-2">
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
      <CardFooter className="border-t pt-3 md:pt-4 flex justify-end gap-1 md:gap-2 p-3 md:p-6">
        {can('fournisseur_delete') && <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 md:h-10 md:w-10">
          <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
        </Button>}
        {can('fournisseur_update') && <Button variant="outline" size="icon" onClick={onEdit} className="h-8 w-8 md:h-10 md:w-10">
          <Edit className="w-3 h-3 md:w-4 md:h-4" />
        </Button>}
        <Button size="sm" onClick={onManageContacts} className="h-8 px-2 md:px-3 text-xs md:text-sm">
          <Users className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Contacts</span>
        </Button>
      </CardFooter>
    </Card>
  );
}