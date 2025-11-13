import React, { useState } from 'react';
import { useCart } from './CartContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Trash2, Edit, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../../lib/utils';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const fetchFournisseurs = async () => {
  return fetchJson(`${API_URL}/fournisseurs`);
}

// Templates de champs disponibles
const CHAMPS_DISPONIBLES = [
  { id: 'NomPièce', label: 'Nom de la pièce', checked: true },
  { id: 'NumPièce', label: 'N° de pièce', checked: true },
  { id: 'NumPièceAutreFournisseur', label: 'N° pièce fournisseur', checked: true },
  { id: 'DescriptionPièce', label: 'Description', checked: false },
  { id: 'cartQty', label: 'Quantité demandée', checked: true },
  { id: 'Prix_unitaire', label: 'Prix unitaire', checked: false },
  { id: 'Lieuentreposage', label: 'Emplacement', checked: false },
  { id: 'RTBS', label: 'N° SAP', checked: false },
  { id: 'NoFESTO', label: 'N° FESTO', checked: false },
];

export default function CartPanel({ children }) {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const { data: fournisseurs, isLoading: isLoadingFournisseurs } = useQuery({ 
    queryKey: ['fournisseurs'], 
    queryFn: fetchFournisseurs 
  });

  const [previewDialog, setPreviewDialog] = useState({ open: false, data: null });
  const [selectedFields, setSelectedFields] = useState(
    CHAMPS_DISPONIBLES.filter(c => c.checked).map(c => c.id)
  );
  const [customMessage, setCustomMessage] = useState('');

  const groupedBySupplier = cartItems.reduce((acc, item) => {
    const supplierId = item.RéfFournisseur;
    if (!acc[supplierId]) {
      acc[supplierId] = [];
    }
    acc[supplierId].push(item);
    return acc;
  }, {});

  console.log('🔢 Grouped:', groupedBySupplier);

  const toggleField = (fieldId) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const buildEmailBody = (items, fournisseur) => {
    const bodyLines = [
      "Bonjour,",
      "",
      `Nous aimerions avoir une soumission pour ces pièces suivantes :`,
      ""
    ];
    
    items.forEach(item => {
      bodyLines.push(`• ${item.NomPièce}`);
      
      selectedFields.forEach(fieldId => {
        const field = CHAMPS_DISPONIBLES.find(f => f.id === fieldId);
        if (!field || fieldId === 'NomPièce') return;
        
        let value = item[fieldId];
        if (!value || value === '' || value === 0) return;
        
        if (fieldId === 'Prix_unitaire') {
          value = `${value.toFixed(2)} $`;
        }
        
        bodyLines.push(`  ${field.label}: ${value}`);
      });
      
      bodyLines.push("");
    });
    
    if (customMessage.trim()) {
      bodyLines.push(customMessage.trim());
      bodyLines.push("");
    }
    
    bodyLines.push("Pourriez-vous nous faire parvenir prix et délais de livraison ?");
    bodyLines.push("");
    bodyLines.push("Merci,");
    bodyLines.push("Équipe Maintenance");
    
    return bodyLines.join('\n');
  };

  const openPreviewDialog = (supplierId, items) => {
    if (!fournisseurs) return;
    
    const supplier = fournisseurs.find(f => f.RéfFournisseur === supplierId);
    if (!supplier) {
      alert("Fournisseur introuvable.");
      return;
    }
    
    const contactEmails = supplier.contacts?.map(c => c.Email).filter(Boolean).join(',') || '';
    if (!contactEmails) {
      alert("Aucun email de contact trouvé pour ce fournisseur.");
      return;
    }

    const subject = `Demande de soumission`;
    const body = buildEmailBody(items, supplier);

    setPreviewDialog({
      open: true,
      supplierId,
      items,
      supplier,
      contactEmails,
      subject,
      body,
      editableFournisseur: supplierId
    });
  };

  const confirmSendEmail = async () => {
    const { editableFournisseur, subject, body, items } = previewDialog;
    
    // Récupérer le fournisseur sélectionné
    const selectedSupplier = fournisseurs.find(f => f.RéfFournisseur === editableFournisseur);
    const finalEmails = selectedSupplier?.contacts?.map(c => c.Email).filter(Boolean).join(',') || '';
    
    if (!finalEmails) {
      alert("Aucun email pour le fournisseur sélectionné.");
      return;
    }

    // Ouvrir le client email
    window.location.href = `mailto:${finalEmails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Enregistrer dans la DB
    try {
      const userData = await fetchJson(`${API_URL}/current-user`);
      
      await fetchJson(`${API_URL}/soumissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RéfFournisseur: editableFournisseur,
          EmailsDestinataires: finalEmails,
          Sujet: subject,
          MessageCorps: body,
          Pieces: items.map(i => ({
            RéfPièce: i.RéfPièce,
            NomPièce: i.NomPièce,
            NumPièce: i.NumPièce || '',
            NumPièceAutreFournisseur: i.NumPièceAutreFournisseur || '',
            DescriptionPièce: i.DescriptionPièce || '',
            Quantite: i.cartQty,
            Prix_unitaire: i.Prix_unitaire || 0
          })),
          User: userData.user || 'Système',
          Notes: ''
        })
      });
      
      console.log('✅ Soumission enregistrée');
    } catch (error) {
      console.error('❌ Erreur enregistrement soumission:', error);
    }
    
    // Retirer les items du panier
    items.forEach(item => removeFromCart(item.RéfPièce));
    
    setPreviewDialog({ open: false, data: null });
    setCustomMessage('');
  };

  return (
    <>
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
                          <p className="text-slate-500">Qté: {item.cartQty || item.Qtéàcommander || 1}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.RéfPièce)}>
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => openPreviewDialog(Number(supplierId), items)} 
                    disabled={isLoadingFournisseurs}
                  >
                    Générer email pour {supplierName}
                  </Button>
                </div>
              );
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

      {/* Dialog Aperçu & Édition */}
      <Dialog open={previewDialog.open} onOpenChange={() => setPreviewDialog({ open: false, data: null })}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aperçu de la soumission</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Sélection du fournisseur */}
            <div>
              <Label>Fournisseur destinataire</Label>
              <Select
                value={previewDialog.editableFournisseur?.toString()}
                onValueChange={(value) => {
                  const newFournisseurId = parseInt(value);
                  const newSupplier = fournisseurs?.find(f => f.RéfFournisseur === newFournisseurId);
                  const newEmails = newSupplier?.contacts?.map(c => c.Email).filter(Boolean).join(',') || '';
                  
                  setPreviewDialog(prev => ({
                    ...prev,
                    editableFournisseur: newFournisseurId,
                    supplier: newSupplier,
                    contactEmails: newEmails,
                    subject: `Demande de soumission`,
                    body: buildEmailBody(prev.items, newSupplier)
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {fournisseurs?.map(f => (
                    <SelectItem key={f.RéfFournisseur} value={f.RéfFournisseur.toString()}>
                      {f.NomFournisseur}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Emails: {previewDialog.contactEmails || 'Aucun'}
              </p>
            </div>

            {/* Sélection des champs */}
            <div>
              <Label>Champs à inclure dans l'email</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 p-3 border rounded">
                {CHAMPS_DISPONIBLES.map(field => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => {
                        toggleField(field.id);
                        // Regénérer le body
                        setPreviewDialog(prev => ({
                          ...prev,
                          body: buildEmailBody(prev.items, prev.supplier)
                        }));
                      }}
                    />
                    <Label htmlFor={field.id} className="text-sm cursor-pointer">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Message personnalisé */}
            <div>
              <Label>Message personnalisé (optionnel)</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => {
                  setCustomMessage(e.target.value);
                  setPreviewDialog(prev => ({
                    ...prev,
                    body: buildEmailBody(prev.items, prev.supplier)
                  }));
                }}
                placeholder="Ajouter une note spécifique pour ce fournisseur..."
                rows={3}
              />
            </div>

            {/* Aperçu de l'email */}
            <div>
              <Label>Aperçu de l'email</Label>
              <div className="mt-2 p-4 rounded border">
                <p className="text-sm font-semibold mb-2">Sujet: {previewDialog.subject}</p>
                <pre className="text-xs whitespace-pre-wrap font-mono">{previewDialog.body}</pre>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialog({ open: false, data: null })}>
              Annuler
            </Button>
            <Button onClick={confirmSendEmail} className="bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4 mr-2" />
              Envoyer l'email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}