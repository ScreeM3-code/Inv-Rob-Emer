import React, { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Mail, Send, Plus, Trash2 } from 'lucide-react';

function EmailSoumission({ pieces, fournisseurs }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPieces, setSelectedPieces] = useState([]);
  const [emailData, setEmailData] = useState({
    destinataire: '',
    sujet: 'Demande de soumission - Pièces d\'inventaire',
    message: '',
    fournisseur: ''
  });

  const addPieceToEmail = (piece) => {
    if (!selectedPieces.find(p => p.RéfPièce === piece.RéfPièce)) {
      setSelectedPieces([...selectedPieces, piece]);
    }
  };

  const removePieceFromEmail = (pieceId) => {
    setSelectedPieces(selectedPieces.filter(p => p.RéfPièce !== pieceId));
  };

  const generateEmailContent = () => {
    const piecesList = selectedPieces.map(piece => 
      `- ${piece.NomPièce} (N°: ${piece.NumPièce}) - Quantité demandée: ${piece.Qtéàcommander || 1}`
    ).join('\n');

    const defaultMessage = `Bonjour,

Nous souhaitons recevoir une soumission pour les pièces suivantes :

${piecesList}

Pourriez-vous nous faire parvenir vos meilleurs prix et délais de livraison ?

Cordialement,
Équipe Maintenance`;

    setEmailData(prev => ({
      ...prev,
      message: defaultMessage
    }));
  };

  const handleSendEmail = () => {
    if (!emailData.destinataire || !emailData.message) {
      toast({ title: 'Champs manquants', description: 'Veuillez remplir tous les champs obligatoires', variant: 'destructive' });
      return;
    }

    // Créer le lien mailto avec le contenu
    const subject = encodeURIComponent(emailData.sujet);
    const body = encodeURIComponent(emailData.message);
    const mailtoLink = `mailto:${emailData.destinataire}?subject=${subject}&body=${body}`;
    
    // Ouvrir le client email
    window.open(mailtoLink);
    
    // Fermer le dialog
    setIsDialogOpen(false);
    
    // Réinitialiser
    setSelectedPieces([]);
    setEmailData({
      destinataire: '',
      sujet: 'Demande de soumission - Pièces d\'inventaire',
      message: '',
      fournisseur: ''
    });
  };

  const piecesACommander = pieces.filter(piece => piece.Qtéàcommander > 0);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Mail className="h-4 w-4 mr-2" />
          Demande de soumission
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Demande de soumission par email</DialogTitle>
          <DialogDescription>
            Sélectionnez les pièces et envoyez une demande de soumission par email
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Sélection des pièces */}
          <div>
            <Label className="text-base font-semibold">Pièces à commander</Label>
            <div className="mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
              {piecesACommander.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune pièce à commander</p>
              ) : (
                piecesACommander.map(piece => (
                  <div key={piece.RéfPièce} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex-1">
                      <span className="font-medium">{piece.NomPièce}</span>
                      <span className="text-sm text-gray-500 ml-2">(N°: {piece.NumPièce})</span>
                      <span className="text-sm text-orange-600 ml-2">Qté: {piece.Qtéàcommander}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addPieceToEmail(piece)}
                      disabled={selectedPieces.find(p => p.RéfPièce === piece.RéfPièce)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pièces sélectionnées */}
          {selectedPieces.length > 0 && (
            <div>
              <Label className="text-base font-semibold">Pièces sélectionnées ({selectedPieces.length})</Label>
              <div className="mt-2 space-y-2">
                {selectedPieces.map(piece => (
                  <div key={piece.RéfPièce} className="flex items-center justify-between p-2 bg-blue-50 rounded border">
                    <div>
                      <span className="font-medium">{piece.NomPièce}</span>
                      <span className="text-sm text-gray-500 ml-2">(N°: {piece.NumPièce})</span>
                      <span className="text-sm text-orange-600 ml-2">Qté: {piece.Qtéàcommander}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removePieceFromEmail(piece.RéfPièce)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulaire email */}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="destinataire">Email destinataire *</Label>
                <Input
                  id="destinataire"
                  type="email"
                  value={emailData.destinataire}
                  onChange={(e) => setEmailData({...emailData, destinataire: e.target.value})}
                  placeholder="fournisseur@example.com"
                />
              </div>
              <div>
                <Label htmlFor="fournisseur">Fournisseur</Label>
                <Select value={emailData.fournisseur} onValueChange={(value) => setEmailData({...emailData, fournisseur: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {fournisseurs.map((f) => (
                      <SelectItem key={f.RéfFournisseur} value={f.NomFournisseur}>
                        {f.NomFournisseur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="sujet">Sujet</Label>
              <Input
                id="sujet"
                value={emailData.sujet}
                onChange={(e) => setEmailData({...emailData, sujet: e.target.value})}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="message">Message</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateEmailContent}
                  disabled={selectedPieces.length === 0}
                >
                  Générer automatiquement
                </Button>
              </div>
              <Textarea
                id="message"
                rows={8}
                value={emailData.message}
                onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                placeholder="Votre message de demande de soumission..."
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSendEmail}
            disabled={!emailData.destinataire || !emailData.message || selectedPieces.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Envoyer l'email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EmailSoumission;
