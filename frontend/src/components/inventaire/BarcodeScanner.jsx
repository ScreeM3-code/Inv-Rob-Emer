// ============================================================
// NOUVEAU FICHIER: frontend/src/components/inventaire/BarcodeScanner.jsx
// ============================================================

import { useState, useRef, useEffect } from "react";
import { Barcode, Loader2, CheckCircle, XCircle, Keyboard } from "lucide-react";

/**
 * BarcodeScanner - Composant de scan de code barre
 * 
 * Fonctionne avec:
 * - Scanner Bluetooth/USB (simule frappe clavier → Enter)
 * - Saisie manuelle du code
 * 
 * @param {function} onResult(data) - Appelé quand lookup réussi
 * @param {function} onNotFound(code) - Appelé quand rien trouvé (formulaire vide)
 */
export default function BarcodeScanner({ onResult, onNotFound }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | found | notfound | error
  const [foundData, setFoundData] = useState(null);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [qty, setQty] = useState(1);
  const inputRef = useRef(null);

  // Focus automatique sur le champ au montage
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = async (scannedCode) => {
    const trimmed = scannedCode.trim();
    if (!trimmed) return;

    setStatus("loading");
    setFoundData(null);

    try {
      const resp = await fetch(`/api/pieces/barcode/${encodeURIComponent(trimmed)}`);

      if (resp.status === 404) {
        // Rien trouvé → formulaire vide
        setStatus("notfound");
        setTimeout(() => {
          onNotFound?.(trimmed);
          setStatus("idle");
          setCode("");
        }, 1500);
        return;
      }

      if (!resp.ok) {
        setStatus("error");
        return;
      }

      const data = await resp.json();
      setFoundData(data);
      setStatus("found");

      // Demander la quantité avant de pré-remplir
      setShowQtyModal(true);

    } catch (e) {
      console.error("Erreur lookup barcode:", e);
      setStatus("error");
    }
  };

  const handleKeyDown = (e) => {
    // Le scanner envoie Enter après le code
    if (e.key === "Enter" && code.trim()) {
      handleScan(code);
    }
  };

  const handleConfirmQty = () => {
    if (!foundData) return;
    setShowQtyModal(false);
    onResult?.({ ...foundData, QtéenInventaire: qty });
    setStatus("idle");
    setCode("");
    setQty(1);
  };

  const handleSkipQty = () => {
    if (!foundData) return;
    setShowQtyModal(false);
    onResult?.({ ...foundData, QtéenInventaire: 1 });
    setStatus("idle");
    setCode("");
    setQty(1);
  };

  return (
    <div className="mb-4">
      {/* Zone de scan */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700">
        <Barcode className="w-5 h-5 text-blue-500 flex-shrink-0" />

        <input
          ref={inputRef}
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scanner ou taper un code barre..."
          className="flex-1 bg-transparent outline-none text-sm text-blue-800 dark:text-blue-200 placeholder-blue-400"
          disabled={status === "loading"}
        />

        {/* Bouton scan manuel */}
        <button
          type="button"
          onClick={() => code.trim() && handleScan(code)}
          disabled={!code.trim() || status === "loading"}
          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-40 transition"
        >
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Rechercher"
          )}
        </button>
      </div>

      {/* Hint */}
      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
        <Keyboard className="w-3 h-3" />
        Scanner Bluetooth/USB ou taper le code + Entrée
      </p>

      {/* Statut */}
      {status === "found" && foundData && !showQtyModal && (
        <div className="mt-2 flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>Trouvé: <strong>{foundData.NomPièce}</strong></span>
        </div>
      )}

      {status === "notfound" && (
        <div className="mt-2 flex items-center gap-2 text-orange-500 text-sm">
          <XCircle className="w-4 h-4" />
          <span>Code inconnu — formulaire vide à remplir</span>
        </div>
      )}

      {status === "error" && (
        <div className="mt-2 flex items-center gap-2 text-red-500 text-sm">
          <XCircle className="w-4 h-4" />
          <span>Erreur de connexion</span>
        </div>
      )}

      {/* Modal quantité */}
      {showQtyModal && foundData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-80">
            
            {/* Image si disponible */}
            {foundData.image_url && (
              <img
                src={foundData.image_url}
                alt={foundData.NomPièce}
                className="w-full h-32 object-contain rounded mb-3 bg-slate-100"
                onError={(e) => e.target.style.display = "none"}
              />
            )}

            <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
              {foundData.NomPièce}
            </h3>
            {foundData.NomFabricant && (
              <p className="text-sm text-slate-500 mb-3">{foundData.NomFabricant}</p>
            )}

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Quantité en inventaire
            </label>
            <input
              type="number"
              min="0"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 0)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirmQty()}
              autoFocus
              className="w-full border rounded-lg px-3 py-2 text-center text-lg font-bold
                         border-slate-300 dark:border-slate-600 
                         bg-white dark:bg-slate-700 
                         text-slate-800 dark:text-white
                         focus:ring-2 focus:ring-blue-500 outline-none mb-4"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSkipQty}
                className="flex-1 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Passer (qty: 1)
              </button>
              <button
                type="button"
                onClick={handleConfirmQty}
                className="flex-1 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
