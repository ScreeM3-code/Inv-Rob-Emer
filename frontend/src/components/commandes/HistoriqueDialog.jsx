import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const getOperationBadge = (operation) => {
    const op = operation?.toLowerCase() || '';
    if (op.includes('entrée') || op.includes('reception') || op.includes('création') || op.includes('creation')) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 capitalize">{operation}</Badge>;
    }
    if (op.includes('sortie')) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 capitalize">{operation}</Badge>;
    }
    if (op.includes('ajustement')) {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 capitalize">{operation}</Badge>;
    }
    return <Badge className="capitalize">{operation}</Badge>;
};

export default function HistoriqueDialog({ piece, history, isLoading, onOpenChange }) {
  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Historique pour : {piece.NomPièce}</DialogTitle>
          <DialogDescription>Réf: {piece.NumPièce}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : history.length === 0 ? (
            <p className="text-center py-10 text-slate-500">Aucun historique trouvé pour cette pièce.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Opération</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((m) => {
                  // Déterminer la quantité et sa couleur
                  const quantite = m.qtécommande && m.qtécommande !== "0" 
                    ? `+${m.qtécommande}` 
                    : m.QtéSortie && m.QtéSortie !== "0"
                    ? `-${m.QtéSortie}`
                    : '-';
                  
                  const quantiteColor = m.qtécommande && m.qtécommande !== "0"
                    ? "text-green-600"
                    : m.QtéSortie && m.QtéSortie !== "0"
                    ? "text-red-600"
                    : "text-slate-400";

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {m.DateRecu ? format(new Date(m.DateRecu), 'd MMM yyyy, HH:mm', { locale: fr }) : (m.DateCMD ? format(new Date(m.DateCMD), 'd MMM yyyy, HH:mm', { locale: fr }) : 'N/A')}
                      </TableCell>
                      <TableCell>{getOperationBadge(m.Opération)}</TableCell>
                      <TableCell className={`text-right font-bold ${quantiteColor}`}>
                        {quantite}
                      </TableCell>
                      <TableCell>{m.User}</TableCell>
                      <TableCell className="text-sm">{m.description}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}