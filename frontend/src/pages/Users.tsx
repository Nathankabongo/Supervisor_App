import { useState, useEffect, FormEvent } from 'react';
import { Search, Plus, Shield, Edit2, Trash2, UserCheck, UserX, X } from 'lucide-react';
import apiService from '../services/api';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin: string;
}

const roles = ['Superviseur', 'Opérateur', 'Technicien', 'Ingénieur', 'Administrateur'];

const emptyForm = {
  name: '',
  username: '',
  password: '',
  role: 'Superviseur',
};

function mapUser(u: any): UserItem {
  return {
    id: u.id.toString(),
    name: u.name,
    email: u.username,
    role: u.role,
    status: 'active',
    lastLogin: u.created_at
      ? new Date(u.created_at).toLocaleDateString('fr-FR')
      : '—',
  };
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = () => {
    apiService
      .getUsers()
      .then((res) => {
        if (res.users) setUsers(res.users.map(mapUser));
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (user: UserItem) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      username: user.email,
      password: '',
      role: roles.includes(user.role) ? user.role : 'Superviseur',
    });
    setError('');
    setModalOpen(true);
  };

  const handleDelete = async (user: UserItem) => {
    if (!window.confirm(`Supprimer l'utilisateur « ${user.name} » ?`)) return;
    try {
      await apiService.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: any) {
      window.alert(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        const payload: { name: string; username: string; role: string; password?: string } = {
          name: form.name.trim(),
          username: form.username.trim(),
          role: form.role,
        };
        if (form.password.trim()) payload.password = form.password;
        const res = await apiService.updateUser(editingId, payload);
        if (res.user) {
          setUsers((prev) => prev.map((u) => (u.id === editingId ? mapUser(res.user) : u)));
        }
      } else {
        if (!form.password || form.password.length < 6) {
          setError('Mot de passe min 6 caractères');
          setSaving(false);
          return;
        }
        const res = await apiService.createUser({
          name: form.name.trim(),
          username: form.username.trim(),
          password: form.password,
          role: form.role,
        });
        if (res.user) setUsers((prev) => [...prev, mapUser(res.user)]);
      }
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-10 w-auto" />
          <div>
            <h1 className="text-xl font-bold text-white">Gestion des Utilisateurs</h1>
            <p className="text-sm text-gray-400">{users.length} utilisateurs enregistrés</p>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-medium transition-colors"
          onClick={openCreate}
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#1e293b] border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-[#1e293b] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
        >
          <option value="all">Tous rôles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded flex items-center justify-center">
            <UserCheck size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-white text-lg font-bold">
              {users.filter((u) => u.status === 'active').length}
            </p>
            <p className="text-gray-400 text-xs">Actifs</p>
          </div>
        </div>
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500/20 rounded flex items-center justify-center">
            <UserX size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-white text-lg font-bold">
              {users.filter((u) => u.status === 'inactive').length}
            </p>
            <p className="text-gray-400 text-xs">Inactifs</p>
          </div>
        </div>
        <div className="bg-[#1e293b] rounded border border-gray-700 p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded flex items-center justify-center">
            <Shield size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white text-lg font-bold">{roles.length}</p>
            <p className="text-gray-400 text-xs">Rôles définis</p>
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Utilisateur</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Identifiant</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Rôle</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Statut</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Créé le
              </th>
              <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-gray-700/50 hover:bg-[#334155] transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 ${user.status === 'active' ? 'bg-green-500' : 'bg-gray-500'} rounded-full flex items-center justify-center text-white text-xs font-bold`}
                    >
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <span className="text-white text-sm">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-300 text-sm">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`flex items-center gap-1 text-xs ${user.status === 'active' ? 'text-green-400' : 'text-gray-400'}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-400' : 'bg-gray-500'}`}
                    />
                    {user.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">{user.lastLogin}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
                      onClick={() => openEdit(user)}
                      title="Modifier"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                      onClick={() => handleDelete(user)}
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-[#1e293b] border border-gray-700 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h2 className="text-white font-bold text-sm">
                {editingId ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nom complet</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Identifiant</label>
                <input
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Mot de passe{editingId ? ' (laisser vide pour ne pas changer)' : ''}
                </label>
                <input
                  type="password"
                  required={!editingId}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rôle</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-green-500"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm rounded font-medium"
                >
                  {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
