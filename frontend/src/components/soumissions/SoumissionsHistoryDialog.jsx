import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchJson } from '../../lib/utils';
import SoumissionDetailDialog from './SoumissionDetailDialog';
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Edit } from "lucide-react";
const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

export default function SoumissionsHistoryDialog({ piece, onClose }) {
  const [soumissions, setSoumissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSoumission, setSelectedSoumission] = useState(null);
  const [daNumbers, setDaNumbers] = useState([]); // { da, date, user }

  useEffect(() => {
    loadSoumissions();
    loadDaNumbers();
  }, [piece]);

  const loadDaNumbers = async () => {
    try {
      const historique = await fetchJson(`${API_URL}/historique/${piece.RéfPièce}`);
      const das = (historique || [])
        .filter(h => h.description && /DA SAP[:\s#]+(\d+)/i.test(h.description))
        .map(h => {
          const match = h.description.match(/DA SAP[:\s#]+(\d+)/i);
          return { da: match?.[1], date: h.DateCMD || h.DateRecu, user: h.User };
        })
        .filter(x => x.da);
      setDaNumbers(das);
    } catch (e) {
      setDaNumbers([]);
    }
  };

  const loadSoumissions = async () => {
    try {
      setLoading(true);
      // Charger toutes les soumissions
      const allSoumissions = await fetchJson(`${API_URL}/soumissions`);
      
      // Filtrer celles qui contiennent cette pièce
      const filtered = allSoumissions.filter(soum => 
        soum.Pieces?.some(p => p.RéfPièce === piece.RéfPièce)
      );
      
      setSoumissions(filtered);
    } catch (error) {
      console.error('Erreur chargement soumissions:', error);
      setSoumissions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatutBadge = (statut) => {
    switch (statut) {
      case 'Envoyée':
        return <Badge className="bg-blue-500 text-white">📤 Envoyée</Badge>;
      case 'Prix reçu':
        return <Badge className="bg-green-500 text-white">💰 Prix reçu</Badge>;
      case 'Commandée':
        return <Badge className="bg-purple-500 text-white">✅ Commandée</Badge>;
      case 'Annulée':
        return <Badge className="bg-red-500 text-white">❌ Annulée</Badge>;
      default:
        return <Badge className="bg-blue-500 text-white">📤 Envoyée</Badge>;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historique des soumissions - {piece.NomPièce}</DialogTitle>
        </DialogHeader>
        {/* Bloc DA SAP */}
        {daNumbers.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-2">
            <p className="text-xs font-semibold text-orange-700 mb-1 uppercase tracking-wide">
              🏷️ DA SAP associées à cette pièce
            </p>
            <div className="flex flex-wrap gap-2">
              {daNumbers.map((item, i) => (
                <span key={i} className="inline-flex items-center bg-orange-100 border border-orange-300 text-orange-800 text-sm font-mono px-2 py-1 rounded">
                  <strong>#{item.da}</strong>
                  <span className="ml-2 text-xs text-orange-500">
                    {item.date ? new Date(item.date).toLocaleDateString('fr-CA') : ''} — {item.user}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="py-4">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : soumissions.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p>Aucune soumission trouvée pour cette pièce</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>Date envoi</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Nb pièces</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead className="text-right">Actions</TableHead> {/* ← AJOUT */}
                </TableRow>
            </TableHeader>
            <TableBody>
            {soumissions.map((soum) => (
                <TableRow key={soum.RefSoumission}>
                <TableCell className="font-medium">
                    {formatDate(soum.DateEnvoi)}
                </TableCell>
                <TableCell>
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                    {soum.fournisseur_nom}
                    </Badge>
                </TableCell>
                <TableCell>
                    {getStatutBadge(soum.Statut)}
                </TableCell>
                <TableCell>
                    <Badge>{soum.Pieces?.length || 0} pièce(s)</Badge>
                </TableCell>
                <TableCell>{soum.User}</TableCell>
                
                {/* ← NOUVELLE COLONNE */}
                <TableCell className="text-right">
                    <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedSoumission(soum)}
                    >
                    <Edit className="w-4 h-4 mr-2" />
                    Afficher
                    </Button>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
      {/* Dialog de gestion (nested) */}
      {selectedSoumission && (
        <SoumissionDetailDialog
          soumission={selectedSoumission}
          onClose={() => {
            setSelectedSoumission(null);
            loadSoumissions(); // Recharger après modification
          }}
          onUpdate={() => {
            loadSoumissions(); // Recharger la liste
          }}
        />
      )}
    </Dialog>
  );
}