import React from 'react';
import { useCart } from './CartContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../../lib/utils';

const API_URL = "http://localhost:8000/api";

const fetchFournisseurs = async () => {
  return fetchJson(`${API_URL}/fournisseurs`);
}

export default function CartPanel({ children }) {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const { data: fournisseurs, isLoading: isLoadingFournisseurs } = useQuery({ 
    queryKey: ['fournisseurs'], 
    queryFn: fetchFournisseurs 
  });

  const groupedBySupplier = cartItems.reduce((acc, item) => {
    const supplierId = item.RéfFournisseur;
    if (!acc[supplierId]) {
      acc[supplierId] = [];
    }
    acc[supplierId].push(item);
    return acc;
  }, {});
  
  // frontend/src/components/cart/CartPanel.jsx

const handleGenerateEmail = (supplierId, items) => {
  if (!fournisseurs) return;
  
  const supplier = fournisseurs.find(f => f.RéfFournisseur === supplierId);
    if (!supplier) {
        alert("Fournisseur introuvable pour générer l'email.");
        return;
    }
  
  // Récupérer les emails des contacts
  const contactEmails = supplier.contacts?.map(c => c.Email).filter(Boolean).join(',') || '';

    if (!contactEmails) {
      alert("Aucun email de contact trouvé pour ce fournisseur.");
      return;
    }

  // Construire le sujet
  const subject = encodeURIComponent(`Demande de soumission - ${supplier.NomFournisseur}`);
  
  // Construire le corps de l'email
  const bodyLines = [
      "Bonjour,",
      "",
      `Nous souhaitons recevoir une soumission pour les pièces suivantes :`,
      ""
  ];
  
  items.forEach(item => {
      bodyLines.push(`- ${item.NomPièce}`);
      bodyLines.push(`  • Référence: ${item.NumPièce}`);
      if (item.DescriptionPièce) {
        bodyLines.push(`  • Description: ${item.DescriptionPièce}`);
      }
      if (item.NumPièceAutreFournisseur) {
        bodyLines.push(`  • N° pièce fournisseur: ${item.NumPièceAutreFournisseur}`);
      }
      bodyLines.push(`  • Quantité demandée: ${item.cartQty}`);
      bodyLines.push("");
  });
  
  bodyLines.push("Pourriez-vous nous faire parvenir vos meilleurs prix et délais de livraison ?");
  bodyLines.push("");
  bodyLines.push("Cordialement,");
  bodyLines.push("Équipe Maintenance");
  
  const body = encodeURIComponent(bodyLines.join('\n'));

  // Ouvrir le client email
  window.location.href = `mailto:${contactEmails}?subject=${subject}&body=${body}`;
  
  // Optionnel: Retirer les items du panier après envoi
  items.forEach(item => removeFromCart(item.RéfPièce));
  
  const history = JSON.parse(localStorage.getItem('emailHistory') || '[]');
    localStorage.setItem('emailHistory', JSON.stringify([...history, emailHistory]));
  };


  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-full md:w-[500px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Panier de demande de soumission</SheetTitle>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto pr-4 space-y-6">
          {Object.entries(groupedBySupplier).map(([supplierId, items]) => {
            const supplierName = items[0]?.fournisseur_principal?.NomFournisseur || `Fournisseur #${supplierId}`;
            return (
              <div key={supplierId} className="border p-4 rounded-lg">
                <h3 className="font-bold mb-3">{supplierName}</h3>
                <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.RéfPièce} className="flex justify-between items-center text-sm">
                        <div>
                          <p className="font-medium">{item.NomPièce}</p>
                          <p className="text-slate-500">Qté: {item.Qtéàcommander}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.RéfPièce)}><X className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    ))}
                </div>
                <Button className="w-full mt-4" onClick={() => handleGenerateEmail(Number(supplierId), items)} disabled={isLoadingFournisseurs}>
                    Générer email pour {supplierName}
                </Button>
              </div>
            )
          })}
           {cartItems.length === 0 && <p className="text-center text-slate-500 pt-10">Votre panier est vide.</p>}
        </div>
        {cartItems.length > 0 && (
          <SheetFooter className="border-t pt-4">
            <Button variant="outline" onClick={clearCart} className="w-full">
              <Trash2 className="w-4 h-4 mr-2"/>Vider le panier
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}