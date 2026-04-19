import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useSettings } from "./contexts/SettingsContext";
import Layout from "./Layout";
import Dashboard from "./App";
import Fournisseurs from "./Fournisseur";
import Fabricant from "./Fabricant";
import Commandes from "./Commandes";
import Receptions from "./Receptions";
import Historique from "./Historique";
import Groupes from "./Groupes"; 
import SoumissionsHistorique from "./SoumissionsHistorique";
import Login from "./Login";
import UsersPage from "./Users";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import Approbation from "./Approbation";
import Profile from "./Profile";
import Debug from "./Debug";
import Departements from "./Departements";
import Parametres from "./Parametres";

export default function AppRouter() {
  const auth = useAuth();
  const { settings } = useSettings();

  return (
    <Routes>
      {/* Pages publiques (pas besoin d'être connecté) */}
      <Route
        path="/login"
        element={!auth.user ? <Login /> : <Navigate to="/inventaire" replace />}
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Pages protégées */}
      <Route
        path="/"
        element={auth.user ? <Layout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to="/inventaire" replace />} />
        <Route path="inventaire" element={<Dashboard />} />
        <Route path="fournisseurs" element={<Fournisseurs />} />
        <Route path="fabricant" element={<Fabricant />} />
        {settings.features?.approbation && <Route path="approbation" element={<Approbation />} />}
        {settings.features?.bon_de_commande && <Route path="commandes" element={<Commandes />} />}
        {settings.features?.bon_de_commande && <Route path="receptions" element={<Receptions />} />}
        <Route path="historique" element={<Historique />} />
        {settings.features?.groupes && <Route path="groupes" element={<Groupes />} />}
        <Route path="departements" element={<Departements />} />
        <Route path="soumissions-historique" element={<SoumissionsHistorique />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="parametres" element={<Parametres/>} />
        <Route path="debug" element={<Debug />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
