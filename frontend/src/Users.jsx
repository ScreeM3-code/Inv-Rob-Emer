import React, { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';

export default function UsersPage() {
  const auth = useAuth();
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/users', { credentials: 'include' });
      if (!res.ok) throw new Error('Accès refusé');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createUser(e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (!res.ok) throw new Error('Impossible de créer');
      await load();
      setNewUser({ username: '', password: '', role: 'user' });
    } catch (e) {
      setError(e.message);
    }
  }

  if (auth.loading) return <div>Chargement...</div>;
  if (!auth.user) return <div>Non autorisé. Veuillez vous connecter.</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Gestion des utilisateurs</h2>
      {loading ? <div>Chargement...</div> : (
        <table className="w-full table-auto">
          <thead><tr><th>Username</th><th>Role</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.username}><td>{u.username}</td><td>{u.role}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={createUser} className="mt-6 space-y-3">
        <h3 className="font-semibold">Créer un utilisateur</h3>
        <div>
          <input placeholder="username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
        </div>
        <div>
          <input placeholder="password" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
        </div>
        <div>
          <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div>
          <button className="btn btn-primary">Créer</button>
        </div>
        {error && <div className="text-red-600">{error}</div>}
      </form>
    </div>
  );
}
