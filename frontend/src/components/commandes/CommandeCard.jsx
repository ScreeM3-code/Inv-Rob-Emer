
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit3, FileText, PackagePlus, Users, CheckCircle, XCircle, History, MailPlus, ShoppingCart, Loader2 } from "lucide-react";
import { fetchJson } from '../../lib/utils';
import { toast } from '@/hooks/use-toast';
import SoumissionsHistoryDialog from '../soumissions/SoumissionsHistoryDialog';

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
  const [showEreqDialog, setShowEreqDialog] = useState(false);
  const [ereqLoading, setEreqLoading] = useState(false);
  const [ereqResult, setEreqResult] = useState(null); // { prNum, rawBody }
  const [ereqForm, setEreqForm] = useState({
    glAcct: '404400',
    costCentre: '26005511',
    needByDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    qty: String(order.Qtéàcommander || order.Qtécommandée || 1),
    recipient: '',
    sap_cookies: localStorage.getItem('sap_cookies') || '',
  });

  const handleEreqSubmit = async () => {
    const vendorCode = order.fournisseur_principal?.NumSap;
    if (!vendorCode) {
      toast({ title: 'Erreur eReq', description: 'Aucun code SAP fournisseur trouvé pour cette pièce.', variant: 'destructive' });
      return;
    }

    setEreqLoading(true);
    try {
      const needByDateISO = new Date(ereqForm.needByDate).toISOString().split('.')[0]; // "2026-03-24T00:00:00"

      const payload = {
        PRNum: '', ApproverFullName: '', ApprovalText: '', HeaderNotes: '', TestRun: false,
        PRItem: [{
          PRNum: '', PRItemNum: '00001', PONum: '', POItemNum: '',
          ItemCategory: '0',
          Vendor: vendorCode,
          PRItemDesc: `${order.NumPièce || order.VendorMaterialNum || ''} ${order.NomPièce || ''}`.trim(),
          Material: '', Plant: '2605', Currency: 'CAD',
          Price: String(order.Prix_unitaire || '0'),
          Qty: parseFloat(ereqForm.qty).toFixed(2),
          UoM: 'CHA', OANum: '', LeadTime: '0', OAItemNum: '00000',
          PurchOrg: 'RT42', PurchGroup: '269', TrackingNum: '',
          AcctAssignment: 'K',
          NeedByDate: needByDateISO,
          UnloadingPt: '109',
          Recipient: ereqForm.recipient,
          RequestedBy: '', Category: '125', ScopeOfWork: '', SafetyPlan: '',
          OverallLimit: '0.00', ExpValue: '0.00', ItemText: '', ItemNote: '',
          DeliveryText: '', CatalogID: '',
          VendorMaterialNum: order.NumPièce || order.NumPièceAutreFournisseur || '',
          ManufacturerNum: '', ManufacturerPartNum: '',
          DistributionIndicator: '1',
          MissingReptId: '', PrMismatchId: '', ServiceOnsite: false, Blkcode: '000',
          EngagementType: '', Equipment: '', MaterialAllowed: '', MaterialValue: '0.00',
          SubconWork: '', OffsiteWork: '', Overtime: '',
          ReferenceAddressNumber: '', RefCustomerforAddress: '', RefVendorforAddress: '',
          ManualAddressNumber: '',
          PRItemDeliveryAddress: null,
          PRAccount: [{
            PRNum: '',
            PRItemNum: '00001',
            AcctSerialNum: '',
            DistributionPercent: '0.00',
            GLAcct: ereqForm.glAcct,
            CostCentre: ereqForm.costCentre,
            WorkOrder: '',
            Network: '',
            ActivityNum: '',
            WBS: '',
            Qty: '0.00',
          }],
          PRMaterialData: [],
          MissingReptId: '', PrMismatchId: '', ServiceOnsite: false, Blkcode: '000',
          EngagementType: '', Equipment: '', MaterialAllowed: '', MaterialValue: '0.00',
          SubconWork: '', OffsiteWork: '', Overtime: '',
          ReferenceAddressNumber: '', RefCustomerforAddress: '', RefVendorforAddress: '',
          ManualAddressNumber: '',
          PRItemDeliveryAddress: {
            AddressNumber: '2406137', FormOfAddress: '', Name: 'Centre Recherche et Developpement Arvida',
            Name2: 'Rio Tinto Alcan', Name3: '', Name4: '', COName: '',
            City: 'Jonquiere', District: '', CityNo: '', PostalCode1: 'G7S 4K8',
            PostalCode2: '', PostalCode3: '', PoBox: '', PoBoxCity: '', DelivDis: '',
            Street: 'Boul Mellon', StreetNo: '', StrAbbr: '', HouseNo: '1955',
            StrSuppl1: '', StrSuppl2: '', Location: '', Building: '110',
            Floor: '', RoomNo: '', Country: 'CA', Langu: 'FR', Region: 'QC',
            SearchTerm1: 'CRDA', SearchTerm2: 'ALUM', TimeZone: 'EST',
            Taxjurcode: 'CAQC', AdrNotes: '', CommType: '',
            Telephone: '418 699-6585', TelExtension: '2399',
            FaxNumber: '418 699-2550', FaxExtension: '', StreetLng: 'Boul Mellon',
            DistrctNo: '', Chckstatus: '', PboxcitNo: '', Transpzone: '',
            HouseNo2: '', EMail: '', StrSuppl3: '', Title: '',
            Countryiso: 'CA', LanguIso: 'FR', BuildLong: '110', Regiogroup: '',
          },
          ProcPolicyNotes: '',
        }],
        PRAttachment: [],
      };

      // Sauvegarder les cookies pour la prochaine fois
      if (ereqForm.sap_cookies) {
        localStorage.setItem('sap_cookies', ereqForm.sap_cookies);
      }

      const proxyResp = await fetch(`${API_URL}/ereq/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          body_json: JSON.stringify(payload),
          sap_cookies: ereqForm.sap_cookies,
        }),
      });

      if (!proxyResp.ok) throw new Error(`Erreur serveur: ${proxyResp.status}`);

      const result = await proxyResp.json();
      const prMatch = result.body?.match(/"PRNum":"(\d+)"/);
      const prNum = prMatch ? prMatch[1] : null;
      const approvalMatch = result.body?.match(/"ApprovalText":"([^"]+)"/);
      const approvalText = approvalMatch ? approvalMatch[1] : '';

      setShowEreqDialog(false);
      setEreqResult({ 
        prNum, 
        approvalText,
        rawBody: result.body,
        status: result.status 
      });
    } catch (err) {
      console.error('Erreur eReq:', err);
      toast({ title: 'Erreur eReq', description: err.message, variant: 'destructive' });
    } finally {
      setEreqLoading(false);
    }
  };

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
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center dark:text-gray-200">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewHistory(order)}
              title="Voir l'historique"
              className="border-blue-600"
            >
              <History className="h-4 w-4 " />
            </Button>
            {/* Historique Soumissions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSoumissionsHistory(true)}
              title="Voir les soumissions pour cette pièce"
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <FileText className="h-4 w-4 mr-1" />
              Soumissions
            </Button>

            {/* Ajouter au panier de soumission */}
            <Button 
              onClick={() => onAddToCart(order)} 
              disabled={isInCart}
              size="sm"
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MailPlus className="w-4 h-4 mr-2" /> 
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
              className="border-blue-600"
            >
              <Edit3 className="h-4 w-4" />
            </Button>

            {/* eReq SAP */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEreqDialog(true)}
              title="Créer une demande d'achat SAP (eReq)"
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              eReq
            </Button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-1">Créer une demande eReq (SAP)</h2>
            <p className="text-sm text-gray-500 mb-4">{order.NomPièce} — {order.NumPièce}</p>

            {/* Aperçu */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 text-sm mb-4 space-y-1">
              <div><span className="text-gray-500">Fournisseur SAP:</span> <span className="font-mono font-semibold">{order.fournisseur_principal?.NumSap || <span className="text-red-500">⚠️ Manquant</span>}</span></div>
              <div><span className="text-gray-500">Fournisseur:</span> {order.fournisseur_principal?.NomFournisseur || '—'}</div>
              <div><span className="text-gray-500">Prix unitaire:</span> {order.Prix_unitaire?.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Quantité</label>
                <input type="number" min="1" value={ereqForm.qty}
                  onChange={e => setEreqForm(f => ({ ...f, qty: e.target.value }))}
                  className="w-full mt-1 border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="text-sm font-medium">Date requise</label>
                <input type="date" value={ereqForm.needByDate}
                  onChange={e => setEreqForm(f => ({ ...f, needByDate: e.target.value }))}
                  className="w-full mt-1 border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="text-sm font-medium">Destinataire (Recipient)</label>
                <input type="text" value={ereqForm.recipient} placeholder="ex: Simon DC"
                  onChange={e => setEreqForm(f => ({ ...f, recipient: e.target.value }))}
                  className="w-full mt-1 border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">GL Account</label>
                  <input type="text" value={ereqForm.glAcct}
                    onChange={e => setEreqForm(f => ({ ...f, glAcct: e.target.value }))}
                    className="w-full mt-1 border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                  <label className="text-sm font-medium">Centre de coût</label>
                  <input type="text" value={ereqForm.costCentre}
                    onChange={e => setEreqForm(f => ({ ...f, costCentre: e.target.value }))}
                    className="w-full mt-1 border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" />
                </div>
              </div>
            </div>

            <details className="mt-4">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                🔑 Session SAP (cookies)
              </summary>
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">
                  Ouvrir eReq → F12 → Application → Cookies → <code>fip.remote.riotinto.com</code> → copier les 4 cookies sous format <code>nom=valeur; nom=valeur</code>
                </p>
                <textarea
                  rows={3}
                  value={ereqForm.sap_cookies}
                  onChange={e => setEreqForm(f => ({ ...f, sap_cookies: e.target.value }))}
                  placeholder="SAP_SESSIONID_FIP_500=...; sap-usercontext=...; ..."
                  className="w-full mt-1 border rounded px-3 py-2 text-xs font-mono dark:bg-gray-700 dark:border-gray-600"
                />
                {ereqForm.sap_cookies && (
                  <p className="text-xs text-green-500 mt-1">✓ Cookies sauvegardés localement</p>
                )}
              </div>
            </details>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowEreqDialog(false)} disabled={ereqLoading}>
                Annuler
              </Button>
              <Button
                onClick={handleEreqSubmit}
                disabled={ereqLoading || !order.fournisseur_principal?.NumSap}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {ereqLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi...</> : <><ShoppingCart className="h-4 w-4 mr-2" /> Envoyer à SAP</>}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Dialog résultat eReq */}
      {ereqResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
            {ereqResult.prNum ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 rounded-full p-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-green-700">Demande d'achat créée!</h2>
                    <p className="text-sm text-gray-500">SAP HTTP {ereqResult.status}</p>
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4 text-center">
                  <p className="text-sm text-gray-500 mb-1">Numéro de Demande d'Achat</p>
                  <p className="text-3xl font-bold font-mono text-green-700">{ereqResult.prNum}</p>
                </div>
                {ereqResult.approvalText && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 italic">"{ereqResult.approvalText}"</p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-yellow-100 rounded-full p-2">
                    <Loader2 className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-yellow-700">Réponse SAP reçue</h2>
                    <p className="text-sm text-gray-500">HTTP {ereqResult.status} — aucun PR# trouvé</p>
                  </div>
                </div>
              </>
            )}

            <details className="mb-4">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                Réponse brute SAP
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap break-all">
                {ereqResult.rawBody}
              </pre>
            </details>

            <div className="flex justify-end">
              <Button onClick={() => setEreqResult(null)} className="bg-blue-600 hover:bg-blue-700 text-white">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}