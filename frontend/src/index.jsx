// frontend/src/index.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // ← Ajouter
import "./index.css";
import AppRouter from "./Router";
import { CartProvider } from "@/components/cart/CartContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

// ← Ajouter cette ligne
const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider> {/* AJOUTE */}
          <CartProvider>
            <AppRouter />
          </CartProvider>
        </ThemeProvider> {/* AJOUTE */}
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);