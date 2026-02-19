import React, { useEffect, useState } from 'react';
import { usePermissions } from './hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  CheckCircle, XCircle, Clock, Package,
  Loader2, ChevronDown, ChevronUp, RotateCcw
} from 'lucide-react';

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

// ── Badge statut — NULL et en_attente = même badge jaune ─────
function StatutBadge({ statut }) {
  if (!statut || statut === 'en_attente')
    return (
      <Badge className="bg-yellow-500 text-white flex items-center gap-1">
        <Clock className="w-3 h-3" />En attente
      </Badge>
    );
  if (statut === 'approuvee')
    return (
      <Badge className="bg-green-500 text-white flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />Approuvée
      </Badge>
    );
  if (statut === 'refusee')
    return (
      <Badge className="bg-red-500 text-white flex items-center gap-1">
        <XCircle className="w-3 h-3" />Refusée
      </Badge>
    );
  return <Badge variant="outline">—</Badge>;
}

// ── Carte d'une pièce ─────────────────────────────────────────
function PieceCard({ piece, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const [note,     setNote]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [imgError, setImgError] = useState(false);

  const isRefusee = piece.approbation_statut === 'refusee';

  async function action(type) {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/toorders/${piece.RéfPièce}/${type === 'approuver' ? 'approuver' : 'refuser'}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: note || null })
        }
      );
      if (!res.ok) throw new Error('Erreur serveur');
      toast({
        title: type === 'approuver' ? '✅ Approuvée' : '❌ Refusée',
        description: piece.NomPièce
      });
      setNote('');
      onAction();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function reset() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/toorders/${piece.RéfPièce}/reset-approbation`, {
        method: 'POST', credentials: 'include'
      });
      if (!res.ok) throw new Error('Erreur serveur');
      toast({ title: 'Réinitialisé', description: piece.NomPièce });
      onAction();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={`glass-card border-l-4 ${
      isRefusee ? 'border-l-red-400' : 'border-l-yellow-400'
    } border-0`}>
      <CardContent className="pt-4">
        <div className="flex gap-4">

          {/* Photo de la pièce */}
          {!imgError ? (
            <img
              src={`${API}/pieces/${piece.RéfPièce}/image`}
              alt={piece.NomPièce}
              onError={() => setImgError(true)}
              className="w-20 h-20 rounded-lg object-cover shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg shrink-0 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
              <Package className="h-6 w-6 text-gray-300" />
            </div>
          )}

          {/* Contenu principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 dark:text-white">{piece.NomPièce}</span>
                  <StatutBadge statut={piece.approbation_statut} />
                </div>
                {piece.NumPièce && (
                  <p className="text-xs text-gray-500 mt-0.5">#{piece.NumPièce}</p>
                )}
                {(piece.fournisseur_principal_nom || piece.autre_fournisseur_nom) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {piece.fournisseur_principal_nom || piece.autre_fournisseur_nom}
                  </p>
                )}
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  <span>Inventaire : <strong>{piece.QtéenInventaire}</strong></span>
                  <span>Minimum : <strong>{piece.Qtéminimum}</strong></span>
                  {piece.prix_unitaire > 0 && (
                    <span>Prix : <strong>{piece.prix_unitaire.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}</strong></span>
                  )}
                </div>

                {/* Note de refus */}
                {isRefusee && piece.approbation_note && (
                  <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-700 dark:text-red-400">
                      <strong>Raison :</strong> {piece.approbation_note}
                    </p>
                    {piece.approbation_par && (
                      <p className="text-xs text-red-400 mt-0.5">par {piece.approbation_par}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Bouton expand */}
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-gray-400 hover:text-gray-600 p-1 shrink-0 mt-0.5"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Zone d'action expandable */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Commentaire (optionnel)</label>
              <Textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ex: Prix trop élevé, chercher alternative..."
                className="mt-1 text-sm resize-none"
                rows={2}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => action('approuver')}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                Approuver
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => action('refuser')}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                Refuser
              </Button>
              {isRefusee && (
                <Button size="sm" variant="outline" onClick={reset} disabled={loading}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page principale ───────────────────────────────────────────
export default function ApprobationPage() {
  const { isAdmin }     = usePermissions();
  const navigate        = useNavigate();
  const [pieces,   setPieces]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filtre,   setFiltre]   = useState('en_attente');

  useEffect(() => {
    if (!isAdmin) navigate('/inventaire');
  }, [isAdmin]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/toorders/en-attente`, { credentials: 'include' });
      if (!res.ok) throw new Error('Accès refusé');
      const data = await res.json();
      setPieces(data);
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // NULL et en_attente = même filtre "en_attente"
  const filtered = pieces.filter(p => {
    if (filtre === 'tous')       return true;
    if (filtre === 'en_attente') return !p.approbation_statut || p.approbation_statut === 'en_attente';
    return p.approbation_statut === filtre;
  });

  const countEnAttente = pieces.filter(p => !p.approbation_statut || p.approbation_statut === 'en_attente').length;
  const countRefusee   = pieces.filter(p => p.approbation_statut === 'refusee').length;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <AnimatedBackground />
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">

        {/* En-tête */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <CheckCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approbation des commandes</h1>
              <p className="text-sm text-gray-500">
                {countEnAttente} en attente · {countRefusee} refusée(s)
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RotateCcw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex gap-2">
          {[
            { key: 'en_attente', label: `En attente (${countEnAttente})` },
            { key: 'refusee',    label: `Refusées (${countRefusee})` },
            { key: 'tous',       label: 'Toutes' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltre(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filtre === key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="glass-card border-0">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Package className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">
                {filtre === 'en_attente' ? "Aucune pièce en attente d'approbation" :
                 filtre === 'refusee'    ? 'Aucune pièce refusée' :
                 'Aucune pièce trouvée'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(piece => (
              <PieceCard key={piece.RéfPièce} piece={piece} onAction={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}