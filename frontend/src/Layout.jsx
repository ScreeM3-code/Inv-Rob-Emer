import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Package, Store, Cog, FileText, Layers } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Layout() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
      // Récupérer l'utilisateur au chargement
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/current-user`)
        .then(res => res.json())
        .then(data => {
          if (!data.authorized) {
            alert(`❌ Accès refusé pour l'utilisateur "${data.user}". Contactez l'admin.`);
          }
          setCurrentUser(data);
        })
        .catch(err => console.error('Erreur auth:', err));
    }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <AnimatedBackground /> 
      {/* Header avec navigation */}
      <header className="bg-white dark:bg-slate-900/80 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <div className="flex items-center space-x-4">
                <Package className="h-8 w-8 text-rio-red" />
                  {/* AJOUTE ICI : Info utilisateur */}
                  {currentUser && currentUser.authorized && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{currentUser.nom_complet}</span>
                      {currentUser.role === 'admin' && (
                        <Badge className="bg-red-500 text-white text-xs">Admin</Badge>
                      )}
                    </div>
                  )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventaire Robots</h1>
                  <p className="text-sm text-gray-600 dark:text-white">Maintenance</p>
                </div>
              </div>
              <ThemeToggle />

              {/* Navigation */}
              <nav className="flex space-x-6">
                <Link
                  to="/inventaire"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/inventaire'
                      ? 'bg-rio-red text-white'
                      : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                  }`}
                >
                  <Package className="h-4 w-4 inline mr-2" />
                  Inventaire
                </Link>
                <Link
                  to="/groupes"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/groupes'
                      ? 'bg-rio-red text-white'
                      : 'text-gray-600 hover:text-rio-red hover:bg-gray-50'
                  }`}
                >
                  <Layers className="h-4 w-4 inline mr-2" /> {/* N'oublie pas d'importer Layers */}
                  Groupes
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
          </div>
        </div>
      </header>

      {/* Contenu des pages */}
      <main className="flex-1">
        <Outlet /> {/* ← C'est ici que les pages s'affichent */}
      </main>
    </div>
  );
}