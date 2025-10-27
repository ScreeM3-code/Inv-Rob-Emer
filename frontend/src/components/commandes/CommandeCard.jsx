
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit3, FileText, PackagePlus, ShoppingCart, Users, CheckCircle, XCircle, History } from "lucide-react";

export default function CommandeCard({ 
  order, 
  isInCart, 
  onAddToCart, 
  onViewHistory, 
  onEdit, 
  onOrder 
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Header avec nom et badge soumission */}
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {order.NomPièce}
                  {/* Badge Soumission Demandée */}
                  {order.SoumDem === true || order.SoumDem === "true" ? (
                    <Badge className="bg-green-500 text-white flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Soumission demandée
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500 text-white flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Pas de soumission
                    </Badge>
                  )}
                </h3>
                <p className="text-sm text-gray-600">
                  N° {order.NumPièce} • N° Fabricant: {order.NumPièceAutreFournisseur}
                </p>
                {order.DescriptionPièce && (
                  <p className="text-sm text-gray-500 mt-1">{order.DescriptionPièce}</p>
                )}
              </div>
            </div>

            {/* Stats quantités */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-500">À commander:</span>
                <div className="font-semibold text-yellow-600">{order.Qtéàcommander}</div>
              </div>
              <div>
                <span className="text-gray-500">Inventaire:</span>
                <div className="font-semibold text-yellow-600">{order.QtéenInventaire}</div>
              </div>
              <div>
                <span className="text-gray-500">Min:</span>
                <div className="font-semibold text-yellow-600">{order.Qtéminimum}</div>
              </div>
              <div>
                <span className="text-gray-500">Prix unitaire:</span>
                <div className="font-semibold">
                  {order.Prix_unitaire.toLocaleString("fr-CA", {
                    style: "currency",
                    currency: "CAD",
                  })}
                </div>
              </div>
            </div>

            {/* Fournisseurs */}
            {(order.fournisseur_principal || order.autre_fournisseur || order.NomFabricant) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Fournisseurs
                </h4>
                <div className="flex flex-wrap gap-2">
                  {order.fournisseur_principal && (
                    <Badge variant="outline" className="text-rio-red border-rio-red">
                      Principal: {order.fournisseur_principal.NomFournisseur}
                    </Badge>
                  )}
                  {order.autre_fournisseur && (
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      Autre: {order.autre_fournisseur.NomFournisseur}
                    </Badge>
                  )}
                  {order.NomFabricant && (
                    <Badge variant="outline" className="bg-indigo-600 text-white">
                      Fabricant: {order.NomFabricant}
                    </Badge>
                  )}
                </div>
                {order.NumPièceAutreFournisseur && (
                  <p className="text-xs text-gray-500 mt-1">
                    N° autre fournisseur: {order.NumPièceAutreFournisseur}
                  </p>
                )}
              </div>
            )}

            {/* Soumissions (numéros) */}
            {order.Soumission_LD && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Soumissions
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Soumission LD:</span>
                    <div className="font-medium">{order.Soumission_LD}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col space-y-2 ml-4">
            {/* Historique */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewHistory(order)}
              title="Voir l'historique"
            >
              <History t className="h-4 w-4" />
            </Button>

            {/* Ajouter au panier de soumission */}
            <Button 
              onClick={() => onAddToCart(order)} 
              disabled={isInCart}
              size="sm"
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4 mr-2" /> 
              {isInCart ? 'Dans le panier' : 'Soumission'}
            </Button>

            {/* Passer commande */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOrder(order)}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <PackagePlus className="h-4 w-4 mr-1" />
              Commander
            </Button>

            {/* Modifier */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(order)}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}