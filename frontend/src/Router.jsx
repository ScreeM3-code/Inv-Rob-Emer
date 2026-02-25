import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
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
import Departements from "./Departements";

export default function AppRouter() {
  const auth = useAuth();

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
        <Route path="approbation" element={<Approbation />} />
        <Route path="approbation" element={<Approbation />} />
        <Route path="commandes" element={<Commandes />} />
        <Route path="receptions" element={<Receptions />} />
        <Route path="historique" element={<Historique />} />
        <Route path="groupes" element={<Groupes />} />
        <Route path="departements" element={<Departements />} />
        <Route path="soumissions-historique" element={<SoumissionsHistorique />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
