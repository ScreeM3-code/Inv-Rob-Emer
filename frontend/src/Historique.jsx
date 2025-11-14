import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Button } from './components/ui/button';
import { History, Search, Filter, Download, Loader2 } from 'lucide-react';
import { fetchJson, log } from './lib/utils';
import AnimatedBackground from "@/components/ui/AnimatedBackground";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Hook personnalisé pour lazy loading par scroll
function useInfiniteScroll(items, itemsPerPage = 50) {
  const [displayCount, setDisplayCount] = useState(itemsPerPage);
  // We'll use a callback ref setter so we can observe the loader element when it mounts
  const [loaderEl, setLoaderEl] = useState(null);

  useEffect(() => {
    // Reset display count when the total number of items changes
    setDisplayCount(itemsPerPage);
  }, [items.length, itemsPerPage]);

  useEffect(() => {
    if (!loaderEl) return;
    if (displayCount >= items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setDisplayCount((prev) => Math.min(prev + itemsPerPage, items.length));
          }
        });
      },
      { root: null, rootMargin: '300px', threshold: 0.1 }
    );

    observer.observe(loaderEl);
    return () => observer.disconnect();
  }, [loaderEl, items.length, itemsPerPage, displayCount]);

  const displayedItems = items.slice(0, displayCount);
  const hasMore = displayCount < items.length;

  // We return the callback setter as the ref to attach to the loader element
  return { displayedItems, loaderRef: setLoaderEl, hasMore };
}

function Historique() {
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    operation: 'tous',
    user: 'tous'
  });

    const filteredHistorique = historique.filter(item => {
    const searchMatch = filters.search === '' || 
      item.nompiece?.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.numpiece?.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.description?.toLowerCase().includes(filters.search.toLowerCase());
    
    // Combiner 'Sortie' et 'Sortie rapide' sous la même option 'Sortie'
    const operationMatch =
      filters.operation === 'tous' ||
      (filters.operation === 'Sortie' && (item.Opération === 'Sortie' || item.Opération === 'Sortie rapide')) ||
      item.Opération === filters.operation;

    const userMatch = filters.user === 'tous' || (item.User || 'Système') === filters.user;
    
    
    return searchMatch && operationMatch && userMatch;
  });

  const { displayedItems, loaderRef, hasMore } = useInfiniteScroll(filteredHistorique, 50);

  useEffect(() => {
    loadHistorique();
  }, []);

  const loadHistorique = async () => {
    try {
      setLoading(true);
      const data = await fetchJson(`${API}/historique`);
      setHistorique(data || []);
    } catch (error) {
      log("Erreur chargement historique:", error);
      // TODO: Add error state and UI feedback
      setHistorique([]);
    } finally {
      setLoading(false);
    }
  };



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
        day: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDelai = (delaiJours) => {
    if (!delaiJours || delaiJours === 0) return 'N/A';
    
    const jours = Math.floor(delaiJours);
    
    // Si moins de 31 jours, afficher en jours
    if (jours < 31) {
      return `${jours} jour${jours > 1 ? 's' : ''}`;
    }
    
    // Si moins de 365 jours, afficher en mois et jours
    if (jours < 365) {
      const mois = Math.floor(jours / 30);
      const joursRestants = jours % 30;
      
      if (joursRestants === 0) {
        return `${mois} mois`;
      }
      return `${mois} mois ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`;
    }
    
    // Si plus d'un an, afficher en années, mois et jours
    const annees = Math.floor(jours / 365);
    const joursRestants = jours % 365;
    const mois = Math.floor(joursRestants / 30);
    const joursFinaux = joursRestants % 30;
    
    let result = `${annees} an${annees > 1 ? 's' : ''}`;
    if (mois > 0) result += ` ${mois} mois`;
    if (joursFinaux > 0) result += ` ${joursFinaux} jour${joursFinaux > 1 ? 's' : ''}`;
    
    return result;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground /> 
        <div className="text-xl text-gray-600">Chargement de l'historique...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AnimatedBackground /> 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <History className="h-8 w-8 text-rio-red" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historique des Mouvements</h1>
              <p className="text-sm text-gray-600 dark:text-white">Traçabilité complète des opérations d'inventaire</p>
            </div>
          </div>
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
            <div className="grid grid-cols-3 gap-4">
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
                    <SelectItem value="Sortie">Sortie (inclut "Sortie rapide")</SelectItem>
                    <SelectItem value="Commande">Commande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Utilisateur</label>
                <Select value={filters.user} onValueChange={(value) => setFilters({...filters, user: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les utilisateurs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les utilisateurs</SelectItem>
                    {Array.from(new Set(historique.map(h => h.User || 'Système'))).sort().map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <TableHead className="w-20">Date</TableHead>
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
                    displayedItems.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell className="font-medium whitespace-nowrap w-20">
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
                        <TableCell className="font-medium whitespace-nowrap w-20">
                          {formatDelai(item.Delais)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Trigger pour charger plus d'entrées */}
            {hasMore && (
              <div className="flex justify-center py-4" ref={loaderRef}>
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">
                  Affichage de {displayedItems.length}/{filteredHistorique.length} entrées...
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Historique;
