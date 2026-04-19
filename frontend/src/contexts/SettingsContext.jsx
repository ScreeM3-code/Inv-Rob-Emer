import React, { createContext, useContext, useEffect, useState } from 'react';

const SettingsContext = createContext(null);
const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    site_name: 'Inventaire Robots',
    piece_label: 'Pièces',
    bc_prefix: 'BC',
    bc_format: '{PREFIX}-{YEAR}-{SEQUENCE:04d}',
    bc_next_sequence: 1,
    email_host: '',
    email_port: 587,
    email_from: 'noreply@tonentreprise.com',
    email_user: '',
    email_password: '',
    email_tls: true,
    email_ssl: false,
    features: {
      bon_de_commande: true,
      ereq_sap: true,
      approbation: true,
      code_barre: true,
      groupes: true,
      export_excel: true,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/parametres`, { 
        credentials: 'include',
        cache: 'no-cache'
      });
      if (!res.ok) throw new Error('Erreur chargement paramètres');
      const data = await res.json();
      setSettings(data);
      setError(null);
    } catch (err) {
      console.error('[SettingsContext] ', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refresh: fetchSettings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
