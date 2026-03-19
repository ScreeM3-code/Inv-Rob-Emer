import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle, ShoppingCart, Loader2 } from "lucide-react";
import { toast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

export default function EreqDialog({ order, onClose, onRefresh }) {
  const [ereqLoading, setEreqLoading] = useState(false);
  const [ereqResult, setEreqResult] = useState(null);
  const [ereqForm, setEreqForm] = useState({
    glAcct: '404400',
    costCentre: '26005511',
    needByDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    qty: String(order.Qtéàcommander || order.Qtécommandée || 1),
    price: String(order.Prix_unitaire || '0'),
    recipient: '',
    refSoumission: '',
    pdfFile: null,
    pdfName: '',
    sap_session_id: localStorage.getItem('sap_session_id') || '',
  });

  const handleEreqSubmit = async () => {
    const vendorCode = order.fournisseur_principal?.NumSap;
    if (!vendorCode) {
      toast({ title: 'Erreur eReq', description: 'Aucun code SAP fournisseur trouvé pour cette pièce.', variant: 'destructive' });
      return;
    }

    setEreqLoading(true);
    try {
      const needByDateISO = new Date(ereqForm.needByDate).toISOString().split('.')[0];

      // Convertir PDF en base64 pour SAP si fourni
      let pdfBase64 = '';
      let pdfFileName = '';
      if (ereqForm.pdfFile) {
        pdfBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(ereqForm.pdfFile);
        });
        pdfFileName = ereqForm.pdfFile.name;
      }

      const payload = {
        PRNum: '', ApproverFullName: '', ApprovalText: '', HeaderNotes: '', TestRun: false,
        PRItem: [{
          PRNum: '', PRItemNum: '00001', PONum: '', POItemNum: '',
          ItemCategory: '0',
          Vendor: vendorCode,
          PRItemDesc: `${order.NumPièce || order.VendorMaterialNum || ''} ${order.NomPièce || ''}`.trim(),
          Material: '', Plant: '2605', Currency: ['CAD', 'USD'].includes(order.devise) ? order.devise : 'CAD',
          Price: parseFloat(ereqForm.price).toFixed(2),
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
          PRAccount: [{
            PRNum: '', PRItemNum: '00001', AcctSerialNum: '',
            DistributionPercent: '0.00',
            GLAcct: ereqForm.glAcct,
            CostCentre: ereqForm.costCentre,
            WorkOrder: '', Network: '', ActivityNum: '', WBS: '', Qty: '0.00',
          }],
          PRMaterialData: [],
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
        PRAttachment: pdfBase64 ? [{
          PRNum: '', AttachmentNum: '',
          Filename: pdfFileName,
          MIMEType: 'application/pdf',
          Base64Content: pdfBase64,
        }] : [],
      };

      // Sauvegarder le session ID pour la prochaine fois
      if (ereqForm.sap_session_id) {
        localStorage.setItem('sap_session_id', ereqForm.sap_session_id);
      }

      const sapCookies = [
        `SAP_SESSIONID_FIP_500=${ereqForm.sap_session_id}`,
        `sap-usercontext=sap-language=FR&sap-client=500`,
        `oucqqssuyzvoywwworferoytzcoztebavdctezz_anchor=%23EREQ-display`,
        `oucqqssuyzvoymmworferoytzosywzebzqzezz_anchor=%23EREQ-display`,
      ].join('; ');

      const proxyResp = await fetch(`${API_URL}/ereq/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body_json: JSON.stringify(payload),
          sap_cookies: sapCookies,
        }),
      });

      if (!proxyResp.ok) throw new Error(`Erreur serveur: ${proxyResp.status}`);

      const result = await proxyResp.json();
      const prMatch = result.body?.match(/"PRNum":"(\d+)"/);
      const prNum = prMatch ? prMatch[1] : null;
      const approvalMatch = result.body?.match(/"ApprovalText":"([^"]+)"/);
      const approvalText = approvalMatch ? approvalMatch[1] : '';

      // ── Upload PDF vers la BD (toujours si PDF présent) ──────────────────
      // Utilise le # soumission si fourni, sinon le nom du fichier
      if (ereqForm.pdfFile) {
        try {
          const uploadRef = ereqForm.refSoumission || ereqForm.pdfFile.name;
          const formDataPdf = new FormData();
          formDataPdf.append('file', ereqForm.pdfFile);
          await fetch(`${API_URL}/uploads/soumission/${encodeURIComponent(uploadRef)}`, {
            method: 'POST',
            body: formDataPdf,
          });
        } catch (pdfErr) {
          console.warn('⚠️ Upload PDF BD (non bloquant):', pdfErr);
        }
      }

      // ── Post-traitement si succès SAP ─────────────────────────────────────
      if (prNum) {
        try {
          const userData = await fetch(`${API_URL}/current-user`).then(r => r.json());
          const userName = userData.user || userData.hostname || 'Système';

          // Historique
          await fetch(`${API_URL}/historique`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              Opération: 'Commande (eReq)',
              DateCMD: new Date().toISOString(),
              DateRecu: null,
              RéfPièce: order.RéfPièce,
              nompiece: order.NomPièce,
              numpiece: order.NumPièce,
              qtécommande: String(ereqForm.qty),
              QtéSortie: '0',
              description: `DA SAP: ${prNum}${ereqForm.refSoumission ? ` | Soumission: ${ereqForm.refSoumission}` : ''}`,
              User: userName,
              Delais: null,
            }),
          });

          // Mettre à jour la soumission si # fourni
          if (ereqForm.refSoumission) {
            await fetch(
              `${API_URL}/soumissions/${ereqForm.refSoumission}/statut-complet?statut=Commandée`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  note: `DA SAP #${prNum} créée le ${new Date().toLocaleDateString('fr-CA')}`,
                  date_rappel: null,
                }),
              }
            );
          }

          // Mettre à jour le statut de la pièce
          await fetch(`${API_URL}/pieces/${order.RéfPièce}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              Cmd_info: `DA SAP #${prNum} | ${new Date().toLocaleDateString('fr-CA')}`,
              Datecommande: new Date().toISOString().split('T')[0],
              Qtécommandée: parseInt(ereqForm.qty),
              Qtéarecevoir: parseInt(ereqForm.qty),
              Prix_unitaire: parseFloat(ereqForm.price),
            }),
          });

          if (onRefresh) onRefresh();
        } catch (postErr) {
          console.warn('⚠️ Post-traitement eReq (non bloquant):', postErr);
        }
      }

      onClose();
      setEreqResult({ prNum, approvalText, rawBody: result.body, status: result.status });
    } catch (err) {
      console.error('Erreur eReq:', err);
      toast({ title: 'Erreur eReq', description: err.message, variant: 'destructive' });
    } finally {
      setEreqLoading(false);
    }
  };

  return (
    <>
      {/* Dialog formulaire eReq */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <h2 className="text-lg font-bold mb-1">Créer une demande eReq (SAP)</h2>
          <p className="text-sm text-gray-500 mb-4">{order.NomPièce} — {order.NumPièce}</p>

          {/* Aperçu fournisseur */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 text-sm mb-4 space-y-1">
            <div><span className="text-gray-500">Fournisseur SAP:</span> <span className="font-mono font-semibold">{order.fournisseur_principal?.NumSap || <span className="text-red-500">⚠️ Manquant</span>}</span></div>
            <div><span className="text-gray-500">Fournisseur:</span> {order.fournisseur_principal?.NomFournisseur || '—'}</div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Quantité</label>
                <input type="number" min="1" value={ereqForm.qty}
                  onChange={e => setEreqForm(f => ({ ...f, qty: e.target.value }))}
                  className="w-full mt-1 border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="text-sm font-medium">Prix unitaire ({order.devise || 'CAD'})</label>
                <input type="number" min="0" step="0.01" value={ereqForm.price}
                  onChange={e => setEreqForm(f => ({ ...f, price: e.target.value }))}
                  className="w-full mt-1 border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" />
              </div>
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
            <div>
              <label className="text-sm font-medium"># Soumission (optionnel)</label>
              <input type="text" value={ereqForm.refSoumission} placeholder="ex: 1042"
                onChange={e => setEreqForm(f => ({ ...f, refSoumission: e.target.value }))}
                className="w-full mt-1 border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="text-sm font-medium">Pièce jointe soumission (PDF)</label>
              <input type="file" accept=".pdf"
                onChange={e => {
                  const file = e.target.files[0];
                  if (file) setEreqForm(f => ({ ...f, pdfFile: file, pdfName: file.name }));
                }}
                className="w-full mt-1 border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600" />
              {ereqForm.pdfName && (
                <p className="text-xs text-green-600 mt-1">📎 {ereqForm.pdfName}</p>
              )}
            </div>
          </div>

          <details className="mt-4">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
              🔑 Session SAP
            </summary>
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-1">
                F12 → Application → Cookies → <code>fip.remote.riotinto.com</code> → copier la valeur de <code>SAP_SESSIONID_FIP_500</code>
              </p>
              <input
                type="text"
                value={ereqForm.sap_session_id}
                onChange={e => setEreqForm(f => ({ ...f, sap_session_id: e.target.value }))}
                placeholder="HRqCCc0WX3gh..."
                className="w-full mt-1 border rounded px-3 py-2 text-xs font-mono dark:bg-gray-700 dark:border-gray-600"
              />
              {ereqForm.sap_session_id && (
                <p className="text-xs text-green-500 mt-1">✓ Session sauvegardée localement</p>
              )}
            </div>
          </details>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose} disabled={ereqLoading}>
              Annuler
            </Button>
            <Button
              onClick={handleEreqSubmit}
              disabled={ereqLoading || !order.fournisseur_principal?.NumSap}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {ereqLoading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi...</>
                : <><ShoppingCart className="h-4 w-4 mr-2" /> Envoyer à SAP</>}
            </Button>
          </div>
        </div>
      </div>

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
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-yellow-100 rounded-full p-2">
                  <Loader2 className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-yellow-700">Réponse SAP reçue</h2>
                  <p className="text-sm text-gray-500">HTTP {ereqResult.status} — aucun PR# trouvé</p>
                </div>
              </div>
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
    </>
  );
}
