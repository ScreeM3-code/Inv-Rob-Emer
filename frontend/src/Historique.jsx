import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Button } from './components/ui/button';
import { History, Search, Filter, Download } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Historique() {
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    operation: 'tous',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    loadHistorique();
  }, []);

  const loadHistorique = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/historique`);
      setHistorique(response.data || []);
    } catch (error) {
      console.error("Erreur chargement historique:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistorique = historique.filter(item => {
    const searchMatch = filters.search === '' || 
      item.nompiece?.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.numpiece?.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.description?.toLowerCase().includes(filters.search.toLowerCase());
    
    const operationMatch = filters.operation === 'tous' || item.Opération === filters.operation;
    
    const dateMatch = true; // TODO: Implémenter le filtrage par date si nécessaire
    
    return searchMatch && operationMatch && dateMatch;
  });

  const getOperationBadge = (operation) => {
    switch (operation) {
      case 'Achat':
        return <Badge className="bg-green-500 text-white">Achat</Badge>;
      case 'Sortie':
        return <Badge className="bg-blue-500 text-white">Sortie</Badge>;
      case 'Sortie rapide':
        return <Badge className="bg-orange-500 text-white">Sortie rapide</Badge>;
      case 'Commande':
        return <Badge className="bg-purple-500 text-white">Commande</Badge>;
      default:
        return <Badge variant="outline">{operation}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const exportHistorique = () => {
    const csvContent = [
      ['Date', 'Opération', 'Pièce', 'N° Pièce', 'Description', 'Quantité', 'Utilisateur', 'Délai'],
      ...filteredHistorique.map(item => [
        formatDate(item.DateCMD || item.DateRecu),
        item.Opération || '',
        item.nompiece || '',
        item.numpiece || '',
        item.description || '',
        item.qtécommande || item.QtéSortie || '',
        item.User || '',
        item.Delais || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historique_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Chargement de l'historique...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <History className="h-8 w-8 text-rio-red" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Historique des Mouvements</h1>
              <p className="text-sm text-gray-600">Traçabilité complète des opérations d'inventaire</p>
            </div>
          </div>
          
          <Button onClick={exportHistorique} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Recherche</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Pièce, N°, description..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Opération</label>
                <Select value={filters.operation} onValueChange={(value) => setFilters({...filters, operation: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les opérations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes les opérations</SelectItem>
                    <SelectItem value="Achat">Achat</SelectItem>
                    <SelectItem value="Sortie">Sortie</SelectItem>
                    <SelectItem value="Sortie rapide">Sortie rapide</SelectItem>
                    <SelectItem value="Commande">Commande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Date de début</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Date de fin</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tableau historique */}
        <Card>
          <CardHeader>
            <CardTitle>
              Mouvements ({filteredHistorique.length} entrées)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Opération</TableHead>
                    <TableHead>Pièce</TableHead>
                    <TableHead>N° Pièce</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Délai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistorique.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Aucun mouvement trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistorique.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {formatDate(item.DateCMD || item.DateRecu)}
                        </TableCell>
                        <TableCell>
                          {getOperationBadge(item.Opération)}
                        </TableCell>
                        <TableCell>{item.nompiece || 'N/A'}</TableCell>
                        <TableCell>{item.numpiece || 'N/A'}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.description || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {item.qtécommande || item.QtéSortie || 'N/A'}
                        </TableCell>
                        <TableCell>{item.User || 'Système'}</TableCell>
                        <TableCell>
                          {item.Delais ? `${item.Delais} jours` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Historique;
