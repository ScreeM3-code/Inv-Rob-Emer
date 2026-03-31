// frontend/src/hooks/usePermissions.js
/**
 * Hook centralisé pour la gestion des permissions.
 *
 * Utilisation :
 *   const { can, isAdmin, isAcheteur } = usePermissions();
 *   if (can('commandes_view')) { ... }
 *   if (can('can_delete_any')) { ... }
 */
import { useAuth } from '../contexts/AuthContext';

export function usePermissions() {
  const auth = useAuth();
  const permissions = auth.user?.permissions || {};
  const role = auth.user?.role || '';
  const group = auth.user?.group || '';

  /**
   * Vérifie si l'utilisateur a une permission donnée.
   * Les admins ont toujours accès à tout SAUF debug_access qui doit être explicitement activé.
   */
  function can(permission) {
    if (role === 'admin' && permission !== 'debug_access') return true;
    else if (role === 'superadmin') return true; // superadmin a accès à tout, y compris debug_access
    return permissions[permission] === true;
  }

  /**
   * Vérifie que l'utilisateur a TOUTES les permissions listées.
   */
  function canAll(...perms) {
    return perms.every(p => can(p));
  }

  /**
   * Vérifie que l'utilisateur a AU MOINS UNE des permissions listées.
   */
  function canAny(...perms) {
    return perms.some(p => can(p));
  }

  return {
    can,
    canAll,
    canAny,
    isAdmin:    role === 'admin',
    isAcheteur: role === 'acheteur' || role === 'admin',
    isSuperAdmin: role === 'superadmin',
    isUser:     !!role, // connecté = au moins user
    permissions,
    role,
  };
}
