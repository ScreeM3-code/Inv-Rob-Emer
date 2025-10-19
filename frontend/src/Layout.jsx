import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Outlet } from 'react-router-dom';
import { Plus, Package, Loader2, Edit3, Trash2, AlertTriangle, TrendingUp, Search, Users, Building2, DollarSign, FileText, Phone, MapPin, Cog, Store } from "lucide-react";


export default function Layout() {
    const location = useLocation();

    return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-4">
              <Package className="h-8 w-8 text-rio-red" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inventaire Robots</h1>
                <p className="text-sm text-gray-600">Maintenance</p>
              </div>
            </div>

            <nav className="flex space-x-6">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'bg-rio-red text-white'
                    : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                }`}
              >
                <Package className="h-4 w-4 inline mr-2" />
                Inventaire
              </Link>
              <Link
                to="/fournisseurs"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/fournisseurs'
                    ? 'bg-rio-red text-white'
                    : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                }`}
              >
                <Store className="h-4 w-4 inline mr-2" />
                Fournisseurs
              </Link>
              <Link
                to="/fabricant"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/fabricant'
                    ? 'bg-rio-red text-white'
                    : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                }`}
              >
                <Cog className="h-4 w-4 inline mr-2" />
                Fabricant
              </Link>
              <Link
                to="/commandes"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/commandes'
                    ? 'bg-rio-red text-white'
                    : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                }`}
              >
                <Package className="h-4 w-4 inline mr-2" />
                Commander
              </Link>
              <Link
                to="/receptions"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/receptions'
                    ? 'bg-rio-red text-white'
                    : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                }`}
              >
                <Package className="h-4 w-4 inline mr-2" />
                Réceptions
              </Link>
              <Link
                to="/historique"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/historique'
                    ? 'bg-rio-red text-white'
                    : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Historique
              </Link>
            </nav>
          </div>
            <main className="flex-1 flex flex-col overflow-hidden w-full">
                <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 md:hidden">
                    <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-slate-900">PiècesPro</h1>
                    </div>
                </header>

                <div className="flex-1 overflow-auto">
                    <Outlet />
                </div>
                </main>
        </div>
      </div>
    </header>
  );
};