// frontend/src/index.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // ← Ajouter
import "./index.css";
import AppRouter from "./Router";
import { CartProvider } from "@/components/cart/CartContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from './contexts/AuthContext';

// ← Ajouter cette ligne
const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <AppRouter />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);