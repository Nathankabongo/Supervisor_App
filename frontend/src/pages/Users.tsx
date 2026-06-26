import { useState, useEffect } from 'react';
import { Search, Plus, Shield, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin: string;
}

import apiService from '../services/api';

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [users, setUsers] = useState<UserItem[]>([]);

  useEffect(() => {
    apiService.getUsers().then((res) => {
      if (res.users) {
        setUsers(res.users.map((u: any) => ({
          id: u.id.toString(),
          name: u.name,
          email: u.username,
          role: u.role,
          status: 'active',
          lastLogin: new Date(u.created_at).toLocaleDateString('fr-FR'),
        })));
      }
    }).catch(console.error);
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roles = ['Superviseur', 'Opérateur', 'Technicien', 'Ingénieur', 'Administrateur'];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={`/Logo-with-text.png`} alt="SupervisorApp" className="h-10 w-auto" />
          <div>
            <h1 className="text-xl font-bold text-white">Gestion des Utilisateurs</h1>
            <p className="text-sm text-gray-400">{users.length} utilisateurs enregistrés</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-medium transition-colors" onClick={() => alert('Fonctionnalité en cours de développement')}>
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* Filters */}
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

      {/* Stats */}
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

      {/* Users Table */}
      <div className="bg-[#1e293b] rounded border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Utilisateur</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Rôle</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Statut</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">
                Dernière connexion
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
                    <button className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors" onClick={() => alert('Fonctionnalité en cours de développement')}>
                      <Edit2 size={14} />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-red-400 transition-colors" onClick={() => alert('Fonctionnalité en cours de développement')}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
