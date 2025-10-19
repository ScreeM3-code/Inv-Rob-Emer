import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import Inventaire from "./App";
import Fournisseurs from "./Fournisseur";
import Fabricant from "./Fabricant";
import Commandes from "./Commandes";
import Receptions from "./Receptions";
import Historique from "./Historique";





export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/inventaire" replace />} />
        <Route path="inventaire" element={<Inventaire />} />
        <Route path="fournisseurs" element={<Fournisseurs />} />
        <Route path="fabricant" element={<Fabricant />} />
        <Route path="commandes" element={<Commandes />} />
        <Route path="receptions" element={<Receptions />} />
        <Route path="historique" element={<Historique />} />
      </Route>
    </Routes>
  );
}