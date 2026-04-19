
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit3, FileText, PackagePlus, Users, CheckCircle, XCircle, History, MailPlus, ShoppingCart } from "lucide-react";
import EreqDialog from './EreqDialog';
import { fetchJson } from '../../lib/utils';
import { toast } from '@/hooks/use-toast';
import SoumissionsHistoryDialog from '../soumissions/SoumissionsHistoryDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useSettings } from '@/contexts/SettingsContext';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';


export default function CommandeCard({ 
  order, 
  isInCart, 
  onAddToCart, 
  onViewHistory, 
  onEdit, 
  onOrder,
  onRefresh
}) {
  const [soumDem, setSoumDem] = useState(order.SoumDem === true || order.SoumDem === "true");
  const [imageError, setImageError] = useState(false);
  const imageUrl = `${API_URL}/pieces/${order.RéfPièce}/image`;
  const [showSoumissionsHistory, setShowSoumissionsHistory] = useState(false);
  const { can, isAdmin } = usePermissions();
  const { settings } = useSettings();
  const [showEreqDialog, setShowEreqDialog] = useState(false);


  useEffect(() => {
    setSoumDem(order.SoumDem === true || order.SoumDem === "true");
  }, [order.SoumDem]);
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Header avec nom et badge soumission */}
            <div className="flex items-start space-x-4 mb-4">
              <div className="w-40 h-40 flex-shrink-0 rounded overflow-hidden bg-white border">
                {!imageError ? (
                  <img src={imageUrl} alt={order.NomPièce} className="w-full h-full object-contain" onError={() => setImageError(true)} />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-300">📦</div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{order.NomPièce}</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                      {order.NumPièce && <span className="mr-2">N° {order.NumPièce}</span>}
                      {order.NumPièceAutreFournisseur && <span className="mr-2">#Fourn: {order.NumPièceAutreFournisseur}</span>}
                      {order.RTBS && <span className="mr-2">SAP: {order.RTBS}</span>}
                      {order.NoFESTO && <span>FESTO: {order.NoFESTO}</span>}
                    </div>
                  </div>

                  {/* Badge Soumission Demandée - CLIQUABLE */}
                  <div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const newValue = !soumDem;
                        try {
                          await fetchJson(`${API_URL}/pieces/${order.RéfPièce}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ SoumDem: newValue })
                          });

                          setSoumDem(newValue);
                          if (typeof onRefresh === 'function') onRefresh();
                        } catch (error) {
                          toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
                        }
                      }}
                      className="transition-all hover:scale-105"
                    >
                      {soumDem ? (
                        <Badge className="bg-green-500 text-white flex items-center gap-1 cursor-pointer hover:bg-green-600">
                          <CheckCircle className="w-3 h-3" />
                          Soumission demandée
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500 text-white flex items-center gap-1 cursor-pointer hover:bg-red-600">
                          <XCircle className="w-3 h-3" />
                          Pas de soumission
                        </Badge>
                      )}
                    </button>
                  </div>
                </div>

                {order.DescriptionPièce && (
                  <p className="text-sm text-gray-500 mt-3 dark:text-gray-200">{order.DescriptionPièce}</p>
                )}
              </div>
            </div>

            {/* Stats quantités */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-200">À commander:</span>
                <div className="font-semibold text-yellow-600 dark:text-gray-200">{order.Qtéàcommander}</div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-200">Inventaire:</span>
                <div className="font-semibold text-yellow-600 dark:text-gray-200">{order.QtéenInventaire}</div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-200">Min:</span>
                <div className="font-semibold text-yellow-600 dark:text-gray-200">{order.Qtéminimum}</div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-200">Prix unitaire:</span>
                <div className="font-semibold">
                  {order.Prix_unitaire.toLocaleString("fr-CA", { style: "currency", currency: ["CAD","USD"].includes(order.devise) ? order.devise : "CAD" })}
                </div>
              </div>
            </div>

            {/* Fournisseurs */}
            {((order.fournisseurs?.length > 0) || order.NomFabricant) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center dark:text-gray-200">
                  <Users className="h-4 w-4 mr-2" />
                  Fournisseurs
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(order.fournisseurs || []).map((f, i) => (
                    <Badge
                      key={f.RéfFournisseur ?? i}
                      variant="outline"
                      className={f.EstPrincipal ? "text-rio-red border-rio-red" : "text-blue-600 border-blue-600"}
                    >
                      {f.EstPrincipal ? "Principal" : "Secondaire"}: {f.NomFournisseur}
                    </Badge>
                  ))}
                  {order.NomFabricant && (
                    <Badge variant="outline" className="bg-indigo-600 text-white">
                      Fabricant: {order.NomFabricant}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Soumissions (numéros) */}
            {order.Soumission_LD && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center dark:text-gray-200">
                  <FileText className="h-4 w-4 mr-2" />
                  Soumissions
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-200">Soumission:</span>
                    <div className="font-medium">{order.Soumission_LD}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col space-y-2 ml-4 ">
            {/* Historique */}
            {can('historique_view') && <Button
              variant="outline"
              size="sm"
              onClick={() => onViewHistory(order)}
              title="Voir l'historique"
              className="border-blue-600"
            >
              <History className="h-4 w-4 " />
            </Button>}
            {/* Historique Soumissions */}
            {can('soumissions_view') && <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSoumissionsHistory(true)}
              title="Voir les soumissions pour cette pièce"
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <FileText className="h-4 w-4 mr-1" />
              Soumissions
            </Button>}

            {/* Ajouter au panier de soumission */}
            {can('soumissions_create') && <Button 
              onClick={() => onAddToCart(order)} 
              disabled={isInCart}
              size="sm"
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MailPlus className="w-4 h-4 mr-2" /> 
              {isInCart ? 'Dans le panier' : 'Soumission'}
            </Button>}

            {/* Passer commande */}
            {can('commandes_create') && <Button
              variant="outline"
              size="sm"
              onClick={() => onOrder(order)}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <PackagePlus className="h-4 w-4 mr-1" />
              Commander
            </Button>}

            {/* Modifier */}
            {can('inventaire_update') && <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(order)}
              className="border-blue-600"
            >
              <Edit3 className="h-4 w-4" />
            </Button>}

            {/* eReq SAP */}
            {can('commandes_create') && settings.features?.ereq_sap && <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEreqDialog(true)}
              title="Créer une demande d'achat SAP (eReq)"
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              eReq
            </Button>}
          </div>
        </div>
      </CardContent>

      {/* Dialog historique soumissions */}
      {showSoumissionsHistory && (
        <SoumissionsHistoryDialog
          piece={order}
          onClose={() => setShowSoumissionsHistory(false)}
        />
      )}

      {/* Dialog eReq */}
      {showEreqDialog && (
        <EreqDialog
          order={order}
          onClose={() => setShowEreqDialog(false)}
          onRefresh={onRefresh}
        />
      )}
    </Card>
  );
}