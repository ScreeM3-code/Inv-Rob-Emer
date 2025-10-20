import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // ← AJOUTER
import "./index.css";
import AppRouter from "./Router"; // ← Changer ici

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter> {/* ← AJOUTER */}
      <AppRouter /> {/* ← Changer ici */}
    </BrowserRouter>
  </React.StrictMode>,
);