import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from '@/hooks/use-toast';

const API = import.meta.env.VITE_BACKEND_URL + '/api';

export default function ImageSelector({ pieceId, pieceName, onClose, onImageSaved }) {
  const [loading, setLoading] = useState(true);
  const [hasImage, setHasImage] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCandidates();
  }, [pieceId]);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/pieces/${pieceId}/search-candidates`);
      const data = await response.json();
      
      setHasImage(data.has_image);
      setCandidates(data.candidates || []);
      setSearchTerm(data.search_term || '');
      setCurrentIndex(0);
    } catch (error) {
      console.error('Erreur chargement candidats:', error);
    } finally {
      setLoading(false);
    }
  };

    const handleAccept = async () => {
        if (!candidates[currentIndex]) return;
        
        try {
            setSaving(true);
            const response = await fetch(
            `${API}/pieces/${pieceId}/save-image-from-url`,  // ✅ Retiré le query param
            { 
                method: 'POST',
                headers: {
                'Content-Type': 'application/json'  // ✅ Ajouté
                },
                body: JSON.stringify({  // ✅ Envoi en body
                image_url: candidates[currentIndex].url
                })
            }
            );
            
            if (response.ok) {
            onImageSaved?.();
            onClose();
            } else {
            const error = await response.json();
            console.error('Erreur API:', error);
            toast({ title: 'Erreur', description: error.detail || 'Erreur lors de la sauvegarde de l\'image', variant: 'destructive' });
            }
        } catch (error) {
              console.error('Erreur sauvegarde:', error);
              toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
        };

  const handleReject = () => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Plus de candidats
      onClose();
    }
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3">Recherche d'images...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (hasImage) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Image déjà présente</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <p className="text-center text-gray-600">
              Cette pièce possède déjà une image.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (candidates.length === 0) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aucune image trouvée automatiquement</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-center text-gray-600 mb-4">
              Le quota API Google est peut-être dépassé (100/jour).
              <br />
              Essayez l'upload manuel ou ouvrez Google Images.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={onClose} variant="outline">Fermer</Button>
            <Button 
              onClick={() => window.open(`https://www.google.com/search?q=${pieceName.replace(' ', '+')}&tbm=isch`, '_blank')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Ouvrir Google Images
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const currentCandidate = candidates[currentIndex];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Sélection d'image pour {pieceName}</span>
            <Badge variant="outline">
              Image {currentIndex + 1} / {candidates.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Recherche : <span className="font-mono font-semibold">{searchTerm}</span>
          </div>

          {/* Image preview */}
          <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: '400px' }}>
            <img
              src={currentCandidate.url}
              alt={currentCandidate.title}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.src = currentCandidate.thumbnail;
              }}
            />
          </div>

          {/* Image info */}
          <div className="text-sm text-gray-600">
            <p className="font-medium">{currentCandidate.title}</p>
            <p className="text-xs text-gray-500">Source : {currentCandidate.source}</p>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            {candidates.length - currentIndex - 1} image(s) restante(s)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={saving}
            >
              <X className="w-4 h-4 mr-2" />
              Non, suivante
            </Button>
            <Button
              onClick={handleAccept}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Oui, sauvegarder
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}