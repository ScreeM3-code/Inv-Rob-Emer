import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { Package, Store, Cog, FileText, Layers, User, Shield, LogOut, LogIn, Menu, X, ShoppingCart, Inbox, History, CheckCircle, Bell, Building2 } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from './contexts/AuthContext';
import { usePermissions } from './hooks/usePermissions';
import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  
  const auth = useAuth();
  const { can, isAdmin } = usePermissions();

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  // Chaque item a une permission requise (null = toujours visible si connecté)
  const allNavItems = [
    { path: '/inventaire',            label: 'Inventaire',  icon: Package,      permission: 'inventaire_view' },
    { path: '/groupes',               label: 'Groupes',     icon: Layers,       permission: 'groupes_view' },
    { path: '/fournisseurs',          label: 'Fournisseurs',icon: Store,        permission: 'fournisseur_view' },
    { path: '/fabricant',             label: 'Fabricant',   icon: Cog,          permission: 'fabricant_view' },
    { path: '/commandes',             label: 'Commander',   icon: ShoppingCart, permission: 'commandes_view' },
    { path: '/approbation',           label: 'Approbations', icon: CheckCircle, permission: 'can_approve_orders'},
    { path: '/departements',          label: 'Départements', icon: Building2, permission: 'departements_view' },
    { path: '/receptions',            label: 'Réceptions',  icon: Inbox,        permission: 'receptions_view' },
    { path: '/historique',            label: 'Historique',  icon: History,      permission: 'historique_view' },
    { path: '/soumissions-historique',label: 'Soumissions', icon: FileText,     permission: 'soumissions_view' },

    
  ];

  // Filtrer selon les permissions de l'utilisateur connecté
  const mainNavItems = allNavItems.filter(item =>
    !item.permission || can(item.permission)
  );

  const isActive = (path) => location.pathname === path;

  // Badge de notification dans le nav pour les approbations en attente (uniquement pour les admins)
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/toorders/en-attente`, {
      credentials: 'include'
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const count = Array.isArray(data)
          ? data.filter(p => p.approbation_statut === 'en_attente' || p.approbation_statut === null ).length
          : 0;
        setPendingCount(count);
      })
      .catch(() => {});
  }, [isAdmin]);
  
  // Label du rôle affiché
  const roleLabel = {
    admin:    'Administrateur',
    acheteur: 'Acheteur',
    user:     'Utilisateur',
  }[auth.user?.role] || auth.user?.role || '';

  return (
    <div className="min-h-screen flex flex-col">
      <AnimatedBackground />

      <header className="bg-white dark:bg-slate-900/80 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors relative z-50">
        <div className="max-w-7xl mx-auto px-1 ">
          <div className="flex justify-between items-center py-4 md:py-6">

            {/* Logo */}
            <Link to="/inventaire" className="flex items-center space-x-3 md:space-x-4 group">
              <div className="p-2 rounded-lg bg-gradient-to-br from-rio-red to-red-600 group-hover:scale-110 transition-transform duration-300">
                <Package className="h-6 w-6 md:h-8 md:w-8 text-gray-900 dark:text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Inventaire Robots</h1>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 hidden sm:block">Système de maintenance</p>
              </div>
            </Link>

            {/* Navigation Desktop */}
            <nav className="hidden lg:flex items-center space-x-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      isActive(item.path)
                        ? 'bg-gradient-to-r from-rio-red to-red-600 text-white shadow-lg dar'
                        : 'text-gray-600 dark:text-gray-300 hover:text-rio-red hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden xl:inline">{item.label}</span>

                      {item.path === '/approbation' && pendingCount > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-xs font-bold">
                          {pendingCount}
                        </span>
                      )}


                  </Link>
                );
              })}
            </nav>

            {/* Actions droite */}
            <div className="flex items-center gap-2 md:gap-3">
              <ThemeToggle />

              {auth && auth.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="hidden md:flex items-center gap-2 h-10 px-3">
                      <div className={`p-1.5 rounded-full ${isAdmin ? 'bg-rio-red/10' : 'bg-blue-500/10'}`}>
                        {isAdmin
                          ? <Shield className="h-4 w-4 text-rio-red" />
                          : <User className="h-4 w-4 text-blue-600" />
                        }
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium leading-none">{auth.user.username}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{auth.user.group || roleLabel}</p>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{auth.user.username}</span>
                        <span className="text-xs text-gray-500">{auth.user.group || roleLabel}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Mon profil & notifications
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuItem onClick={() => navigate('/users')} className="cursor-pointer">
                          <Shield className="mr-2 h-4 w-4" />
                          <span>Gestion des utilisateurs</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Se déconnecter</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" onClick={() => navigate('/login')} className="hidden md:flex items-center gap-2 h-10">
                  <LogIn className="h-4 w-4" />
                  <span>Connexion</span>
                </Button>
              )}

              {/* Hamburger mobile */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Menu mobile */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 space-y-1 border-t border-gray-200 dark:border-gray-700 pt-4">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all ${
                      isActive(item.path)
                        ? 'bg-gradient-to-r from-rio-red to-red-600 text-white shadow-lg'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                      {item.path === '/approbation' && pendingCount > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-xs font-bold">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}

              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                {auth && auth.user ? (
                  <>
                    <div className="px-4 py-2 mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isAdmin ? 'bg-rio-red/10' : 'bg-blue-500/10'}`}>
                          {isAdmin
                            ? <Shield className="h-5 w-5 text-rio-red" />
                            : <User className="h-5 w-5 text-blue-600" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{auth.user.username}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{auth.user.group || roleLabel}</p>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <Link
                        to="/users"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Shield className="h-5 w-5" />
                        Gestion des utilisateurs
                      </Link>
                    )}

                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Bell className="h-5 w-5" />
                      Mon profil & notifications
                    </Link>

                    <button
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="h-5 w-5" />
                      Se déconnecter
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <LogIn className="h-5 w-5" />
                    Connexion
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 relative">
        <Outlet />
      </main>
    </div>
  );
}