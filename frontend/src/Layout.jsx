import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Package, Store, Cog, FileText, Layers } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Menu, X } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);


  return (
    <div className="min-h-screen flex flex-col">
      <AnimatedBackground /> 
      {/* Header avec navigation */}
      <header className="bg-white dark:bg-slate-900/80 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Logo et titre */}
            <div className="flex items-center space-x-4">
              <Package className="h-8 w-8 text-rio-red" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventaire Robots</h1>
                <p className="text-sm text-gray-600 dark:text-white hidden sm:block">Maintenance</p>
              </div>
            </div>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex space-x-6">
              <Link to="/inventaire" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/inventaire' ? 'bg-rio-red text-white' : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'}`}>
                <Package className="h-4 w-4 inline mr-2" />Inventaire
              </Link>
              <Link to="/groupes" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/groupes' ? 'bg-rio-red text-white' : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'}`}>
                <Layers className="h-4 w-4 inline mr-2" />Groupes
              </Link>
              <Link to="/fournisseurs" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/fournisseurs' ? 'bg-rio-red text-white' : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'}`}>
                <Store className="h-4 w-4 inline mr-2" />Fournisseurs
              </Link>
              <Link to="/fabricant" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/fabricant' ? 'bg-rio-red text-white' : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'}`}>
                <Cog className="h-4 w-4 inline mr-2" />Fabricant
              </Link>
              <Link to="/commandes" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/commandes' ? 'bg-rio-red text-white' : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'}`}>
                <Package className="h-4 w-4 inline mr-2" />Commander
              </Link>
              <Link to="/receptions" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/receptions' ? 'bg-rio-red text-white' : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'}`}>
                <Package className="h-4 w-4 inline mr-2" />Réceptions
              </Link>
              <Link to="/historique" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/historique' ? 'bg-rio-red text-white' : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'}`}>
                <FileText className="h-4 w-4 inline mr-2" />Historique
              </Link>
            </nav>

            {/* Bouton hamburger mobile + ThemeToggle */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Menu mobile */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <Link to="/inventaire" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/inventaire' ? 'bg-rio-red text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Package className="h-4 w-4 inline mr-2" />Inventaire
              </Link>
              <Link to="/groupes" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/groupes' ? 'bg-rio-red text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Layers className="h-4 w-4 inline mr-2" />Groupes
              </Link>
              <Link to="/fournisseurs" onClick={() => setMobileMenuOpen(false)} className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/fournisseurs' ? 'bg-rio-red text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Store className="h-4 w-4 inline mr-2" />Fournisseurs
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Contenu des pages */}
      <main className="flex-1">
        <Outlet /> {/* ← C'est ici que les pages s'affichent */}
      </main>
    </div>
  );
}