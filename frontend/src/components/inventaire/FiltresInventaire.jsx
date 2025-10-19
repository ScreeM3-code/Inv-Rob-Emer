import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

export function FiltresInventaire({ filters, onFiltersChange }) {
  const handleFilterChange = (field, value) => {
    onFiltersChange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-500" />
        <span className="text-sm text-slate-600 font-medium">Filtres:</span>
      </div>
      
      <Select value={filters.categorie} onValueChange={(value) => handleFilterChange('categorie', value)}>
        <SelectTrigger className="w-40 bg-white/50">
          <SelectValue placeholder="Catégorie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Toutes catégories</SelectItem>
          <SelectItem value="mecanique">Mécanique</SelectItem>
          <SelectItem value="electrique">Électrique</SelectItem>
          <SelectItem value="hydraulique">Hydraulique</SelectItem>
          <SelectItem value="pneumatique">Pneumatique</SelectItem>
          <SelectItem value="electronique">Électronique</SelectItem>
          <SelectItem value="consommable">Consommable</SelectItem>
          <SelectItem value="autre">Autre</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.statut} onValueChange={(value) => handleFilterChange('statut', value)}>
        <SelectTrigger className="w-32 bg-white/50">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Tous statuts</SelectItem>
          <SelectItem value="actif">Actif</SelectItem>
          <SelectItem value="obsolete">Obsolète</SelectItem>
          <SelectItem value="discontinue">Discontinué</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.alerte} onValueChange={(value) => handleFilterChange('alerte', value)}>
        <SelectTrigger className="w-36 bg-white/50">
          <SelectValue placeholder="Stock" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Tous stocks</SelectItem>
          <SelectItem value="faible">Stock faible</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}